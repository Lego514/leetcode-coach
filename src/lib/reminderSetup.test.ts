import { describe, expect, it } from 'vitest';
import { detectIos, reminderStep, type ReminderEnv } from './reminderSetup';

const base: ReminderEnv = {
  available: true,
  dismissed: false,
  ios: false,
  iosSafari: false,
  standalone: false,
  pushReady: true,
  signedIn: true,
  subscribed: false,
};

describe('daily reminder setup card', () => {
  it('offers one tap to turn reminders on once signed in', () => {
    expect(reminderStep(base)).toBe('enable');
  });

  it('shows nothing when reminders are off on the server, already on, or dismissed', () => {
    expect(reminderStep({ ...base, available: false })).toBe('none');
    expect(reminderStep({ ...base, subscribed: true })).toBe('none');
    expect(reminderStep({ ...base, dismissed: true, ios: true, iosSafari: true })).toBe('none');
  });

  it('on iPhone, asks to add to the home screen first, from Safari', () => {
    const iphone = { ...base, ios: true, pushReady: false, signedIn: false };
    expect(reminderStep({ ...iphone, iosSafari: true })).toBe('install-ios');
    expect(reminderStep(iphone)).toBe('use-safari');
    // 從主畫面打開了：先登入，再打開
    expect(reminderStep({ ...iphone, iosSafari: true, standalone: true, pushReady: true })).toBe('sign-in');
    expect(reminderStep({ ...iphone, iosSafari: true, standalone: true, pushReady: true, signedIn: true })).toBe('enable');
    // iOS 太舊，從主畫面打開也沒有推播
    expect(reminderStep({ ...iphone, iosSafari: true, standalone: true })).toBe('none');
  });

  it('leaves signing in to the usual banner unless the app is installed', () => {
    expect(reminderStep({ ...base, signedIn: false })).toBe('none');
    expect(reminderStep({ ...base, signedIn: false, standalone: true })).toBe('sign-in');
    expect(reminderStep({ ...base, pushReady: false })).toBe('none');
  });

  it('tells Safari on iPhone and iPad from other browsers', () => {
    const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const chrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
    const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    expect(detectIos(safari, 5)).toEqual({ ios: true, iosSafari: true });
    expect(detectIos(chrome, 5)).toEqual({ ios: true, iosSafari: false });
    expect(detectIos(ipad, 5)).toEqual({ ios: true, iosSafari: true });
    expect(detectIos(ipad, 0)).toEqual({ ios: false, iosSafari: false });
  });
});
