import { useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { fmt, resolvePaymentLabel } from '@/utils/format';
import AppLayout from '@/components/ui/AppLayout';
import ReceiptPreview from '@/components/ReceiptPreview';
import { Search, Printer, Receipt, X, Calendar } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { printer, formatReceipt } from '@/utils/printer';
import type { Payment } from '@/types/pos';

type DateFilter = 'today' | 'yesterday' | 'custom';

const BillHistory = () => {
  const payments = usePOSStore((s) => s.payments);
  const settings = usePOSStore((s) => s.settings);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selectedBill, setSelectedBill] = useState<Payment | null>(null);
  const [printError, setPrintError] = useState(false);
  const [printing, setPrinting] = useState(false);

  const baseList = useMemo(() => {
    let list = [...payments].sort((a, b) => b.createdAt - a.createdAt);
    if (dateFilter === 'today') {
      list = list.filter((p) => isToday(new Date(p.createdAt)));
    } else if (dateFilter === 'yesterday') {
      list = list.filter((p) => isYesterday(new Date(p.createdAt)));
    } else if (dateFilter === 'custom' && customDate) {
      const target = new Date(customDate);
      list = list.filter((p) => isSameDay(new Date(p.createdAt), target));
    }
    return list;
  }, [payments, dateFilter, customDate]);

  const filtered = useMemo(() => {
    let list = baseList;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          `table ${p.tableNumber}`.includes(q) ||
          p.reference?.toLowerCase().includes(q) ||
          p.billNumber.toString().includes(q)
      );
    }
    if (methodFilter) {
      list = list.filter((p) => p.method === methodFilter);
    }
    return list;
  }, [baseList, search, methodFilter]);

  const handleReprint = async (p: Payment) => {
    setPrintError(false);
    setPrinting(true);
    const ok = await printer.print(
      formatReceipt({
        cafeName: p.cafeName,
        tableNumber: p.tableNumber,
        items: p.items,
        subtotal: p.subtotal,
        discount:
          p.discountType === 'percent'
            ? Math.round((p.subtotal * p.discount) / 100)
            : p.discount,
        vatAmount: p.vatAmount,
        vatRate: p.vatRate,
        vatEnabled: p.vatEnabled,
        total: p.total,
        method: p.method,
        date: format(p.createdAt, 'yyyy-MM-dd HH:mm'),
        billNumber: p.billNumber,
      })
    );
    setPrinting(false);
    if (!ok) setPrintError(true);
  };

  const methodBadgeColor = (method: string) => {
    if (method === 'cash') return 'bg-success/15 text-success';
    if (method === 'esewa') return 'bg-green-500/15 text-green-400';
    if (method === 'khalti') return 'bg-purple-500/15 text-purple-400';
    if (method === 'fonepay') return 'bg-red-500/15 text-red-400';
    return 'bg-accent/15 text-accent';
  };

  return (
    <AppLayout title="Bill History">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 space-y-3">
            {/* Date filter */}
            <div className="flex gap-2 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setDateFilter('today')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  dateFilter === 'today'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  dateFilter === 'yesterday'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  dateFilter === 'custom'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar size={13} />
                Custom
              </button>
            </div>

            {/* Custom date picker */}
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            )}

            {/* Search + Method filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search bill ID, table..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Filter: All</option>
                <option value="cash">Cash</option>
                <option value="esewa">eSewa</option>
                <option value="khalti">Khalti</option>
                <option value="fonepay">Fonepay</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'bill' : 'bills'} found
            </p>

            {/* Bill list */}
            <div className="space-y-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedBill(p)}
                  className="w-full bg-card rounded-xl border border-border px-4 py-3.5 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-accent">#{p.billNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">Table {p.tableNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${methodBadgeColor(p.method)}`}
                      >
                        {resolvePaymentLabel(p.method, settings)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(p.createdAt, 'hh:mm a')} &middot;{' '}
                      {p.items.length} item{p.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-accent">Rs. {fmt(p.total)}</p>
                  </div>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-16">
                <Receipt size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium">No bills found</p>
                <p className="text-sm mt-1">
                  {dateFilter === 'today'
                    ? 'No sales recorded today yet.'
                    : 'Try a different date or filter.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { setSelectedBill(null); setPrintError(false); }}
        >
          <div
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-black text-foreground text-base">Bill #{selectedBill.billNumber}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(selectedBill.createdAt, 'MMM dd, yyyy · hh:mm a')}
                </p>
              </div>
              <button
                onClick={() => { setSelectedBill(null); setPrintError(false); }}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt preview */}
            <div className="p-4">
              <ReceiptPreview
                cafeName={selectedBill.cafeName}
                tableNumber={selectedBill.tableNumber}
                items={selectedBill.items}
                subtotal={selectedBill.subtotal}
                discount={selectedBill.discount}
                discountType={selectedBill.discountType}
                vatAmount={selectedBill.vatAmount}
                vatRate={selectedBill.vatRate}
                vatEnabled={selectedBill.vatEnabled}
                total={selectedBill.total}
                method={selectedBill.method}
                billNumber={selectedBill.billNumber}
                date={selectedBill.createdAt}
              />
            </div>

            {/* Print button */}
            <div className="px-4 pb-4">
              <button
                onClick={() => handleReprint(selectedBill)}
                disabled={printing}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Printer size={16} />
                {printing ? 'Printing…' : 'Print Bill'}
              </button>
              {printError && (
                <p className="text-center text-xs text-destructive mt-2">
                  Print failed. Check that the printer is connected and try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default BillHistory;
