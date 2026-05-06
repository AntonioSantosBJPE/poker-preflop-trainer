export function sanitizeIpcError(err: unknown, fallbackPt: string): string {
  if (!(err instanceof Error)) return fallbackPt;
  const cleaned = err.message.replace(/^Error invoking remote method '[^']+':\s*/, '').trim();
  if (!cleaned || isTechnicalOrEnglish(cleaned)) return fallbackPt;
  return cleaned;
}

function isTechnicalOrEnglish(msg: string): boolean {
  return ['database not initialized', 'error invoking'].some((p) => msg.toLowerCase().includes(p));
}

export async function applySafeIpc<T>(fn: () => Promise<T>, fallbackPt: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new Error(sanitizeIpcError(err, fallbackPt));
  }
}
