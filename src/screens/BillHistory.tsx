import { useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import Navigation, { TopBar } from '@/components/ui/Navigation';
import ReceiptPreview from '@/components/ReceiptPreview';
import { Search, ChevronDown, ChevronUp, Printer, TrendingUp, Receipt, Calendar } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { printer, formatReceipt } from '@/utils/printer';

type DateFilter = 'today' | 'all';

const BillHistory = () => {
  const payments = usePOSStore((s) => s.payments);
  const settings = usePOSStore((s) => s.settings);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [methodFilter, setMethodFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todayPayments = useMemo(
    () => payments.filter((p) => isToday(new Date(p.createdAt))),
    [payments]
  );

  const baseList = useMemo(
    () => (dateFilter === 'today' ? todayPayments : payments),
    [dateFilter, todayPayments, payments]
  );

  const totalSales = useMemo(
    () => baseList.reduce((s, p) => s + p.total, 0),
    [baseList]
  );

  const filtered = useMemo(() => {
    let list = [...baseList].sort((a, b) => b.createdAt - a.createdAt);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          `table ${p.tableNumber}`.includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          p.billNumber.toString().includes(q)
      );
    }
    if (methodFilter) {
      list = list.filter((p) => p.method === methodFilter);
    }
    return list;
  }, [baseList, search, methodFilter]);

  const handleReprint = async (p: typeof payments[0]) => {
    if (!printer.isConnected) return;
    await printer.print(
      formatReceipt({
        cafeName: p.cafeName,
        tableNumber: p.tableNumber,
        items: p.items,
        subtotal: p.subtotal,
        discount:
          p.discountType === 'percent'
            ? Math.round((p.subtotal * p.discount) / 100)
            : p.discount,
        total: p.total,
        method: p.method,
        date: format(p.createdAt, 'yyyy-MM-dd HH:mm'),
        billNumber: p.billNumber,
      })
    );
  };

  const methodBadgeColor = (method: string) => {
    if (method === 'cash') return 'bg-success/15 text-success';
    if (method === 'esewa') return 'bg-blue-500/15 text-blue-400';
    if (method === 'khalti') return 'bg-purple-500/15 text-purple-400';
    return 'bg-accent/15 text-accent';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Bill History" />
      <div className="max-w-2xl mx-auto">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b border-border">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Receipt size={12} />
              {dateFilter === 'today' ? "Today's Bills" : 'Total Bills'}
            </div>
            <p className="text-2xl font-black text-foreground" data-testid="stat-bill-count">
              {baseList.length}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <TrendingUp size={12} />
              {dateFilter === 'today' ? "Today's Sales" : 'Total Sales'}
            </div>
            <p className="text-xl font-black text-accent" data-testid="stat-total-sales">
              Rs. {totalSales}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
              <Calendar size={12} />
              Today
            </div>
            <p className="text-2xl font-black text-foreground">
              {todayPayments.length}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Today / All toggle */}
          <div className="flex gap-2 bg-secondary rounded-xl p-1">
            <button
              onClick={() => setDateFilter('today')}
              data-testid="button-filter-today"
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                dateFilter === 'today'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('all')}
              data-testid="button-filter-all"
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                dateFilter === 'all'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Search + Method filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search bill, table..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-bills"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              data-testid="select-filter-method"
              className="px-3 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All</option>
              <option value="cash">Cash</option>
              <option value="esewa">eSewa</option>
              <option value="khalti">Khalti</option>
              <option value="fonepay">Fonepay</option>
            </select>
          </div>

          <p className="text-xs text-muted-foreground" data-testid="text-bills-count">
            {filtered.length} {filtered.length === 1 ? 'bill' : 'bills'} found
          </p>

          {/* Bill list */}
          <div className="space-y-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
                data-testid={`bill-card-${p.id}`}
              >
                <button
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="w-full flex items-center px-4 py-3.5 gap-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-black text-accent">#{p.billNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        Table {p.tableNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${methodBadgeColor(p.method)}`}
                      >
                        {p.method}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(p.createdAt, 'MMM dd · hh:mm a')} ·{' '}
                      {p.items.length} item{p.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-accent">Rs. {p.total}</p>
                    {p.discount > 0 && (
                      <p className="text-[10px] text-success">
                        -{p.discountType === 'percent' ? `${p.discount}%` : `Rs. ${p.discount}`} off
                      </p>
                    )}
                  </div>
                  {expandedId === p.id ? (
                    <ChevronUp size={15} className="text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {expandedId === p.id && (
                  <div className="border-t border-border p-4 space-y-3 bg-background/30">
                    <ReceiptPreview
                      cafeName={p.cafeName}
                      tableNumber={p.tableNumber}
                      items={p.items}
                      subtotal={p.subtotal}
                      discount={p.discount}
                      discountType={p.discountType}
                      vatAmount={p.vatAmount}
                      vatRate={p.vatRate}
                      vatEnabled={p.vatEnabled}
                      total={p.total}
                      method={p.method}
                      billNumber={p.billNumber}
                      date={p.createdAt}
                    />
                    {printer.isConnected && (
                      <button
                        onClick={() => handleReprint(p)}
                        className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent/15 hover:text-accent transition-colors"
                      >
                        <Printer size={15} /> Reprint Receipt
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-16">
              <Receipt size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">No bills found</p>
              <p className="text-sm mt-1">
                {dateFilter === 'today'
                  ? 'No sales recorded today yet.'
                  : 'Try a different search or filter.'}
              </p>
            </div>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default BillHistory;
