import { Hono } from 'hono';
import { syncRequestSchema, validateChange, type SyncChange } from '../../../shared/protocol';
import { HttpError, readJson, requireUser, type AppDeps, type AppEnv } from '../http';
import { sync } from './service';

export function syncRoutes(deps: AppDeps) {
  return new Hono<AppEnv>().post('/', requireUser(deps), async (c) => {
    const request = await readJson(c, syncRequestSchema);
    const changes: SyncChange[] = [];
    for (const [index, raw] of request.changes.entries()) {
      const result = validateChange(raw);
      if (!result.ok) throw new HttpError(400, 'invalid_request', `changes.${index}: ${result.message}`);
      changes.push(result.change);
    }
    return c.json(await sync(deps.db, c.get('user').id, request.cursor, changes));
  });
}
