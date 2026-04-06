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
