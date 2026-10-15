import type { ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { scrubEvent, sentryOptions, stripQuery } from './monitoring';

describe('error monitoring', () => {
  it('keeps only the path of a url, also inside the hash route', () => {
    expect(stripQuery('https://app.test/#/reset?token=secret')).toBe('https://app.test/#/reset');
    expect(stripQuery('https://app.test/?utm=x#/problems/1?tab=notes')).toBe('https://app.test/#/problems/1');
    expect(stripQuery('/api/sync')).toBe('/api/sync');
  });

  it('removes anything that could identify the person before sending', () => {
    const event = {
      type: undefined,
      user: { email: 'me@example.com', id: '1' },
      request: { url: 'https://app.test/#/reset?token=secret', cookies: { sid: 'x' }, headers: { Cookie: 'sid=x' }, data: '{}', query_string: 'a=1' },
      breadcrumbs: [
        { category: 'navigation', data: { from: '#/reset?token=secret', to: '#/' } },
        { category: 'fetch', data: { url: '/api/auth/reset?token=secret', method: 'POST' } },
      ],
    } as ErrorEvent;
    const scrubbed = scrubEvent(event);
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request).toEqual({ url: 'https://app.test/#/reset' });
    expect(scrubbed.breadcrumbs?.[0].data).toEqual({ from: '#/reset', to: '#/' });
    expect(scrubbed.breadcrumbs?.[1].data).toEqual({ url: '/api/auth/reset', method: 'POST' });
  });

  it('sends errors only: no personal data, no tracing, no console logs', () => {
    const options = sentryOptions('https://key@o0.ingest.sentry.io/0');
    expect(options.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false });
    expect(options.tracesSampleRate).toBe(0);
    expect(options.beforeBreadcrumb?.({ category: 'console', message: 'my notes' }, undefined)).toBeNull();
    const click = { category: 'ui.click', message: 'button.btn' };
    expect(options.beforeBreadcrumb?.(click, undefined)).toBe(click);
  });
});
