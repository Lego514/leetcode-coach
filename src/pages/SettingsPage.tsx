import { useRef, useState, type ChangeEvent } from 'react';
import { AccountSection } from '../components/AccountSection';
import { useToast } from '../components/toast';
import { Dialog, PageHead, Sheet } from '../components/ui';
import { STUDY_LISTS, type ListId } from '../data/lists';
import { formatDay, isDay, toDay } from '../lib/dates';
import { LANGUAGES } from '../lib/languages';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { updateSettings } from '../store/actions';
import { clearAllData, exportBackup, parseBackup, restoreBackup, type BackupFile } from '../store/backup';
import { useCloud } from '../store/cloud';
import { useSettings, useToday } from '../store/queries';

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: '跟隨系統' },
  { id: 'light', label: '淺色' },
  { id: 'dark', label: '深色' },
];

export function SettingsPage() {
  const settings = useSettings();
  const day = useToday();
  const [theme, setTheme] = useTheme();

  return (
    <div className="page">
      <PageHead title="設定" />
      <div className="stack">
        <AccountSection />
        <Sheet title="刷題計畫" id="plan">
          <div className="sheet-body stack" style={{ gap: 20 }}>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="field-label" style={{ marginBottom: 8 }}>
                主要清單
              </legend>
              <div className="stack" style={{ gap: 8 }}>
                {STUDY_LISTS.map((list) => (
                  <label
                    key={list.id}
                    className="rating-option"
                    style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
                  >
                    <input
                      type="radio"
                      name="active-list"
                      style={{ marginTop: 5, accentColor: 'var(--pen)' }}
                      checked={settings.activeList === list.id}
                      onChange={() => void updateSettings({ activeList: list.id as ListId })}
                    />
                    <span>
                      <span className="rating-label">
                        {list.name}（{list.problemIds.length} 題）
                      </span>
                      <span className="rating-detail" style={{ display: 'block' }}>
                        {list.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-grid">
              <label className="field">
                <span className="field-label">每天的新題數</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  value={settings.dailyNew}
                  onChange={(e) => {
                    const n = Math.round(Number(e.target.value));
                    if (Number.isFinite(n) && n >= 0 && n <= 20) void updateSettings({ dailyNew: n });
                  }}
                />
                <span className="field-hint">複習題不算在內。複習量多的時候，可以暫時設成 0。</span>
              </label>
              <TargetDateField value={settings.targetDate} today={day} />
            </div>
          </div>
        </Sheet>

        <Sheet title="筆記與外觀" id="appearance">
          <div className="sheet-body form-grid">
            <label className="field">
              <span className="field-label">程式碼預設語言</span>
              <select
                className="select"
                value={settings.language}
                onChange={(e) => void updateSettings({ language: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="field-label" id="theme-label">
                外觀
              </span>
              <div className="segmented" role="group" aria-labelledby="theme-label" style={{ alignSelf: 'flex-start' }}>
                {THEMES.map((t) => (
                  <button key={t.id} type="button" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Sheet>

        <BackupSection />
      </div>
    </div>
  );
}

function TargetDateField({ value, today }: { value?: string; today: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor="target-date">
        目標日期
      </label>
      <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
        <input
          id="target-date"
          className="input"
          type="date"
          min={today}
          value={value ?? ''}
          onChange={(e) => {
            const next = e.target.value;
            if (next === '' || isDay(next)) void updateSettings({ targetDate: next || undefined });
          }}
        />
        {value && (
          <button type="button" className="btn btn-quiet" onClick={() => void updateSettings({ targetDate: undefined })}>
            清除
          </button>
        )}
      </div>
      <span className="field-hint">
        {value
          ? `今天頁會計算到 ${formatDay(value)} 前每天要做幾題。`
          : '還沒有面試日期也沒關係，可以設一個想刷完第一輪的日子。'}
      </span>
    </div>
  );
}

function BackupSection() {
  const toast = useToast();
  const signedIn = useCloud().account.kind === 'signed-in';
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  async function download() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetcode-coach-${toDay(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已匯出備份檔。');
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setImportError('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }

  async function confirmImport() {
    if (!pending) return;
    await restoreBackup(pending);
    setPending(null);
    toast('已匯入備份。');
  }

  async function clear() {
    await clearAllData();
    setConfirmClear(false);
    toast('已清除所有資料。');
  }

  return (
    <Sheet title="備份與資料" id="backup">
      <div className="sheet-body stack" style={{ gap: 16 }}>
        <p className="sheet-note">
          {signedIn
            ? '資料會自動同步到雲端。備份檔可以留一份在自己的電腦，以防萬一。錄音檔太大，不會放進備份。'
            : '沒有登入時，資料只存在這個瀏覽器裡。換電腦、換瀏覽器或清除瀏覽紀錄前，先匯出備份。錄音檔太大，不會放進備份。'}
        </p>
        {importError && (
          <p className="form-error" role="alert">
            {importError}
          </p>
        )}
        <div className="btn-row">
          <button className="btn" onClick={() => void download()}>
            匯出備份
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            從備份匯入
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e)} />
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>
            清除所有資料
          </button>
        </div>
      </div>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="用備份取代目前的資料？"
        subtitle={pending ? `備份時間：${new Date(pending.exportedAt).toLocaleString('zh-TW')}` : undefined}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setPending(null)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={() => void confirmImport()}>
              匯入並取代
            </button>
          </>
        }
      >
        <p>
          目前的練習紀錄、筆記和設定會被備份檔的內容取代，模擬面試的錄音也會一起清除
          {signedIn ? '，雲端上的資料也會改成備份的內容' : ''}。備份裡有 {pending?.data.progress.length ?? 0} 題的複習排程、
          {pending?.data.attempts.length ?? 0} 筆練習紀錄。
        </p>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="清除所有資料？"
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirmClear(false)}>
              取消
            </button>
            <button className="btn btn-danger" onClick={() => void clear()}>
              清除所有資料
            </button>
          </>
        }
      >
        <p>
          練習紀錄、筆記、模擬面試與錄音、自訂題目和設定都會刪除，無法復原
          {signedIn ? '。你已登入，雲端上的資料也會一起刪除' : ''}。建議先匯出備份。
        </p>
      </Dialog>
    </Sheet>
  );
}
