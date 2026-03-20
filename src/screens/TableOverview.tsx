import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useTables } from '@/hooks/useTables';
import { useOrders } from '@/hooks/useOrders';
import TableCard from '@/components/tables/TableCard';
import Navigation, { TopBar } from '@/components/ui/Navigation';
import { CafeTable } from '@/types/pos';

const TableOverview = () => {
  const { tables } = useTables();
  const { orders } = useOrders();
  const settings = usePOSStore((s) => s.settings);
  const navigate = useNavigate();

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

  const handleTableClick = (table: CafeTable) => {
    navigate(`/order/${table.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title={settings.cafeName || 'Tables'} />
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
        {tables.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-lg">No tables configured.</p>
            <p className="text-sm mt-1">Go to Admin → Tables to add tables.</p>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default TableOverview;
