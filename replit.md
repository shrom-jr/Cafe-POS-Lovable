# Café POS - Replit Project

## Overview
A professional Café Point of Sale (POS) system built with React, TypeScript, Vite, Tailwind CSS, and Zustand. Fully client-side single-page application — no backend.

## Architecture
- **Frontend only**: Pure React SPA, no backend
- **State management**: Zustand (`src/store/usePOSStore.ts`) with localStorage persistence via `src/storage/db.ts`
- **Routing**: React Router v6
- **UI**: shadcn/ui components + custom Tailwind CSS dark theme
- **PWA**: Progressive Web App via vite-plugin-pwa

## Project Structure

```
src/
  store/
    usePOSStore.ts        ← Zustand global store (all state + actions)
  hooks/
    useOrders.ts          ← Order-related store selectors/actions
    useTables.ts          ← Table-related store selectors/actions
    use-mobile.tsx        ← Mobile detection hook
    use-toast.ts          ← Toast notification hook
  components/
    ui/                   ← shadcn/ui + Navigation, TopBar
    tables/               ← TableCard component
    orders/               ← MenuItemCard, OrderPanel components
    billing/              ← BillPreview component
    payment/              ← QRDisplay component
  screens/
    TableOverview.tsx     ← / (table grid)
    OrderScreen.tsx       ← /order/:tableId
    BillingScreen.tsx     ← /billing/:tableId
    PaymentScreen.tsx     ← /payment/:tableId
    BillHistory.tsx       ← /history
    AdminPanel.tsx        ← /admin
  types/
    pos.ts                ← All TypeScript types
  storage/
    db.ts                 ← localStorage helpers + seed data
  utils/
    printer.ts            ← Bluetooth thermal printer utility
```

## Key Screens
- `/` — Table Overview (café table grid with status)
- `/order/:tableId` — Order Screen (menu + order panel, split view)
- `/billing/:tableId` — Billing Screen (bill preview + discount)
- `/payment/:tableId` — Payment Screen (cash/eSewa/Khalti/Fonepay + QR)
- `/history` — Bill History (searchable, filterable)
- `/admin` — Admin Panel (PIN-protected: dashboard, menu, tables, payments, reports, backup)

## State Management (Zustand)
All state lives in `usePOSStore`:
- `tables` — café table list and statuses
- `categories` / `menuItems` — menu management
- `orders` — active and completed orders
- `payments` — payment records
- `settings` — café info, admin PIN, wallet config, bill design

Changes are immediately persisted to localStorage via the `db` utility.

## Running the App
The app runs on port 5000 via `npm run dev`.

## Tech Stack
- React 18 + TypeScript
- Vite 5 + @vitejs/plugin-react-swc
- Tailwind CSS + shadcn/ui (Radix UI)
- **Zustand** (global state)
- React Router v6
- TanStack Query v5
- vite-plugin-pwa

## Notes
- Migrated from Lovable to Replit
- Migrated from React Context API to Zustand for better performance and scalability
- Removed `lovable-tagger` plugin from vite.config.ts
- Server: `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true`
