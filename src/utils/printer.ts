/* eslint-disable @typescript-eslint/no-explicit-any */

export class ThermalPrinter {
  private device: any = null;
  private char: any = null;

  async connect(): Promise<boolean> {
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) return false;
      this.device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });
      const server = await this.device.gatt.connect();

      const servicePairs = [
        ['000018f0-0000-1000-8000-00805f9b34fb', '00002af1-0000-1000-8000-00805f9b34fb'],
        ['e7810a71-73ae-499d-8c15-faa9aef0c3f2', 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'],
      ];

      for (const [svc, chr] of servicePairs) {
        try {
          const service = await server.getPrimaryService(svc);
          this.char = await service.getCharacteristic(chr);
          return true;
        } catch { /* try next */ }
      }
      return false;
    } catch {
      return false;
    }
  }

  async print(text: string): Promise<boolean> {
    if (!this.char) return false;
    try {
      const encoder = new TextEncoder();
      const init = new Uint8Array([0x1B, 0x40]);
      const cut = new Uint8Array([0x1D, 0x56, 0x00]);
      const feed = new Uint8Array([0x0A, 0x0A, 0x0A]);

      await this.char.writeValue(init);
      const data = encoder.encode(text);
      for (let i = 0; i < data.length; i += 20) {
        await this.char.writeValue(data.slice(i, i + 20));
      }
      await this.char.writeValue(feed);
      await this.char.writeValue(cut);
      return true;
    } catch {
      return false;
    }
  }

  get isConnected() { return !!this.char; }
  get deviceName() { return this.device?.name || 'Unknown Printer'; }

  disconnect() {
    this.device?.gatt?.disconnect();
    this.device = null;
    this.char = null;
  }
}

export const printer = new ThermalPrinter();

export function formatReceipt(data: {
  cafeName: string;
  tableNumber: number;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  vatAmount?: number;
  vatRate?: number;
  vatEnabled?: boolean;
  total: number;
  method: string;
  date: string;
  billNumber: number;
}): string {
  const W = 32;
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((W - s.length) / 2));
    return ' '.repeat(pad) + s;
  };
  const line = '='.repeat(W);
  const dash = '-'.repeat(W);
  const row = (l: string, r: string) => {
    const space = Math.max(1, W - l.length - r.length);
    return l + ' '.repeat(space) + r;
  };

  let r = '';
  r += center(data.cafeName) + '\n';
  r += line + '\n';
  r += `Table: ${data.tableNumber}  Bill: #${data.billNumber}\n`;
  r += `Date: ${data.date}\n`;
  r += dash + '\n';
  for (const item of data.items) {
    r += row(`${item.quantity}x ${item.name}`, `Rs.${item.price * item.quantity}`) + '\n';
  }
  r += dash + '\n';
  r += row('Subtotal:', `Rs.${data.subtotal}`) + '\n';
  if (data.discount > 0) r += row('Discount:', `-Rs.${data.discount}`) + '\n';
  if (data.vatEnabled && data.vatAmount && data.vatAmount > 0) {
    const vatPct = Math.round((data.vatRate ?? 0.13) * 100);
    r += row(`VAT (${vatPct}%):`, `Rs.${data.vatAmount}`) + '\n';
  }
  r += row('TOTAL:', `Rs.${data.total}`) + '\n';
  r += dash + '\n';
  r += row('Payment:', data.method) + '\n';
  r += line + '\n';
  r += center('Thank You!') + '\n\n\n\n';
  return r;
}
