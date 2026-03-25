import { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import TableOverview from '@/screens/TableOverview';
import OrderScreen from '@/screens/OrderScreen';
import ReviewScreen from '@/screens/ReviewScreen';
import PaymentScreen from '@/screens/PaymentScreen';
import BillHistory from '@/screens/BillHistory';
import AdminPanel from '@/screens/AdminPanel';
import NotFound from './pages/NotFound.tsx';

const App = () => {
  const [printBlocked, setPrintBlocked] = useState(false);

  useEffect(() => {
    const handler = () => setPrintBlocked(true);
    window.addEventListener('print-blocked', handler);
    return () => window.removeEventListener('print-blocked', handler);
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <SonnerToaster position="top-right" richColors />

      {printBlocked && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg z-50 text-sm font-semibold whitespace-nowrap">
          Enable popups to print receipt
        </div>
      )}

      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<TableOverview />} />
          <Route path="/order/:tableId" element={<OrderScreen />} />
          <Route path="/review/:tableId" element={<ReviewScreen />} />
          {/* UNUSED ROUTE - DO NOT USE */}
          <Route path="/payment/:tableId" element={<PaymentScreen />} />
          <Route path="/history" element={<BillHistory />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
