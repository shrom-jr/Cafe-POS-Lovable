import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { POSProvider } from "@/context/POSContext";
import TableOverview from "@/screens/TableOverview";
import OrderScreen from "@/screens/OrderScreen";
import BillingScreen from "@/screens/BillingScreen";
import PaymentScreen from "@/screens/PaymentScreen";
import BillHistory from "@/screens/BillHistory";
import AdminPanel from "@/screens/AdminPanel";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <POSProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TableOverview />} />
            <Route path="/order/:tableId" element={<OrderScreen />} />
            <Route path="/billing/:tableId" element={<BillingScreen />} />
            <Route path="/payment/:tableId" element={<PaymentScreen />} />
            <Route path="/history" element={<BillHistory />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </POSProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
