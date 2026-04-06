import { useState, useMemo } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit3, Save, X, AlertTriangle, Package,
  BookOpen, BarChart2, Search, SlidersHorizontal, Clock, TrendingDown,
} from 'lucide-react';
import { Ingredient, RecipeIngredient } from '@/types/pos';
import { format, startOfDay } from 'date-fns';

type InvTab = 'ingredients' | 'recipes' | 'stock';

const CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5';
const BTN_PRIMARY = 'flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97]';
const BTN_GHOST = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all';
const BTN_DANGER = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all';
const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent';
const SELECT = 'w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent';

const UNITS = ['ml', 'g', 'kg', 'L', 'pcs', 'tbsp', 'tsp'];
const CATEGORIES = ['Coffee', 'Dairy', 'Syrup', 'Grain', 'Add-on', 'Produce', 'Other'];

// ── ROOT ─────────────────────────────────────────────────────────────────────
export const InventorySection = () => {
  const [activeTab, setActiveTab] = useState<InvTab>('ingredients');

  const tabs: { id: InvTab; label: string; icon: React.ReactNode }[] = [
    { id: 'ingredients', label: 'Ingredients', icon: <Package size={14} /> },
    { id: 'recipes',     label: 'Recipes',     icon: <BookOpen size={14} /> },
    { id: 'stock',       label: 'Stock',       icon: <BarChart2 size={14} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-accent text-accent-foreground shadow'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ingredients' && <IngredientsTab />}
      {activeTab === 'recipes'     && <RecipesTab />}
      {activeTab === 'stock'       && <StockTab />}
    </div>
  );
};

// ── INGREDIENTS TAB ──────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', unit: 'g', quantity: '', threshold: '', category: '', costPerUnit: '' };

