const store = new Map<string, { v: unknown; exp: number }>();

export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.exp > now) return hit.v as T;
  const v = await fn();
  store.set(key, { v, exp: now + ttlMs });
  return v;
}

export async function withBackoff<T>(fn: () => Promise<T>, tries = 4, unitMs = 1000): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; if (i < tries - 1) await new Promise(r => setTimeout(r, unitMs * 2 ** i)); }
  }
  throw last;
}
