import { useNavigate } from 'react-router-dom';
import { usePOS } from '@/context/POSContext';
import TableCard from '@/components/pos/TableCard';
import Navigation from '@/components/pos/Navigation';
import { TopBar } from '@/components/pos/Navigation';

const TableOverview = () => {
  const { tables } = usePOS();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Tables" />
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tables
            .sort((a, b) => a.number - b.number)
            .map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => navigate(`/order/${table.id}`)}
              />
            ))}
        </div>
        {tables.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <p>No tables configured.</p>
            <p className="text-sm mt-1">Go to Admin → Tables to add tables.</p>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default TableOverview;
