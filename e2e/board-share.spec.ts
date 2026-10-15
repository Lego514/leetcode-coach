import { expect, test, type Page, type WebSocketRoute } from '@playwright/test';

// 白板共用：房間的伺服器（dsa-whiteboard 的 Cloudflare Worker）換成測試裡的假房間，
// 兩個瀏覽器（各自的本機資料）連到同一個假房間

interface Peer {
  id: string;
  name: string;
  color: string;
}
interface El {
  id: string;
}
type Op = { k: 'put'; el: El } | { k: 'del'; id: string } | { k: 'steps'; steps: unknown[] };

/** 跟真的伺服器一樣：照收到的順序套用修改，再傳給所有人（包含送的人） */
function fakeRoom() {
  let doc: { elements: El[]; steps?: unknown[] } = { elements: [] };
  let stored = false;
  let n = 0;
  const sockets = new Map<WebSocketRoute, Peer>();
  const send = (ws: WebSocketRoute, message: unknown) => ws.send(JSON.stringify(message));
  const apply = (ops: Op[]) => {
    let elements = [...doc.elements];
    let steps = doc.steps;
    for (const op of ops) {
      if (op.k === 'put') {
        const i = elements.findIndex((el) => el.id === op.el.id);
        if (i >= 0) elements[i] = op.el;
        else elements.push(op.el);
      } else if (op.k === 'del') elements = elements.filter((el) => el.id !== op.id);
      else steps = op.steps.length > 0 ? op.steps : undefined;
    }
    doc = steps ? { elements, steps } : { elements };
  };
  return (ws: WebSocketRoute) => {
    n += 1;
    const me: Peer = { id: `p${n}`, name: new URL(ws.url()).searchParams.get('name') ?? '', color: ['blue', 'red'][n % 2] };
    send(ws, { t: 'init', you: me, doc, empty: !stored && doc.elements.length === 0, peers: [...sockets.values()] });
    for (const other of sockets.keys()) send(other, { t: 'join', peer: me });
    sockets.set(ws, me);
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.t === 'ops') {
        apply(message.ops);
        stored = true;
        for (const socket of sockets.keys()) send(socket, { t: 'ops', from: me.id, batch: message.batch, ops: message.ops });
      } else if (message.t === 'cursor') {
        for (const socket of sockets.keys()) if (socket !== ws) send(socket, { t: 'cursor', from: me.id, at: message.at });
      }
    });
    ws.onClose(() => {
      sockets.delete(ws);
      for (const socket of sockets.keys()) send(socket, { t: 'leave', id: me.id });
    });
  };
}

async function join(page: Page, name: string, room: (ws: WebSocketRoute) => void) {
  await page.routeWebSocket(/\/room\//, room);
  await page.addInitScript((n) => window.localStorage.setItem('leetcode-coach:collab-name', n), name);
  page.on('dialog', (dialog) => void dialog.accept());
}

const status = (page: Page) => page.locator('.board-save');

test('shares a whiteboard: both people edit it, and each keeps their own board', async ({ page: alice, browser }) => {
  const room = fakeRoom();
  await join(alice, 'Alice', room);
  await alice.goto('/#/board/scratch');
  await alice.getByRole('button', { name: 'Array', exact: true }).click();

  // 按「共用」：網址多了房間，自己的白板放進房間
  await alice.getByRole('button', { name: 'Share' }).click();
  await expect(alice).toHaveURL(/#\/board\/scratch\?room=[a-z0-9]{16}$/);
  await expect(status(alice)).toHaveText('1 person here');
  await expect(alice.getByRole('dialog', { name: 'Scratch whiteboard' })).toContainText('Shared whiteboard');

  // Bob 打開連結，看到同一張白板，加一個變數
  const context = await browser.newContext({ locale: 'en-US' });
  const bob = await context.newPage();
  await join(bob, 'Bob', room);
  await bob.goto(alice.url());
  await expect(bob.getByRole('group', { name: 'Array nums: 1, 2, 3, 4' })).toBeVisible();
  await expect(status(bob)).toHaveText('2 people here');
  await bob.getByRole('button', { name: 'Variable', exact: true }).click();
  await expect(alice.getByRole('group', { name: /^Variable / })).toBeVisible();

  // 點頭像看到兩個人
  await alice.getByRole('button', { name: /^Shared room/ }).click();
  const people = alice.getByRole('list', { name: 'Shared room' });
  await expect(people).toContainText('Alice (you)');
  await expect(people).toContainText('Bob');

  // Alice 離開：回到自己的白板，Bob 加的變數不會跑進來
  await alice.getByRole('button', { name: 'Leave' }).click();
  await expect(alice).not.toHaveURL(/room=/);
  await expect(alice.getByRole('group', { name: 'Array nums: 1, 2, 3, 4' })).toBeVisible();
  await expect(alice.getByRole('group', { name: /^Variable / })).toHaveCount(0);
  await expect(status(bob)).toHaveText('1 person here');

  // Bob 把共用的白板存一份，離開後自己的自由白板就是那張
  await bob.getByRole('button', { name: /^Shared room/ }).click();
  await bob.getByRole('button', { name: 'Save a copy to my board' }).click();
  await expect(bob.getByText('Saved to your whiteboard')).toBeVisible();
  await bob.getByRole('button', { name: /^Shared room/ }).click();
  await bob.getByRole('button', { name: 'Leave' }).click();
  await expect(bob.getByRole('group', { name: 'Array nums: 1, 2, 3, 4' })).toBeVisible();
  await expect(bob.getByRole('group', { name: /^Variable / })).toBeVisible();

  await context.close();
});
