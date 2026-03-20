import { usePOSStore } from '@/store/usePOSStore';

export const useTables = () => {
  const tables = usePOSStore((s) => s.tables);
  const addTable = usePOSStore((s) => s.addTable);
  const updateTable = usePOSStore((s) => s.updateTable);
  const deleteTable = usePOSStore((s) => s.deleteTable);
  const resetTable = usePOSStore((s) => s.resetTable);

  return { tables, addTable, updateTable, deleteTable, resetTable };
};
