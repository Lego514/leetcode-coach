import { describe, expect, it } from 'vitest';
import { createFormatters } from '../i18n/format';
import en from '../i18n/messages/en';
import { toDay } from '../lib/dates';
import type { CloudState } from '../store/cloud';
import { syncStatusText } from './AccountSection';

describe('syncStatusText', () => {
  const fmt = createFormatters('en');
  const syncedAt = new Date(2026, 10, 5, 23, 50).getTime();
  const cloud = { phase: 'idle', lastSyncedAt: syncedAt } as CloudState;

  it('shows only the time for a sync today, and adds the date once that day is over', () => {
    const sameDay = syncStatusText(cloud, en, fmt, toDay(new Date(syncedAt)));
    expect(sameDay).toBe(`Synced at ${fmt.time(syncedAt)}`);
    // 開著過了午夜：昨天的時間要寫日期，不然看起來像今天
    const nextDay = syncStatusText(cloud, en, fmt, '2026-11-06');
    expect(nextDay).toBe(`Synced at ${fmt.dateTime(new Date(syncedAt).toISOString())}`);
    expect(nextDay).not.toBe(sameDay);
  });
});
