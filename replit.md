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
    usePOSStore.ts            ← Zustand global store (all state + actions)
  hooks/
    useOrders.ts              ← Order store selectors/actions
    useTables.ts              ← Table store selectors/actions
    use-mobile.tsx            ← Mobile detection hook
    use-toast.ts              ← Toast notification hook
  components/
    ui/                       ← shadcn/ui + Navigation, TopBar
    tables/                   ← TableCard (timer, item count, running total)
    orders/                   ← MenuItemCard, OrderPanel
    payment/                  ← QRDisplay component
    ThermalReceiptLayout.tsx  ← ONE unified thermal receipt (used by all print portals)
    ReceiptPreview.tsx        ← Admin bill preview (renders ThermalReceiptLayout in a card)
  screens/
    TableOverview.tsx         ← / (all tables)
    OrderScreen.tsx           ← /order/:tableId
    ReviewScreen.tsx          ← /review/:tableId (discount, QR confirm, pay)
    PaymentScreen.tsx         ← /payment/:tableId (reads financials from nav state)
    BillHistory.tsx           ← /history
    AdminPanel.tsx            ← /admin (PIN-protected)
  types/
    pos.ts                    ← All TypeScript types
  storage/
    db.ts                     ← localStorage helpers + seed data
  utils/
    sounds.ts                 ← Web Audio API: playClick, playSuccess, playError
    printer.ts                ← numberToWords() helper only (no Bluetooth)
    print.ts                  ← triggerPrint() — single browser print trigger used everywhere
    calcBill.ts               ← Shared bill calculation (subtotal, discount, VAT, total)
    format.ts                 ← fmt(n) + resolvePaymentLabel()
```

## Print System (Unified)
- **ONE template**: `ThermalReceiptLayout.tsx` — monospace, 80mm thermal receipt format
- **ONE trigger**: `triggerPrint('receipt')` from `src/utils/print.ts`
- **ONE print CSS rule**: `#print-receipt` in `index.css` (no invoice CSS)
- Used as `createPortal` in: PaymentScreen, ReviewScreen, BillHistory
- Used as inline preview in: ReceiptPreview (AdminPanel Company Profile tab)
- **No Bluetooth** — browser print dialog only

## Receipt Layout (Thermal Format)
```
[Centered] Cafe Name / Address / PAN
------
TAX INVOICE
------
Payment Mode | Bill No | Date | Table
SN  Particulars  Qty  Rate  Amt
------
Basic Amount / Discount / Taxable Amount / VAT (if enabled) / Total
------
In word: Rs. XXXX only
Cashier / Time
------
[Centered] Footer
```

## Payment Flow
1. Cashier adds items in OrderScreen
2. Taps Pay → `calcBill()` computes subtotal, discountAmount, vatAmount, total
3. Navigates to `/review/:tableId` (discount controls + QR payment) or `/payment/:tableId` (cash)
4. On confirm: saves Payment record, resets table, shows success screen
5. Auto-triggers `triggerPrint('receipt')` — receipt prints via browser dialog

## VAT System
- `vatEnabled` (bool), `vatRate` (default 0.13 = 13%), `vatMode` ('excluded'|'included')
- Stored in `Settings`; defaults merged in `db.getSettings()`
- `calcBill()` in `src/utils/calcBill.ts` is the single source of truth
- All Payment records store `vatAmount`, `vatRate`, `vatMode`, `vatEnabled`

## Admin Panel Tabs
- **Dashboard** — sales charts
- **Menu** — categories + menu items
- **Tables** — table management
- **Payments** — wallet config (eSewa, Khalti, Fonepay, custom)
- **Company Profile** — café name, address, PAN, footer, bill counter, VAT toggle, logo, bill preview
- **Reports** — revenue reports, CSV export
- **Inventory** — ingredients CRUD, recipes (menu item ↔ ingredients), stock levels with low stock warnings
- **Backup** — JSON export/import

## Inventory System
- **Types**: `Ingredient` (id, name, unit, quantity, threshold) and `Recipe` (menuItemId, ingredients[]) in `src/types/pos.ts`
- **Storage**: `pos_ingredients` and `pos_recipes` keys in localStorage via `src/storage/db.ts`
- **State**: `ingredients` and `recipes` arrays in `usePOSStore.ts`
- **Stock deduction**: Automatically fires in `sendToKitchen()` — deducts ingredient quantities for all unsent items before marking them sent
- **UI**: `src/screens/InventorySection.tsx` — 3 tabs: Ingredients (CRUD), Recipes (link menu items to ingredients), Stock (read-only view with low stock badges)

## Running the App
Port 5000 via `npm run dev`. Server: `host: "0.0.0.0"`, `allowedHosts: true`.

## Tech Stack
- React 18 + TypeScript
- Vite 5 + @vitejs/plugin-react-swc
- Tailwind CSS + shadcn/ui (Radix UI)
- **Zustand** (global state)
- React Router v6
- date-fns, lucide-react, recharts, qrcode.react
