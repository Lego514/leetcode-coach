import { describe, expect, it } from 'vitest';
import { AI_ORIGINS, connectSources, contentSecurityPolicy } from './csp';

function directive(policy: string, name: string): string[] {
  const found = policy.split('; ').find((part) => part.startsWith(`${name} `));
  return found ? found.split(' ').slice(1) : [];
}

describe('contentSecurityPolicy', () => {
  it('only runs scripts from our own site', () => {
    const policy = contentSecurityPolicy({});
    expect(directive(policy, 'script-src')).toEqual(["'self'"]);
    expect(directive(policy, 'object-src')).toEqual(["'none'"]);
    expect(directive(policy, 'base-uri')).toEqual(["'self'"]);
    expect(policy).not.toContain('unsafe-eval');
  });

  it('lets the browser call the AI providers used with your own key', () => {
    expect(directive(contentSecurityPolicy({}), 'connect-src')).toEqual(["'self'", ...AI_ORIGINS]);
  });

  it('adds the whiteboard server for both fetch and WebSocket', () => {
    const sources = connectSources({ collabUrl: 'https://collab.example.workers.dev/some/path' });
    expect(sources).toContain('https://collab.example.workers.dev');
    expect(sources).toContain('wss://collab.example.workers.dev');
    expect(connectSources({ collabUrl: 'http://localhost:8788' })).toContain('ws://localhost:8788');
  });

  it('adds only the host of the Sentry DSN, without the key', () => {
    const sources = connectSources({ sentryDsn: 'https://publickey@o123.ingest.us.sentry.io/456' });
    expect(sources).toContain('https://o123.ingest.us.sentry.io');
    expect(sources.join(' ')).not.toContain('publickey');
  });

  it('ignores settings that are not http(s) URLs', () => {
    expect(connectSources({ collabUrl: 'not a url', sentryDsn: 'javascript:alert(1)' })).toEqual(["'self'", ...AI_ORIGINS]);
  });

  it('does not put frame-ancestors in the meta tag, where browsers ignore it', () => {
    expect(contentSecurityPolicy({})).not.toContain('frame-ancestors');
  });
});
