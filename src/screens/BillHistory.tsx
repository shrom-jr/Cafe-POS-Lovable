import { useState, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import Navigation from '@/components/pos/Navigation';
import { TopBar } from '@/components/pos/Navigation';
import BillPreview from '@/components/pos/BillPreview';
import { Search, Calendar, Filter, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { format, isToday, isThisWeek, parseISO, startOfDay } from 'date-fns';
import { printer, formatReceipt } from '@/utils/printer';

const BillHistory = () => {
  const { payments, settings } = usePOS();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...payments].sort((a, b) => b.createdAt - a.createdAt);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        `table ${p.tableNumber}`.includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.billNumber.toString().includes(q)
      );
    }
    if (dateFilter) {
      const d = startOfDay(new Date(dateFilter)).getTime();
      list = list.filter(p => {
        const pd = startOfDay(new Date(p.createdAt)).getTime();
        return pd === d;
      });
    }
    if (methodFilter) {
      list = list.filter(p => p.method === methodFilter);
    }
    return list;
  }, [payments, search, dateFilter, methodFilter]);

  const handleReprint = async (p: typeof payments[0]) => {
    if (!printer.isConnected) return;
    await printer.print(formatReceipt({
      cafeName: p.cafeName,
      tableNumber: p.tableNumber,
      items: p.items,
      subtotal: p.subtotal,
      discount: p.discountType === 'percent' ? Math.round(p.subtotal * p.discount / 100) : p.discount,
      total: p.total,
      method: p.method,
      date: format(p.createdAt, 'yyyy-MM-dd HH:mm'),
      billNumber: p.billNumber,
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Bill History" />
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="esewa">eSewa</option>
            <option value="khalti">Khalti</option>
            <option value="fonepay">Fonepay</option>
          </select>
        </div>

        {/* Results */}
        <p className="text-sm text-muted-foreground">{filtered.length} bills found</p>

        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="w-full flex items-center p-4 gap-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">#{p.billNumber}</span>
                    <span className="text-sm text-muted-foreground">Table {p.tableNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(p.createdAt, 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent">Rs. {p.total}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.method}</p>
                </div>
                {expandedId === p.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
              {expandedId === p.id && (
                <div className="border-t border-border p-4 space-y-3">
                  <BillPreview
                    cafeName={p.cafeName}
                    tableNumber={p.tableNumber}
                    items={p.items}
                    subtotal={p.subtotal}
                    discount={p.discount}
                    discountType={p.discountType}
                    total={p.total}
                    method={p.method}
                    billNumber={p.billNumber}
                    date={p.createdAt}
                  />
                  {printer.isConnected && (
                    <button
                      onClick={() => handleReprint(p)}
                      className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors"
                    >
                      <Printer size={16} /> Reprint
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <p>No bills found.</p>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default BillHistory;