const IngredientsTab = () => {
  const ingredients = usePOSStore((s) => s.ingredients);
  const addIngredient = usePOSStore((s) => s.addIngredient);
  const updateIngredient = usePOSStore((s) => s.updateIngredient);
  const deleteIngredient = usePOSStore((s) => s.deleteIngredient);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const resetForm = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); };

  const f = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Ingredient name is required');
    const qty = parseFloat(form.quantity);
    const thr = parseFloat(form.threshold);
    const cpu = form.costPerUnit !== '' ? parseFloat(form.costPerUnit) : undefined;
    if (isNaN(qty) || qty < 0) return toast.error('Enter a valid quantity');
    if (isNaN(thr) || thr < 0) return toast.error('Enter a valid threshold');
    if (cpu !== undefined && (isNaN(cpu) || cpu < 0)) return toast.error('Enter a valid cost per unit');

    const data = {
      name: form.name.trim(),
      unit: form.unit,
      quantity: qty,
      threshold: thr,
      category: form.category || undefined,
      costPerUnit: cpu,
    };

    if (editId) {
      updateIngredient(editId, data);
      toast.success('Ingredient updated');
    } else {
      addIngredient(data);
      toast.success('Ingredient added');
    }
    resetForm();
  };

  const startEdit = (ing: Ingredient) => {
    setForm({
      name: ing.name,
      unit: ing.unit,
      quantity: String(ing.quantity),
      threshold: String(ing.threshold),
      category: ing.category ?? '',
      costPerUnit: ing.costPerUnit !== undefined ? String(ing.costPerUnit) : '',
    });
    setEditId(ing.id);
    setShowForm(true);
  };

  const grouped = useMemo(() => {
    const map: Record<string, Ingredient[]> = {};
    for (const ing of ingredients) {
      const cat = ing.category || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(ing);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [ingredients]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!showForm && (
          <button className={BTN_PRIMARY} onClick={() => setShowForm(true)}>
            <Plus size={15} /> Add Ingredient
          </button>
        )}
      </div>

      {showForm && (
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-foreground mb-4">{editId ? 'Edit Ingredient' : 'New Ingredient'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <input className={INPUT} placeholder="e.g. Whole Milk" value={form.name} onChange={f('name')} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select className={SELECT} value={form.category} onChange={f('category')}>
                <option value="">— None —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
              <select className={SELECT} value={form.unit} onChange={f('unit')}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Current Quantity</label>
              <input className={INPUT} type="number" min="0" step="any" placeholder="0" value={form.quantity} onChange={f('quantity')} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Low Stock Threshold</label>
              <input className={INPUT} type="number" min="0" step="any" placeholder="0" value={form.threshold} onChange={f('threshold')} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cost per Unit (optional)</label>
              <input className={INPUT} type="number" min="0" step="any" placeholder="e.g. 0.05" value={form.costPerUnit} onChange={f('costPerUnit')} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className={BTN_PRIMARY} onClick={handleSubmit}><Save size={14} /> {editId ? 'Save Changes' : 'Add'}</button>
            <button className={BTN_GHOST} onClick={resetForm}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className={`${CARD} text-center py-12 text-muted-foreground text-sm`}>
          No ingredients yet. Add your first ingredient to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <div key={cat} className={CARD}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-white/[0.06]">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Threshold</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">Cost/Unit</th>
                    <th className="pb-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ing) => {
                    const isLow = ing.quantity <= ing.threshold;
                    return (
                      <tr key={ing.id} className="border-b border-white/[0.04] last:border-0">
                        <td className="py-2.5">
                          <span className={`font-medium ${isLow ? 'text-red-400' : 'text-foreground'}`}>{ing.name}</span>
                        </td>
                        <td className={`py-2.5 font-semibold ${isLow ? 'text-red-400' : 'text-foreground'}`}>
                          {ing.quantity} {ing.unit}
                        </td>
                        <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{ing.threshold} {ing.unit}</td>
                        <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                          {ing.costPerUnit !== undefined ? ing.costPerUnit.toFixed(3) : '—'}
                        </td>
                        <td className="py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => startEdit(ing)} className="p-1.5 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-colors">
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => { deleteIngredient(ing.id); toast.success('Ingredient deleted'); }} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── RECIPES TAB ──────────────────────────────────────────────────────────────
const RecipesTab = () => {
  const menuItems = usePOSStore((s) => s.menuItems);
  const ingredients = usePOSStore((s) => s.ingredients);
  const recipes = usePOSStore((s) => s.recipes);
  const saveRecipe = usePOSStore((s) => s.saveRecipe);
  const deleteRecipe = usePOSStore((s) => s.deleteRecipe);

  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [rows, setRows] = useState<RecipeIngredient[]>([]);
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);

  const getIngredient = (id: string) => ingredients.find((i) => i.id === id);
  const getMenuItemName = (id: string) => menuItems.find((m) => m.id === id)?.name ?? id;

  const calcRecipeCost = (recipeIngredients: RecipeIngredient[]) =>
    recipeIngredients.reduce((sum, ri) => {
      const ing = getIngredient(ri.ingredientId);
      return sum + (ing?.costPerUnit ?? 0) * ri.quantity;
    }, 0);

  const startEdit = (menuItemId: string) => {
    const recipe = recipes.find((r) => r.menuItemId === menuItemId);
    setSelectedMenuItemId(menuItemId);
    setRows(recipe ? recipe.ingredients.map((i) => ({ ...i })) : [{ ingredientId: '', quantity: 0 }]);
    setEditingMenuItemId(menuItemId);
  };

  const startNew = () => {
    setSelectedMenuItemId('');
    setRows([{ ingredientId: '', quantity: 0 }]);
    setEditingMenuItemId('__new__');
  };

  const cancelEdit = () => { setEditingMenuItemId(null); setSelectedMenuItemId(''); setRows([]); };

  const handleSave = () => {
    if (!selectedMenuItemId) return toast.error('Select a menu item');
    const validRows = rows.filter((r) => r.ingredientId && r.quantity > 0);
    if (validRows.length === 0) return toast.error('Add at least one ingredient with quantity > 0');
    saveRecipe(selectedMenuItemId, validRows);
    toast.success('Recipe saved');
    cancelEdit();
  };

  const addRow = () => setRows((prev) => [...prev, { ingredientId: '', quantity: 0 }]);

  const updateRow = (index: number, field: keyof RecipeIngredient, value: string | number) =>
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));

  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const menuItemsWithRecipe = new Set(recipes.map((r) => r.menuItemId));
  const menuItemsWithoutRecipe = menuItems.filter((m) => !menuItemsWithRecipe.has(m.id));

  const editingCost = calcRecipeCost(rows.filter((r) => r.ingredientId && r.quantity > 0));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {editingMenuItemId === null && (
          <button className={BTN_PRIMARY} onClick={startNew} disabled={ingredients.length === 0}>
            <Plus size={15} /> Add Recipe
          </button>
        )}
      </div>

      {ingredients.length === 0 && (
        <div className={`${CARD} text-center py-8 text-muted-foreground text-sm`}>
          Add ingredients first before creating recipes.
        </div>
      )}

      {editingMenuItemId !== null && ingredients.length > 0 && (
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {editingMenuItemId === '__new__' ? 'New Recipe' : `Editing: ${getMenuItemName(selectedMenuItemId)}`}
          </h3>

          {editingMenuItemId === '__new__' && (
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Menu Item</label>
              <select
                className={SELECT}
                value={selectedMenuItemId}
                onChange={(e) => setSelectedMenuItemId(e.target.value)}
              >
                <option value="">Select menu item…</option>
                {menuItemsWithoutRecipe.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2 mb-3">
            {rows.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  className={`${SELECT} flex-1`}
                  value={row.ingredientId}
                  onChange={(e) => updateRow(idx, 'ingredientId', e.target.value)}
                >
                  <option value="">Select ingredient…</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={`${INPUT} w-24`}
                  placeholder="Qty"
                  value={row.quantity || ''}
                  onChange={(e) => updateRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                />
                <button onClick={() => removeRow(idx)} className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow} className={`${BTN_GHOST} text-xs mb-3`}>
            <Plus size={13} /> Add row
          </button>

          {editingCost > 0 && (
            <p className="text-xs text-muted-foreground mb-4">
              Estimated item cost: <span className="text-foreground font-semibold">{editingCost.toFixed(2)}</span>
            </p>
          )}

          <div className="flex gap-2">
            <button className={BTN_PRIMARY} onClick={handleSave}><Save size={14} /> Save Recipe</button>
            <button className={BTN_GHOST} onClick={cancelEdit}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {recipes.length === 0 && editingMenuItemId === null ? (
        <div className={`${CARD} text-center py-12 text-muted-foreground text-sm`}>
          No recipes yet. Create a recipe to link menu items with ingredients.
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => {
            const cost = calcRecipeCost(recipe.ingredients);
            return (
              <div key={recipe.menuItemId} className={CARD}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{getMenuItemName(recipe.menuItemId)}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-muted-foreground">{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</p>
                      {cost > 0 && (
                        <p className="text-xs text-blue-400 font-medium">Cost: {cost.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(recipe.menuItemId)} className="p-1.5 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-colors">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => { deleteRecipe(recipe.menuItemId); toast.success('Recipe deleted'); }} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.map((ri, i) => {
                    const ing = getIngredient(ri.ingredientId);
                    return (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-muted-foreground">
                        {ing?.name ?? ri.ingredientId} — {ri.quantity} {ing?.unit ?? ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── STOCK TAB ────────────────────────────────────────────────────────────────
const StockTab = () => {
  const ingredients = usePOSStore((s) => s.ingredients);
  const stockMovements = usePOSStore((s) => s.stockMovements);
  const adjustStock = usePOSStore((s) => s.adjustStock);

  const [search, setSearch] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjForm, setAdjForm] = useState({ ingredientId: '', change: '', reason: '' });
  const [showHistory, setShowHistory] = useState(false);

  const today = startOfDay(new Date()).getTime();

  const todayUsage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of stockMovements) {
      if (m.timestamp >= today && m.change < 0) {
        map[m.ingredientId] = (map[m.ingredientId] ?? 0) + Math.abs(m.change);
      }
    }
    return map;
  }, [stockMovements, today]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = search
      ? ingredients.filter((i) => i.name.toLowerCase().includes(q) || (i.category ?? '').toLowerCase().includes(q))
      : ingredients;
    return [...list].sort((a, b) => {
      const aLow = a.quantity <= a.threshold;
      const bLow = b.quantity <= b.threshold;
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [ingredients, search]);

  const recentHistory = useMemo(
    () => [...stockMovements].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50),
    [stockMovements]
  );

  const lowCount = ingredients.filter((i) => i.quantity <= i.threshold).length;

  const handleAdjust = () => {
    if (!adjForm.ingredientId) return toast.error('Select an ingredient');
    const change = parseFloat(adjForm.change);
    if (isNaN(change) || change === 0) return toast.error('Enter a non-zero amount');
    if (!adjForm.reason.trim()) return toast.error('Reason is required');
    adjustStock(adjForm.ingredientId, change, adjForm.reason.trim());
    toast.success('Stock adjusted');
    setAdjForm({ ingredientId: '', change: '', reason: '' });
    setShowAdjust(false);
  };

  if (ingredients.length === 0) {
    return (
      <div className={`${CARD} text-center py-12 text-muted-foreground text-sm`}>
        No ingredients found. Add ingredients in the Ingredients tab first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span><strong>{lowCount}</strong> ingredient{lowCount !== 1 ? 's are' : ' is'} running low on stock.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${INPUT} pl-9`}
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={BTN_PRIMARY} onClick={() => setShowAdjust(true)}>
          <SlidersHorizontal size={14} /> Adjust Stock
        </button>
      </div>

      {/* Adjust Modal */}
      {showAdjust && (
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Manual Stock Adjustment</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ingredient</label>
              <select
                className={SELECT}
                value={adjForm.ingredientId}
                onChange={(e) => setAdjForm((p) => ({ ...p, ingredientId: e.target.value }))}
              >
                <option value="">Select…</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name} ({ing.quantity} {ing.unit})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount (+ add / − remove)</label>
              <input
                className={INPUT}
                type="number"
                step="any"
                placeholder="e.g. +500 or -200"
                value={adjForm.change}
                onChange={(e) => setAdjForm((p) => ({ ...p, change: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reason (required)</label>
              <input
                className={INPUT}
                placeholder="e.g. Restocked, Spilled"
                value={adjForm.reason}
                onChange={(e) => setAdjForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className={BTN_PRIMARY} onClick={handleAdjust}><Save size={14} /> Apply</button>
            <button className={BTN_GHOST} onClick={() => setShowAdjust(false)}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className={CARD}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-white/[0.06]">
              <th className="pb-3 font-medium">Ingredient</th>
              <th className="pb-3 font-medium hidden sm:table-cell">Category</th>
              <th className="pb-3 font-medium">Remaining</th>
              <th className="pb-3 font-medium hidden sm:table-cell">Threshold</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">No results for "{search}"</td>
              </tr>
            ) : filtered.map((ing) => {
              const isLow = ing.quantity <= ing.threshold;
              return (
                <tr key={ing.id} className={`border-b border-white/[0.04] last:border-0 ${isLow ? 'bg-red-500/[0.03]' : ''}`}>
                  <td className="py-3">
                    <span className={`font-medium ${isLow ? 'text-red-400' : 'text-foreground'}`}>{ing.name}</span>
                  </td>
                  <td className="py-3 text-muted-foreground text-xs hidden sm:table-cell">{ing.category ?? '—'}</td>
                  <td className={`py-3 font-semibold ${isLow ? 'text-red-400' : 'text-foreground'}`}>
                    {ing.quantity} {ing.unit}
                  </td>
                  <td className="py-3 text-muted-foreground hidden sm:table-cell">{ing.threshold} {ing.unit}</td>
                  <td className="py-3">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-medium">
                        <AlertTriangle size={10} /> Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-400 font-medium">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Today's Usage */}
      {Object.keys(todayUsage).length > 0 && (
        <div className={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={15} className="text-orange-400" />
            <h3 className="text-sm font-semibold text-foreground">Today's Usage</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(todayUsage).map(([ingId, used]) => {
              const ing = ingredients.find((i) => i.id === ingId);
              if (!ing) return null;
              return (
                <div key={ingId} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <span className="text-sm text-foreground">{ing.name}</span>
                  <span className="text-sm font-semibold text-orange-400 ml-2">−{used} {ing.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Movement History */}
      {recentHistory.length > 0 && (
        <div className={CARD}>
          <button
            className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
            onClick={() => setShowHistory((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-muted-foreground" />
              Movement History
              <span className="text-xs text-muted-foreground font-normal">({recentHistory.length} recent)</span>
            </div>
            <span className="text-muted-foreground text-xs">{showHistory ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-1">
              {recentHistory.map((mv) => {
                const ing = ingredients.find((i) => i.id === mv.ingredientId);
                const isPositive = mv.change > 0;
                return (
                  <div key={mv.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <span className={`text-sm font-semibold w-16 flex-shrink-0 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{mv.change} {ing?.unit ?? ''}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{ing?.name ?? mv.ingredientId}</p>
                      <p className="text-xs text-muted-foreground truncate">{mv.source}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(mv.timestamp, 'MMM d, HH:mm')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
