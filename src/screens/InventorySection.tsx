import { useState } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Save, X, AlertTriangle, Package, BookOpen, BarChart2 } from 'lucide-react';
import { Ingredient, RecipeIngredient } from '@/types/pos';

type InvTab = 'ingredients' | 'recipes' | 'stock';

const CARD = 'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5';
const BTN_PRIMARY = 'flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97]';
const BTN_GHOST = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all';
const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent';
const SELECT = 'w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent';

const UNITS = ['ml', 'g', 'kg', 'L', 'pcs', 'tbsp', 'tsp'];

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

// ── INGREDIENTS TAB ─────────────────────────────────────────────────────────
const IngredientsTab = () => {
  const ingredients = usePOSStore((s) => s.ingredients);
  const addIngredient = usePOSStore((s) => s.addIngredient);
  const updateIngredient = usePOSStore((s) => s.updateIngredient);
  const deleteIngredient = usePOSStore((s) => s.deleteIngredient);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'g', quantity: '', threshold: '' });

  const resetForm = () => { setForm({ name: '', unit: 'g', quantity: '', threshold: '' }); setEditId(null); setShowForm(false); };

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Ingredient name is required');
    const qty = parseFloat(form.quantity);
    const thr = parseFloat(form.threshold);
    if (isNaN(qty) || qty < 0) return toast.error('Enter a valid quantity');
    if (isNaN(thr) || thr < 0) return toast.error('Enter a valid threshold');

    if (editId) {
      updateIngredient(editId, { name: form.name.trim(), unit: form.unit, quantity: qty, threshold: thr });
      toast.success('Ingredient updated');
    } else {
      addIngredient({ name: form.name.trim(), unit: form.unit, quantity: qty, threshold: thr });
      toast.success('Ingredient added');
    }
    resetForm();
  };

  const startEdit = (ing: Ingredient) => {
    setForm({ name: ing.name, unit: ing.unit, quantity: String(ing.quantity), threshold: String(ing.threshold) });
    setEditId(ing.id);
    setShowForm(true);
  };

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
              <input className={INPUT} placeholder="e.g. Milk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
              <select className={SELECT} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Current Quantity</label>
              <input className={INPUT} type="number" min="0" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Low Stock Threshold</label>
              <input className={INPUT} type="number" min="0" placeholder="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
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
        <div className={CARD}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-white/[0.06]">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Unit</th>
                <th className="pb-3 font-medium">Qty</th>
                <th className="pb-3 font-medium">Threshold</th>
                <th className="pb-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 font-medium text-foreground">{ing.name}</td>
                  <td className="py-3 text-muted-foreground">{ing.unit}</td>
                  <td className="py-3 text-foreground">{ing.quantity}</td>
                  <td className="py-3 text-muted-foreground">{ing.threshold}</td>
                  <td className="py-3">
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
              ))}
            </tbody>
          </table>
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

  const startEdit = (menuItemId: string) => {
    const recipe = recipes.find((r) => r.menuItemId === menuItemId);
    setSelectedMenuItemId(menuItemId);
    setRows(recipe ? [...recipe.ingredients.map((i) => ({ ...i }))] : [{ ingredientId: '', quantity: 0 }]);
    setEditingMenuItemId(menuItemId);
  };

  const startNew = () => {
    setSelectedMenuItemId('');
    setRows([{ ingredientId: '', quantity: 0 }]);
    setEditingMenuItemId('__new__');
  };

  const cancelEdit = () => {
    setEditingMenuItemId(null);
    setSelectedMenuItemId('');
    setRows([]);
  };

  const handleSave = () => {
    if (!selectedMenuItemId) return toast.error('Select a menu item');
    const validRows = rows.filter((r) => r.ingredientId && r.quantity > 0);
    if (validRows.length === 0) return toast.error('Add at least one ingredient with quantity > 0');
    saveRecipe(selectedMenuItemId, validRows);
    toast.success('Recipe saved');
    cancelEdit();
  };

  const addRow = () => setRows([...rows, { ingredientId: '', quantity: 0 }]);

  const updateRow = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setRows(rows.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeRow = (index: number) => setRows(rows.filter((_, i) => i !== index));

  const menuItemsWithRecipe = new Set(recipes.map((r) => r.menuItemId));
  const menuItemsWithoutRecipe = menuItems.filter((m) => !menuItemsWithRecipe.has(m.id));

  const getIngredientName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? id;
  const getIngredientUnit = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? '';
  const getMenuItemName = (id: string) => menuItems.find((m) => m.id === id)?.name ?? id;

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

          <button onClick={addRow} className={`${BTN_GHOST} text-xs mb-4`}>
            <Plus size={13} /> Add row
          </button>

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
          {recipes.map((recipe) => (
            <div key={recipe.menuItemId} className={CARD}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">{getMenuItemName(recipe.menuItemId)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</p>
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
                {recipe.ingredients.map((ri, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-muted-foreground">
                    {getIngredientName(ri.ingredientId)} — {ri.quantity} {getIngredientUnit(ri.ingredientId)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── STOCK TAB ────────────────────────────────────────────────────────────────
const StockTab = () => {
  const ingredients = usePOSStore((s) => s.ingredients);

  if (ingredients.length === 0) {
    return (
      <div className={`${CARD} text-center py-12 text-muted-foreground text-sm`}>
        No ingredients found. Add ingredients in the Ingredients tab first.
      </div>
    );
  }

  const sorted = [...ingredients].sort((a, b) => {
    const aLow = a.quantity <= a.threshold;
    const bLow = b.quantity <= b.threshold;
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    return a.name.localeCompare(b.name);
  });

  const lowCount = ingredients.filter((i) => i.quantity <= i.threshold).length;

  return (
    <div className="space-y-4">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span><strong>{lowCount}</strong> ingredient{lowCount !== 1 ? 's are' : ' is'} running low on stock.</span>
        </div>
      )}

      <div className={CARD}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-white/[0.06]">
              <th className="pb-3 font-medium">Ingredient</th>
              <th className="pb-3 font-medium">Remaining</th>
              <th className="pb-3 font-medium">Threshold</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ing) => {
              const isLow = ing.quantity <= ing.threshold;
              return (
                <tr key={ing.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 font-medium text-foreground">{ing.name}</td>
                  <td className={`py-3 font-semibold ${isLow ? 'text-red-400' : 'text-foreground'}`}>
                    {ing.quantity} {ing.unit}
                  </td>
                  <td className="py-3 text-muted-foreground">{ing.threshold} {ing.unit}</td>
                  <td className="py-3">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-medium">
                        <AlertTriangle size={10} /> Low stock
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
    </div>
  );
};
