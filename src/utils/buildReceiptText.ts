import { format } from 'date-fns';
import { numberToWords } from './printer';

const W = 42;

function center(text: string): string {
  if (text.length >= W) return text.slice(0, W);
  const pad = Math.floor((W - text.length) / 2);
  return ' '.repeat(pad) + text;
}

function hr(char = '-'): string {
  return char.repeat(W);
}

function leftRight(l: string, r: string): string {
  const gap = Math.max(1, W - l.length - r.length);
  return l + ' '.repeat(gap) + r;
}

function ljust(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s.padEnd(w);
}

function rjust(s: string | number, w: number): string {
  return String(s).length >= w ? String(s).slice(-w) : String(s).padStart(w);
}

export interface ReceiptData {
  cafeName: string;
  cafeAddress?: string;
  cafePan?: string;
  billFooter?: string;
  tableNumber: number;
  billNumber: number;
  createdAt: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  subtotal: number;
  discountAmount: number;
  vatEnabled: boolean;
  vatAmount: number;
  vatRate: number;
  total: number;
  method: string;
}

export function buildReceiptText(data: ReceiptData): string {
  const lines: string[] = [];
  const push = (s = '') => lines.push(s);

  const dateStr = format(data.createdAt, 'dd/MM/yyyy');
  const timeStr = format(data.createdAt, 'hh:mm aa');
  const taxableAmount = data.subtotal - data.discountAmount;

  push(hr('='));
  push(center(data.cafeName));
  if (data.cafeAddress) push(center(data.cafeAddress));
  if (data.cafePan) push(center(`PAN: ${data.cafePan}`));
  push(hr('='));
  push(center('TAX INVOICE'));
  push(hr('='));
  push(`Payment: ${data.method}`);
  push(leftRight(`Bill No: #${data.billNumber}`, `Date: ${dateStr}`));
  push(`Table: ${data.tableNumber}`);
  push(hr('-'));

  // Header row: SN(3) + Item(20) + Qty(4) + Rate(7) + Amt(8) = 42
  push(ljust('SN', 3) + ljust('Particulars', 20) + rjust('Qty', 4) + rjust('Rate', 7) + rjust('Amt', 8));
  push(hr('-'));

  data.items.forEach((item, idx) => {
    push(
      ljust(String(idx + 1), 3) +
      ljust(item.name, 20) +
      rjust(String(item.quantity), 4) +
      rjust(item.price.toFixed(0), 7) +
      rjust((item.price * item.quantity).toFixed(0), 8)
    );
  });

  push(hr('-'));
  push(leftRight('Basic Amount:', `Rs. ${data.subtotal.toFixed(2)}`));
  if (data.discountAmount > 0) {
    push(leftRight('Discount:', `-Rs. ${data.discountAmount.toFixed(2)}`));
  }
  push(leftRight('Taxable Amount:', `Rs. ${taxableAmount.toFixed(2)}`));
  if (data.vatEnabled && data.vatAmount > 0) {
    push(leftRight(`VAT (${Math.round(data.vatRate * 100)}%):`, `Rs. ${data.vatAmount.toFixed(2)}`));
  }
  push(hr('='));
  push(leftRight('TOTAL:', `Rs. ${data.total.toFixed(2)}`));
  push(hr('='));
  push(`In words: ${numberToWords(Math.round(data.total))}`);
  push(hr('-'));
  push(leftRight(`Cashier: ${data.cafeName}`, `Time: ${timeStr}`));
  push(hr('='));
  push(center(data.billFooter || 'Thank you for visiting!'));
  push(hr('='));
  push('');

  return lines.join('\n');
}
