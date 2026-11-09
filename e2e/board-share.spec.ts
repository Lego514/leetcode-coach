import { expect, test, type Page, type WebSocketRoute } from '@playwright/test';

// 白板共用：房間的伺服器（dsa-whiteboard 的 Cloudflare Worker）換成測試裡的假房間，
// 兩個瀏覽器（各自的本機資料）連到同一個假房間

interface Peer {
  id: string;
  name: string;
  color: string;
  viewer?: boolean;
}
interface El {
  id: string;
}
type Op = { k: 'put'; el: El } | { k: 'del'; id: string } | { k: 'steps'; steps: unknown[] };

/** 只能看的代碼：真的伺服器是房間代碼的雜湊，這裡固定一個就好 */
const VIEW_ID = 'v'.repeat(24);

/**
 * 跟真的伺服器一樣：照收到的順序套用修改，再傳給所有人（包含送的人）。
 * /view/… 連進來的人只能看：init 裡沒有只能看的代碼，送來的修改擋下來
 */
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
    const viewer = new URL(ws.url()).pathname.includes('/view/');
    const me: Peer = {
      id: `p${n}`,
      name: new URL(ws.url()).searchParams.get('name') ?? '',
      color: ['blue', 'red'][n % 2],
      ...(viewer && { viewer: true }),
    };
    const peers = [...sockets.values()];
    send(ws, { t: 'init', you: me, doc, empty: !stored && doc.elements.length === 0, peers, ...(!viewer && { viewId: VIEW_ID }) });
    for (const other of sockets.keys()) send(other, { t: 'join', peer: me });
    sockets.set(ws, me);
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.t === 'ops' && viewer) {
        send(ws, { t: 'reject', batch: message.batch, reason: 'read_only' });
      } else if (message.t === 'ops') {
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
  await page.routeWebSocket(/\/(room|view)\//, room);
  await page.addInitScript((n) => window.localStorage.setItem('leetcode-coach:collab-name', n), name);
  page.on('dialog', (dialog) => void dialog.accept());
}

const status = (page: Page) => page.locator('.board-save');

test('shares a whiteboard: both people edit it, and each keeps their own board', async ({ page: alice, browser, isMobile }) => {
  const room = fakeRoom();
  await join(alice, 'Alice', room);
  await alice.goto('/#/board/scratch');
  await alice.getByRole('button', { name: 'Array', exact: true }).click();

  // 按「共用」先看說明，按「建立連結」才開房間：網址多了房間，自己的白板放進房間
  await alice.getByRole('button', { name: 'Share' }).click();
  await alice.getByRole('dialog', { name: 'Share this board' }).getByRole('button', { name: 'Create link' }).click();
  await expect(alice).toHaveURL(/#\/board\/scratch\?room=[a-z0-9]{16}$/);
  // 建好之後房間選單打開、顯示連結；先關起來
  await expect(alice.getByRole('textbox', { name: 'Can edit' })).toHaveValue(alice.url());
  await alice.keyboard.press('Escape');
  await expect(status(alice)).toHaveText('1 person here');
  // 手機上那行小字換成連線狀態
  if (!isMobile) await expect(alice.getByRole('dialog', { name: 'Scratch whiteboard' })).toContainText('Shared whiteboard');

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

// 只能看的連結（模擬面試的面試官）：?watch=…，看得到白板跟著動，但不能改，也不會動到自己的白板
test('a view-only link watches the shared board without editing it', async ({ page: alice, browser, isMobile }) => {
  test.skip(isMobile, '兩個人的流程在桌機測過就好');
  const room = fakeRoom();
  await join(alice, 'Alice', room);
  await alice.goto('/#/board/scratch');
  await alice.getByRole('button', { name: 'Array', exact: true }).click();
  await alice.getByRole('button', { name: 'Share' }).click();
  await alice.getByRole('dialog', { name: 'Share this board' }).getByRole('button', { name: 'Create link' }).click();
  await expect(status(alice)).toHaveText('1 person here');

  // 選單裡有兩個連結：能編輯的是網址，只能看的是 ?watch=…
  await expect(alice.getByRole('textbox', { name: 'Can edit' })).toHaveValue(alice.url());
  const viewField = alice.getByRole('textbox', { name: 'View only' });
  await expect(viewField).toHaveValue(new RegExp(`#/board/scratch\\?watch=${VIEW_ID}$`));
  const viewLink = await viewField.inputValue();
  await alice.keyboard.press('Escape');

  // Bob 自己的自由白板上有一個變數
  const context = await browser.newContext({ locale: 'en-US' });
  const bob = await context.newPage();
  await join(bob, 'Bob', room);
  await bob.goto('/#/board/scratch');
  await bob.getByRole('button', { name: 'Variable', exact: true }).click();
  await expect(bob.getByRole('group', { name: /^Variable / })).toBeVisible();

  // 用只能看的連結進來：看得到 Alice 的白板，沒有元件庫，也加不了東西
  await bob.goto(viewLink);
  const array = bob.getByRole('group', { name: 'Array nums: 1, 2, 3, 4' });
  await expect(array).toBeVisible();
  await expect(status(bob)).toHaveText('View only · 2 people here');
  await expect(bob.getByRole('complementary', { name: 'Elements' })).toHaveCount(0);
  await expect(bob.getByRole('group', { name: /^Variable / })).toHaveCount(0);

  // Alice 改的 Bob 馬上看到；Alice 那邊寫著 Bob 只能看
  await alice.getByRole('group', { name: /^Array nums/ }).dblclick();
  await alice.getByRole('textbox', { name: 'Cell 0' }).fill('7');
  await alice.keyboard.press('Enter');
  await expect(bob.getByRole('group', { name: 'Array nums: 7, 2, 3, 4' })).toBeVisible();
  await alice.getByRole('button', { name: /^Shared room/ }).click();
  await expect(alice.getByRole('list', { name: 'Shared room' }).getByRole('listitem').filter({ hasText: 'Bob' })).toContainText('view only');

  // Bob 離開：回到自己的白板，變數還在，Alice 的陣列沒有跑進來
  await bob.getByRole('button', { name: /^Shared room/ }).click();
  // 只能看的人複製到的也是只能看的連結
  await expect(bob.getByRole('textbox', { name: 'Link to this room' })).toHaveValue(viewLink);
  await bob.getByRole('button', { name: 'Leave' }).click();
  await expect(bob).not.toHaveURL(/watch=/);
  await expect(bob.getByRole('group', { name: /^Variable / })).toBeVisible();
  await expect(bob.getByRole('group', { name: /^Array nums/ })).toHaveCount(0);

  await context.close();
});
