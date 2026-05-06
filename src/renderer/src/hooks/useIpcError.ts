const IPC_PREFIX = /^Error invoking remote method '[^']+':\s*/;
const TECHNICAL = [
  'database not initialized',
  'error invoking',
  'internal error',
  'undefined',
  'null',
];

export function ipcErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Ocorreu um erro inesperado. Tente novamente.';
  const cleaned = err.message.replace(IPC_PREFIX, '').trim();
  if (!cleaned || TECHNICAL.some((p) => cleaned.toLowerCase().includes(p))) {
    return 'Ocorreu um erro inesperado. Tente novamente.';
  }
  return cleaned;
}
