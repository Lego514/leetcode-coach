/**
 * 固定時間窗的計數器，放在記憶體裡。
 * 只有一台伺服器時足夠；水平擴展時要換成 Redis 之類的共用儲存。
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** 記一次嘗試；超過上限時回傳還要等幾秒 */
  hit(key: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
    const now = this.now();
    this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }
    entry.count += 1;
    if (entry.count > this.limit) {
      return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { allowed: true };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private lastSweep = 0;

  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}
