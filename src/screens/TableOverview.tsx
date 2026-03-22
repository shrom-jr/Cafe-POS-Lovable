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

const TableOverview = () => {
  const { tables } = useTables();
  const { orders } = useOrders();
  const settings = usePOSStore((s) => s.settings);
  const navigate = useNavigate();
  const clock = useClock();
  const [panelHovered, setPanelHovered] = useState(false);

  const tableOrderData = useMemo(() => {
    const map: Record<string, { itemCount: number }> = {};
    orders.forEach((order) => {
      if (order.status === 'active' || order.status === 'billed') {
        const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
        map[order.tableId] = { itemCount };
      }
    });
    return map;
  }, [orders]);

  const counts = useMemo(() => ({
    available: tables.filter((t) => t.status === 'free').length,
    active:    tables.filter((t) => t.status === 'occupied').length,
  }), [tables]);

  const handleTableClick = (table: CafeTable) => {
    navigate(`/order/${table.id}`);
  };

  const headerRight = (
    <>
      <div className="flex items-center gap-2 text-xs font-medium text-white/50">
        <span
          className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0"
          style={{ boxShadow: '0 0 4px 1px hsl(var(--success)/0.45)' }}
        />
        <span>{counts.available} Available</span>
        <span className="text-white/18">•</span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0"
          style={{ boxShadow: '0 0 4px 1px hsl(var(--warning)/0.5)' }}
        />
        <span>{counts.active} Active</span>
      </div>
      <div className="h-5 w-px bg-white/10" />
      <span className="font-mono text-xs font-medium text-white/35 tabular-nums min-w-[76px] text-right">
        {clock}
      </span>
    </>
  );

  return (
    <AppLayout title={settings.cafeName || 'Café Brew'} headerRight={headerRight}>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tables.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-lg">No tables configured.</p>
            <p className="text-sm mt-1">Go to Admin → Tables to add tables.</p>
          </div>
        ) : (
          <div
            onMouseEnter={() => setPanelHovered(true)}
            onMouseLeave={() => setPanelHovered(false)}
            className="rounded-2xl border border-white/[0.08] p-4 transition-all duration-500"
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.032) 0%, rgba(255,255,255,0.01) 55%), rgba(255,255,255,0.04)',
              boxShadow:
                '0 12px 48px -8px rgba(0,0,0,0.6), 0 2px 8px -2px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.08)',
              filter: panelHovered ? 'brightness(1.018)' : 'brightness(1)',
            }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables
                .sort((a, b) => a.number - b.number)
                .map((table) => {
                  const data = tableOrderData[table.id] || { itemCount: 0 };
                  return (
                    <TableCard
                      key={table.id}
                      table={table}
                      itemCount={data.itemCount}
                      onClick={() => handleTableClick(table)}
                    />
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TableOverview;
