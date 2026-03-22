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
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: 'hsl(var(--success))', boxShadow: '0 0 6px 2px hsl(142 71% 40% / 0.6)' }}
        />
        <span style={{ color: 'hsl(142 60% 60%)' }}>{counts.available} Available</span>
        <span style={{ color: 'hsl(142 30% 30%)' }}>•</span>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: 'hsl(var(--accent))', boxShadow: '0 0 6px 2px hsl(48 96% 53% / 0.6)' }}
        />
        <span style={{ color: 'hsl(48 80% 65%)' }}>{counts.active} Active</span>
      </div>
      <div className="h-5 w-px" style={{ background: 'hsl(142 40% 25%)' }} />
      <span
        className="font-mono text-xs font-medium tabular-nums min-w-[76px] text-right"
        style={{ color: 'hsl(142 40% 40%)' }}
      >
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
            className="rounded-2xl p-4 transition-all duration-500"
            style={{
              background: 'linear-gradient(180deg, rgba(10,30,18,0.7) 0%, rgba(5,15,10,0.6) 100%)',
              border: '1px solid hsl(142 50% 30% / 0.3)',
              boxShadow: '0 12px 48px -8px rgba(0,0,0,0.7), inset 0 1px 0 0 hsl(142 60% 40% / 0.1)',
              filter: panelHovered ? 'brightness(1.04)' : 'brightness(1)',
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
