# Café POS - Replit Project

## Overview
A professional Café Point of Sale (POS) system built with React, TypeScript, and Vite. The app is a fully client-side single-page application with no backend server.

## Architecture
- **Frontend only**: Pure React SPA, no backend
- **State management**: React Context API (`POSContext`) + localStorage for persistence
- **Routing**: React Router v6
- **UI**: shadcn/ui components with Tailwind CSS
- **PWA**: Configured as a Progressive Web App via vite-plugin-pwa

## Key Screens
- `/` — Table Overview (list of café tables and their status)
- `/order/:tableId` — Order Screen (add/remove items for a table)
- `/billing/:tableId` — Billing Screen
- `/payment/:tableId` — Payment Screen
- `/history` — Bill History
- `/admin` — Admin Panel

## Running the App
The app runs on port 5000 via `npm run dev`.

## Tech Stack
- React 18 + TypeScript
- Vite 5 with @vitejs/plugin-react-swc
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- TanStack Query v5
- React Router v6
- vite-plugin-pwa

## Notes
- Migrated from Lovable to Replit — removed `lovable-tagger` plugin from vite.config.ts
- Server configured with `host: "0.0.0.0"` and `port: 5000` for Replit compatibility
- `allowedHosts: true` set for Replit's proxied preview pane
