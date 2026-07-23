"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Search, 
  Download, 
  RefreshCw,
  Tag
} from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { exportCategoriesExcel } from "@/utils/excelExport";

export default function CategoriesShelvesView() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("id, category_id")
      ]);

      setCategories(cRes.data || []);
      setProducts(pRes.data || []);
    } catch (e: any) {
      console.error("Error loading categories:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategoryId) {
        const { error } = await supabase
          .from("categories")
          .update({ name: categoryName.trim() })
          .eq("id", editingCategoryId);
        if (error) throw error;
        setStatusMessage(`✅ Category updated successfully.`);
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ name: categoryName.trim() }]);
        if (error) throw error;
        setStatusMessage(`✨ New spice category established!`);
      }
      setCategoryName("");
      setEditingCategoryId(null);
      loadData();
    } catch (e: any) {
      console.error("Error saving category:", e);
      setStatusMessage(`❌ Error: ${e.message}`);
    }
  };

  const handleEditClick = (category: any) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setCategoryName("");
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setActioningId(categoryId);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;
      setStatusMessage(`🗑️ Category deleted.`);
      loadData();
    } catch (e: any) {
      console.error("Error deleting category:", e);
      setStatusMessage(`❌ Error deleting category: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <Tag className="w-4 h-4" />
            <span>Shelves & Taxonomy</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Spice Categories & Taxonomy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize catalog shelves, create spice categories, and assign dynamic visual icons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportCategoriesExcel(categories, products)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Categories Excel</span>
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-emerald-600 hover:opacity-80">✕</button>
        </div>
      )}

      <form onSubmit={handleSaveCategory} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          {editingCategoryId ? "Rename Spice Category" : "Establish New Category"}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g. Whole Spices, Organic Blends, Pure Masalas..."
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {editingCategoryId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingCategoryId ? "Save Changes" : "Create Shelf"}</span>
            </button>
            {editingCategoryId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-xs font-bold text-slate-400">
            No categories found matching your query.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((c) => {
              const productCount = products.filter((p) => p.category_id === c.id || p.category === c.name).length;
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                      {(() => {
                        const icon = getCategoryIcon(c.name);
                        return icon.type === "image" ? (
                          <img src={icon.value} alt={c.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <span>{icon.value}</span>
                        );
                      })()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {productCount} {productCount === 1 ? "Product" : "Products"} cataloged
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(c)}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Category Name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      disabled={actioningId === c.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
