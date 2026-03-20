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
    usePOSStore.ts        ← Zustand global store (all state + actions, incl. clearOrder)
  hooks/
    useOrders.ts          ← Order store selectors/actions (incl. clearOrder, addPayment)
    useTables.ts          ← Table store selectors/actions
    use-mobile.tsx        ← Mobile detection hook
    use-toast.ts          ← Toast notification hook
  components/
    ui/                   ← shadcn/ui + Navigation, TopBar
    tables/               ← TableCard (timer, item count, running total)
    orders/               ← MenuItemCard (qty badge, flash anim), OrderPanel (Clear + Repeat)
    billing/              ← BillPreview (polished, large total)
    payment/              ← QRDisplay component
  screens/
    TableOverview.tsx     ← / (smart nav: billing→payment, else→order)
    OrderScreen.tsx       ← /order/:tableId (sounds, clear order, repeat last)
    BillingScreen.tsx     ← /billing/:tableId (print placeholder)
    PaymentScreen.tsx     ← /payment/:tableId (success sound, print placeholder)
    BillHistory.tsx       ← /history
    AdminPanel.tsx        ← /admin (PIN-protected)
  types/
    pos.ts                ← All TypeScript types
  storage/
    db.ts                 ← localStorage helpers + seed data
  utils/
    sounds.ts             ← Web Audio API: playClick, playSuccess, playError
    printer.ts            ← Bluetooth thermal printer utility
```

## Features (All Phases)

### Phase 1 — Table Cards
- Table number, status badge (Available/Active/Billing) with green/yellow/red colors
- Live timer since order start, item count, running total
- Hover scale + status-colored glow shadow

### Phase 2 — Smart Navigation
- Billing tables → Payment Screen directly
- Free/Active tables → Order Screen

### Phase 3 — Order Screen
- Instant item add with click sound
- Qty badge on MenuItemCards showing count in current order
- Flash animation on item add
- "Clear Order" button — clears all items, resets table to free
- "Repeat Last Order" button — re-adds items from the most recent payment for this table

### Phase 4 — Billing Screen
- Polished BillPreview with large total (Rs. XXX), dashed separators
- Percentage + fixed discount with quick-select buttons
- Print Bill button (placeholder — shows instructions for Bluetooth printer)

### Phase 5 — QR Payment
- Dynamic eSewa QR from ID + amount
- Large amount display, payment method selection
- "Confirm Payment" updates label to selected method

### Phase 6 — Backup & Restore
- Export/Import JSON in AdminPanel

### Phase 7 — Sound & Feedback
- `playClick()` on item add
- `playSuccess()` on payment confirmed
- `playError()` available for error states
- Flash animation on MenuItemCard, slide-up animation on cart panel

### Phase 8 — UI Polish
- Card gradients, soft shadows on all cards
- `hover:scale` + `active:scale` on all interactive elements
- Consistent rounded-2xl, shadow-lg treatment

### Phase 9 — Performance
- Granular Zustand selectors (minimal re-renders)
- `useMemo` for derived data (order qty map, table order data, filtered items)

### Phase 10 — Print Preparation
- Print Bill button in BillingScreen and PaymentScreen
- Calls printer utility if connected, shows setup instructions otherwise

## Running the App
Port 5000 via `npm run dev`. Server: `host: "0.0.0.0"`, `allowedHosts: true`.

## Tech Stack
- React 18 + TypeScript
- Vite 5 + @vitejs/plugin-react-swc
- Tailwind CSS + shadcn/ui (Radix UI)
- **Zustand** (global state)
- React Router v6
- date-fns
- lucide-react icons
