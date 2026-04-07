// ── Unit normalization helpers ────────────────────────────────────────────────

// Returns the base unit for any ingredient unit.
// L  → ml  (×1000)
// kg → g   (×1000)
// all others are already base units.
export function baseUnitOf(unit: string): string {
  if (unit === 'L')  return 'ml';
  if (unit === 'kg') return 'g';
  return unit;
}

// Multiplication factor to convert a value to its base unit.
export function toBaseFactor(unit: string): number {
  if (unit === 'L' || unit === 'kg') return 1000;
  return 1;
}

// Normalize quantity + costPerUnit to base units.
// 2 L   → 2000 ml  (costPerUnit ÷ 1000)
// 1 kg  → 1000 g   (costPerUnit ÷ 1000)
// others → unchanged
export function normalizeToBase(
  quantity: number,
  unit: string,
  costPerUnit?: number
): { quantity: number; unit: string; costPerUnit?: number } {
  const factor = toBaseFactor(unit);
  const baseUnit = baseUnitOf(unit);
  return {
    quantity: Math.round(quantity * factor * 1000) / 1000,
    unit: baseUnit,
    costPerUnit:
      costPerUnit !== undefined
        ? Math.round((costPerUnit / factor) * 1_000_000) / 1_000_000
        : undefined,
  };
}

// ── Unit type grouping ────────────────────────────────────────────────────────

export type UnitGroup = 'liquid' | 'solid' | 'count';

// Which logical group a unit belongs to.
export function unitGroupOf(unit: string): UnitGroup {
  const base = baseUnitOf(unit);
  if (base === 'ml') return 'liquid';
  if (base === 'g')  return 'solid';
  return 'count';
}

// Human-readable group label.
export function unitGroupLabel(unit: string): string {
  const g = unitGroupOf(unit);
  if (g === 'liquid') return 'Liquid';
  if (g === 'solid')  return 'Solid';
  return 'Count';
}

// Units allowed when editing an ingredient whose stored base unit is `unit`.
// ml/L  → liquid group → [ml, L]    (interchangeable; both normalize to ml)
// g/kg  → solid group  → [g, kg]    (interchangeable; both normalize to g)
// pcs/tbsp/tsp → locked to themselves (no conversion factor defined)
export function allowedUnitsFor(unit: string): string[] {
  const base = baseUnitOf(unit);
  if (base === 'ml') return ['ml', 'L'];
  if (base === 'g')  return ['g', 'kg'];
  return [base];
}

// Conversion factor between two units in the same group.
// Returns 1 if they are the same or unknown pairing.
export function unitConversionFactor(from: string, to: string): number {
  if (from === to) return 1;
  if (from === 'ml' && to === 'L')  return 0.001;
  if (from === 'L'  && to === 'ml') return 1000;
  if (from === 'g'  && to === 'kg') return 0.001;
  if (from === 'kg' && to === 'g')  return 1000;
  return 1;
}

// ── Friendly display helpers ──────────────────────────────────────────────────

// Returns a human-readable amount string (no unit).
// 1500 ml → "1.5", 2000 g → "2"
export function displayAmount(value: number, unit: string): string {
  if (unit === 'ml' && value >= 1000) return `${+( value / 1000).toFixed(2)}`;
  if (unit === 'g'  && value >= 1000) return `${+(value  / 1000).toFixed(2)}`;
  return `${value}`;
}

// Returns the display unit (upgrades ml→L and g→kg when value is large).
export function displayUnit(value: number, unit: string): string {
  if (unit === 'ml' && value >= 1000) return 'L';
  if (unit === 'g'  && value >= 1000) return 'kg';
  return unit;
}

// Combined: "1500 ml" → "1.5 L", "250 ml" → "250 ml"
export function displayQty(value: number, unit: string): string {
  return `${displayAmount(value, unit)} ${displayUnit(value, unit)}`;
}
