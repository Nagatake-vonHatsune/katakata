/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const pa = new Date(a + 'T00:00:00');
  const pb = new Date(b + 'T00:00:00');
  return Math.round((pb.getTime() - pa.getTime()) / 86_400_000);
}

/** Monday-to-Sunday week containing d, as day keys. */
export function weekKeys(d: Date = new Date()): string[] {
  const start = new Date(d);
  const dow = (start.getDay() + 6) % 7; // Mon=0
  start.setDate(start.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return dayKey(x);
  });
}

export function uid(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}-${Date.now().toString(36)}-${rand[0].toString(36)}${rand[1].toString(36)}`;
}
