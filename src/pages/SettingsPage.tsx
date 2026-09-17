import { useRef, useState, type ChangeEvent } from 'react';
import { AccountSection } from '../components/AccountSection';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { useToast } from '../components/toast';
import { Dialog, PageHead, Sheet } from '../components/ui';
import { STUDY_LISTS, type ListId } from '../data/lists';
import { useI18n } from '../i18n';
import { isDay, toDay } from '../lib/dates';
import { LANGUAGES } from '../lib/languages';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { updateSettings } from '../store/actions';
import {
  BackupError,
  clearAllData,
  exportBackup,
  parseBackup,
  restoreBackup,
  type BackupErrorCode,
  type BackupFile,
} from '../store/backup';
import { useCloud } from '../store/cloud';
import { useSettings, useToday } from '../store/queries';

const THEMES: ThemeChoice[] = ['system', 'light', 'dark'];

export function SettingsPage() {
  const { t } = useI18n();
  const settings = useSettings();
  const day = useToday();
  const [theme, setTheme] = useTheme();

  return (
    <div className="page">
      <PageHead title={t.settings.title} />
      <div className="stack">
        <AccountSection />
        <Sheet title={t.settings.planTitle} id="plan">
          <div className="sheet-body stack" style={{ gap: 20 }}>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="field-label" style={{ marginBottom: 8 }}>
                {t.settings.mainList}
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
                        {t.lists.withCount(list.name, list.problemIds.length)}
                      </span>
                      <span className="rating-detail" style={{ display: 'block' }}>
                        {t.lists.descriptions[list.id]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-grid">
              <label className="field">
                <span className="field-label">{t.settings.dailyNew}</span>
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
                <span className="field-hint">{t.settings.dailyNewHint}</span>
              </label>
              <TargetDateField value={settings.targetDate} today={day} />
            </div>
          </div>
        </Sheet>

        <Sheet title={t.settings.appearanceTitle} id="appearance">
          <div className="sheet-body form-grid">
            <div className="field">
              <span className="field-label">{t.common.languageLabel}</span>
              <div style={{ alignSelf: 'flex-start' }}>
                <LanguageSwitch />
              </div>
            </div>
            <label className="field">
              <span className="field-label">{t.settings.codeLanguage}</span>
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
                {t.settings.theme}
              </span>
              <div className="segmented" role="group" aria-labelledby="theme-label" style={{ alignSelf: 'flex-start' }}>
                {THEMES.map((id) => (
                  <button key={id} type="button" aria-pressed={theme === id} onClick={() => setTheme(id)}>
                    {t.settings.themes[id]}
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
  const { t, fmt } = useI18n();
  return (
    <div className="field">
      <label className="field-label" htmlFor="target-date">
        {t.settings.targetDate}
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
            {t.common.clear}
          </button>
        )}
      </div>
      <span className="field-hint">
        {value ? t.settings.targetHint(fmt.day(value)) : t.settings.targetEmptyHint}
      </span>
    </div>
  );
}

function BackupSection() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const signedIn = useCloud().account.kind === 'signed-in';
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState<BackupErrorCode | null>(null);
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
    toast(t.settings.exported);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      if (err instanceof BackupError) setImportError(err.code);
      else throw err;
    }
  }

  async function confirmImport() {
    if (!pending) return;
    await restoreBackup(pending);
    setPending(null);
    toast(t.settings.imported);
  }

  async function clear() {
    await clearAllData();
    setConfirmClear(false);
    toast(t.settings.cleared);
  }

  return (
    <Sheet title={t.settings.backupTitle} id="backup">
      <div className="sheet-body stack" style={{ gap: 16 }}>
        <p className="sheet-note">
          {signedIn ? t.settings.backupSynced : t.settings.backupLocal}
        </p>
        {importError && (
          <p className="form-error" role="alert">
            {t.errors.backup[importError]}
          </p>
        )}
        <div className="btn-row">
          <button className="btn" onClick={() => void download()}>
            {t.settings.export}
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            {t.settings.import}
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e)} />
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>
            {t.settings.clearAll}
          </button>
        </div>
      </div>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t.settings.importTitle}
        subtitle={pending ? t.settings.importTime(fmt.dateTime(pending.exportedAt)) : undefined}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setPending(null)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-primary" onClick={() => void confirmImport()}>
              {t.settings.importReplace}
            </button>
          </>
        }
      >
        <p>{t.settings.importBody(signedIn, pending?.data.progress.length ?? 0, pending?.data.attempts.length ?? 0)}</p>
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t.settings.clearTitle}
        footer={
          <>
            <button className="btn btn-quiet" onClick={() => setConfirmClear(false)}>
              {t.common.cancel}
            </button>
            <button className="btn btn-danger" onClick={() => void clear()}>
              {t.settings.clearAll}
            </button>
          </>
        }
      >
        <p>{t.settings.clearBody(signedIn)}</p>
      </Dialog>
    </Sheet>
  );
}
