import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useTables } from '@/hooks/useTables';
import { useOrders } from '@/hooks/useOrders';
import TableCard from '@/components/tables/TableCard';
import AppLayout from '@/components/ui/AppLayout';
import { CafeTable } from '@/types/pos';

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const colorMap = {
  success: { dot: 'bg-success', text: 'text-success', bg: 'bg-success/10' },
  warning: { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning/10' },
  danger:  { dot: 'bg-danger',  text: 'text-danger',  bg: 'bg-danger/10'  },
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

const TableOverview = () => {
  const { tables } = useTables();
  const { orders } = useOrders();
  const settings = usePOSStore((s) => s.settings);
  const navigate = useNavigate();
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
    active:    tables.filter((t) => t.status === 'occupied').length,
    billing:   tables.filter((t) => t.status === 'billing').length,
  }), [tables]);

  const handleTableClick = (table: CafeTable) => {
    navigate(`/order/${table.id}`);
  };

  const headerRight = (
    <>
      <div className="flex items-center gap-2">
        <StatusPill label="Available" count={counts.available} color="success" />
        <StatusPill label="Active"    count={counts.active}    color="warning" />
        <StatusPill label="Billing"   count={counts.billing}   color="danger"  />
      </div>
      <div className="h-6 w-px bg-white/10" />
      <span className="font-mono text-sm font-semibold text-muted-foreground tabular-nums min-w-[76px] text-right">
        {clock}
      </span>
    </>
  );

  return (
    <AppLayout title={settings.cafeName || 'Café Brew'} headerRight={headerRight}>
      <div className="flex-1 overflow-y-auto p-6">
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
      </div>
    </AppLayout>
  );
};

export default TableOverview;
