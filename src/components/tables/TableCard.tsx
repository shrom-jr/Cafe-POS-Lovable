import { useEffect, useState } from 'react';
import { CafeTable } from '@/types/pos';
import { Clock } from 'lucide-react';

const statusColors = {
  free: 'border-success/50 bg-success/10',
  occupied: 'border-warning/50 bg-warning/10',
  billing: 'border-danger/50 bg-danger/10',
};

const statusDots = {
  free: 'bg-success',
  occupied: 'bg-warning',
  billing: 'bg-danger',
};

const statusLabels = {
  free: 'Available',
  occupied: 'Occupied',
  billing: 'Billing',
};

function useTimer(startTime?: number) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startTime) { setElapsed(''); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return elapsed;
}

interface TableCardProps {
  table: CafeTable;
  onClick: () => void;
}

const TableCard = ({ table, onClick }: TableCardProps) => {
  const timer = useTimer(table.orderStartTime);

  return (
    <button
      onClick={onClick}
      data-testid={`table-card-${table.id}`}
      className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all active:scale-95 ${statusColors[table.status]} hover:pos-glow min-h-[120px]`}
    >
      <div
        className={`absolute top-3 right-3 w-3 h-3 rounded-full ${statusDots[table.status]} ${
          table.status !== 'free' ? 'animate-pulse-soft' : ''
        }`}
      />
      <span className="text-3xl font-bold text-foreground">{table.number}</span>
      <span className="text-xs font-medium text-muted-foreground mt-1">{statusLabels[table.status]}</span>
      {timer && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock size={12} />
          <span className="font-mono">{timer}</span>
        </div>
      )}
    </button>
  );
};

export default TableCard;
