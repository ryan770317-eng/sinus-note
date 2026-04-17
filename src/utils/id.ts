/**
 * Generate a globally-unique, URL-safe ID.
 * Prefers crypto.randomUUID() when available; falls back to a timestamp+random composite.
 * The prefix helps keep ID domains visually distinct across tables.
 */
export function uid(prefix: string): string {
  const c: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return `${prefix}_${c.randomUUID()}`;
  }
  // Fallback: 16 bytes of randomness + timestamp — extremely low collision probability
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * Derive a human-friendly version tag from a monotonically increasing id.
 *   1 → V-A, 26 → V-Z, 27 → V-AA, 28 → V-AB, ...
 * This replaces the old `V-${String.fromCharCode(64 + (nextId%26 || 26))}` which
 * silently collided after id > 26.
 */
export function versionTag(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'V-A';
  let x = Math.floor(n);
  let out = '';
  while (x > 0) {
    const rem = (x - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    x = Math.floor((x - 1) / 26);
  }
  return `V-${out}`;
}
