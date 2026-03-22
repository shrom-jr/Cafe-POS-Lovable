import type { Settings } from '@/types/pos';

export const fmt = (n: number): string =>
  Number.isInteger(n)
    ? n.toLocaleString('en-IN')
    : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BUILTIN_LABELS: Record<string, string> = {
  cash: 'Cash',
  esewa: 'eSewa',
  khalti: 'Khalti',
  fonepay: 'Fonepay',
};

export const resolvePaymentLabel = (method: string, settings?: Settings): string => {
  if (BUILTIN_LABELS[method]) return BUILTIN_LABELS[method];
  const wallets = settings?.customWallets ?? [];
  const byId = wallets.find((w) => w.id === method);
  if (byId) return byId.name;
  const byName = wallets.find((w) => w.name === method);
  if (byName) return byName.name;
  return method;
};
