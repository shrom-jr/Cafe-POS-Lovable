import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import TableOverview from '@/screens/TableOverview';
import OrderScreen from '@/screens/OrderScreen';
import ReviewScreen from '@/screens/ReviewScreen';
import PaymentScreen from '@/screens/PaymentScreen';
import BillHistory from '@/screens/BillHistory';
import AdminPanel from '@/screens/AdminPanel';
import NotFound from './pages/NotFound.tsx';

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TableOverview />} />
        <Route path="/order/:tableId" element={<OrderScreen />} />
        <Route path="/review/:tableId" element={<ReviewScreen />} />
        <Route path="/payment/:tableId" element={<PaymentScreen />} />
        <Route path="/history" element={<BillHistory />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
