import { OrderItem, Settings } from '@/types/pos';

export interface BillCalcResult {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  vatRate: number;
  vatMode: 'excluded' | 'included';
  vatEnabled: boolean;
  total: number;
}

export function calcBill(
  items: OrderItem[],
  settings: Pick<Settings, 'vatEnabled' | 'vatRate' | 'vatMode'>,
  discountType: 'percent' | 'fixed' = 'percent',
  discountValue: number = 0
): BillCalcResult {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const discountAmount =
    discountType === 'percent'
      ? Math.round((subtotal * discountValue) / 100)
      : Math.min(discountValue, subtotal);

  const afterDiscount = Math.max(0, subtotal - discountAmount);

  const vatEnabled = settings.vatEnabled ?? false;
  const vatRate = settings.vatRate ?? 0.13;
  const vatMode = settings.vatMode ?? 'excluded';

  const vatAmount = vatEnabled
    ? vatMode === 'excluded'
      ? Math.round(afterDiscount * vatRate)
      : Math.round(afterDiscount * vatRate / (1 + vatRate))
    : 0;

  const total =
    vatEnabled && vatMode === 'excluded' ? afterDiscount + vatAmount : afterDiscount;

  return { subtotal, discountAmount, vatAmount, vatRate, vatMode, vatEnabled, total };
}
