import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useTables } from '@/hooks/useTables';
import { useOrders } from '@/hooks/useOrders';
import TableCard from '@/components/tables/TableCard';
import { CafeTable } from '@/types/pos';
import { LayoutGrid, History, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutGrid, label: 'Tables' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/admin', icon: Settings, label: 'Admin' },
];

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const TableOverview = () => {
  const { tables } = useTables();
  const { orders } = useOrders();
  const settings = usePOSStore((s) => s.settings);
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useClock();

  const tableOrderData = useMemo(() => {
    const map: Record<string, { itemCount: number; runningTotal: number }> = {};
    orders.forEach((order) => {
      if (order.status === 'active' || order.status === 'billed') {
        const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
        const runningTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
        map[order.tableId] = { itemCount, runningTotal };
      }
    });
    return map;
  }, [orders]);

  const counts = useMemo(() => ({
    available: tables.filter((t) => t.status === 'free').length,
    active: tables.filter((t) => t.status === 'occupied').length,
    billing: tables.filter((t) => t.status === 'billing').length,
  }), [tables]);

  const handleTableClick = (table: CafeTable) => {
    navigate(`/order/${table.id}`);
  };

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 20% 0%, hsl(var(--accent)/0.07) 0%, transparent 60%), linear-gradient(180deg, #0e0f11 0%, #111316 100%)' }}
    >
      {/* Sidebar */}
      <aside className="w-20 flex-shrink-0 flex flex-col items-center py-6 gap-2 border-r border-white/[0.06] bg-black/30 backdrop-blur-xl z-10">
        {/* Logo mark */}
        <div className="mb-4 text-2xl select-none">☕</div>

        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              data-testid={`nav-${label.toLowerCase()}`}
              title={label}
              className={`
                relative flex flex-col items-center justify-center gap-1.5 w-14 py-3 rounded-2xl
                transition-all duration-200 group
                ${active
                  ? 'bg-accent/20 text-accent shadow-[0_0_16px_-4px_hsl(var(--accent)/0.5)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-accent" />
              )}
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/20 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
          {/* Left: branding */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-foreground tracking-tight">
                {settings.cafeName || 'Café Brew'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5 tracking-wide uppercase">
              Live Dashboard
            </p>
          </div>

          {/* Right: status counts + clock */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <StatusPill label="Available" count={counts.available} color="success" />
              <StatusPill label="Active" count={counts.active} color="warning" />
              <StatusPill label="Billing" count={counts.billing} color="danger" />
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="font-mono text-sm font-semibold text-muted-foreground tabular-nums min-w-[80px] text-right">
              {clock}
            </div>
          </div>
        </header>

        {/* Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {tables.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-lg">No tables configured.</p>
              <p className="text-sm mt-1">Go to Admin → Tables to add tables.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables
                .sort((a, b) => a.number - b.number)
                .map((table) => {
                  const data = tableOrderData[table.id] || { itemCount: 0, runningTotal: 0 };
                  return (
                    <TableCard
                      key={table.id}
                      table={table}
                      itemCount={data.itemCount}
                      runningTotal={data.runningTotal}
                      onClick={() => handleTableClick(table)}
                    />
                  );
                })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const colorMap = {
  success: {
    dot: 'bg-success',
    text: 'text-success',
    bg: 'bg-success/10',
  },
  warning: {
    dot: 'bg-warning',
    text: 'text-warning',
    bg: 'bg-warning/10',
  },
  danger: {
    dot: 'bg-danger',
    text: 'text-danger',
    bg: 'bg-danger/10',
  },
};

const StatusPill = ({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: 'success' | 'warning' | 'danger';
}) => {
  const c = colorMap[color];
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`text-xs font-semibold ${c.text}`}>{count}</span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
};

export default TableOverview;
