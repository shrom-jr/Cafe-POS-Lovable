# Café POS - Replit Project

## Overview
A professional Café Point of Sale (POS) system built with React, TypeScript, Vite, Tailwind CSS, and Zustand. Fully client-side single-page application — no backend.

## Architecture
- **Frontend only**: Pure React SPA, no backend
- **State management**: Zustand (`src/store/usePOSStore.ts`) with localStorage persistence via `src/storage/db.ts`
- **Routing**: React Router v6
- **UI**: shadcn/ui components + custom Tailwind CSS dark café theme
- **Sound**: Web Audio API synthetic sounds in `src/utils/sounds.ts`

## Project Structure

```
src/
  store/
    usePOSStore.ts        ← Zustand global store (all state + actions)
  hooks/
    useOrders.ts          ← Order store selectors/actions (incl. clearOrder, addPayment)
    useTables.ts          ← Table store selectors/actions
    use-mobile.tsx        ← Mobile detection hook
    use-toast.ts          ← Toast notification hook
  components/
    ui/                   ← shadcn/ui + Navigation, TopBar
    tables/               ← TableCard (timer, item count, running total)
    orders/               ← MenuItemCard (qty badge, flash anim), OrderPanel (Clear + Repeat)
    payment/              ← QRDisplay component
    ReceiptPreview.tsx    ← Polished receipt card (used in BillHistory + AdminPanel)
  screens/
    TableOverview.tsx     ← / (all tables → /order/:tableId)
    OrderScreen.tsx       ← /order/:tableId (calculates bill, navigates directly to payment)
    PaymentScreen.tsx     ← /payment/:tableId (reads all financials from nav state)
    BillHistory.tsx       ← /history
    AdminPanel.tsx        ← /admin (PIN-protected)
  types/
    pos.ts                ← All TypeScript types (Payment includes vatAmount/vatRate/vatMode/vatEnabled)
  storage/
    db.ts                 ← localStorage helpers + seed data
  utils/
    sounds.ts             ← Web Audio API: playClick, playSuccess, playError
    printer.ts            ← Bluetooth thermal printer utility
    calcBill.ts           ← Shared bill calculation (subtotal, discount, VAT, total)
```

## Payment Flow
**Order Screen → Payment Screen** (BillingScreen removed)
1. Cashier adds items in OrderScreen
2. Taps Pay → `calcBill()` computes subtotal, discountAmount, vatAmount, total
3. Navigates to `/payment/:tableId` with full financial state in `location.state`
4. PaymentScreen reads all values from nav state (no recalculation)
5. On confirm: saves Payment record, resets table, shows success

## VAT System
- `vatEnabled` (bool), `vatRate` (default 0.13 = 13%), `vatMode` ('excluded'|'included')
- Stored in `Settings` type; defaults always merged in `db.getSettings()`
- `calcBill()` in `src/utils/calcBill.ts` is the single source of truth
- All Payment records store `vatAmount`, `vatRate`, `vatMode`, `vatEnabled` (optional for old records)

## Features

### Tables
- Table number, status badge (Available/Active) with green/yellow colors
- Live timer since order start, item count, running total
- All table clicks navigate to Order Screen

### Order Screen
- Instant item add with click sound + flash animation
- Qty badge on MenuItemCards
- "Clear Order" button — clears all items, resets table
- "Repeat Last Order" button — re-adds items from last payment for this table
- Pay button → calculates bill using shared utility → navigates directly to Payment

### Payment Screen
- Cash / eSewa / Khalti / Fonepay / custom wallet support
- QR code display for digital wallets
- VAT display (if enabled in settings)
- Discount display (from nav state)
- Bluetooth thermal printer support

### Bill History
- Expandable receipt view per payment (ReceiptPreview component)
- VAT shown on historical records that have vatEnabled
- Reprint receipt button if printer connected
- Filter by today/all + search + method filter

### Admin Panel
- PIN-protected settings
- Menu item and category management
- Bill design preview (ReceiptPreview with sample data)
- Wallet QR image upload
- Data export/import (JSON backup)
- Sales chart

## Running the App
Port 5000 via `npm run dev`. Server: `host: "0.0.0.0"`, `allowedHosts: true`.

## Tech Stack
- React 18 + TypeScript
- Vite 5 + @vitejs/plugin-react-swc
- Tailwind CSS + shadcn/ui (Radix UI)
- **Zustand** (global state)
- React Router v6
- date-fns, lucide-react, recharts, qrcode.react
