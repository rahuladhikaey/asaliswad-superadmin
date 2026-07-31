"use client";

import { useState, useEffect } from "react";
import { supabaseB as supabase } from "@shared/utils/supabaseClient";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Search, 
  Download, 
  RefreshCw,
  Tag,
  Upload,
  Image as ImageIcon,
  Layers
} from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { exportCategoriesExcel } from "@/utils/excelExport";
import { uploadToSupabaseBucket } from "@shared/services";

const MAIN_CATEGORIES = ["Grocery", "Bakery", "Snacks", "Spices", "Oils & Ghee", "Organic Specials"];

export default function CategoriesShelvesView() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCategoryFilter, setSelectedMainCategoryFilter] = useState("ALL");
  
  // Category Form State
  const [categoryName, setCategoryName] = useState("");
  const [mainCategory, setMainCategory] = useState("Grocery");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSizeNotice, setImageSizeNotice] = useState<string>("");
  
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [actioningId, setActioningId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let cached: any[] = [];
      const storedCats = typeof window !== "undefined" ? localStorage.getItem("asali_swad_categories_cache") : null;
      if (storedCats) {
        try {
          cached = JSON.parse(storedCats);
          if (cached && cached.length > 0) setCategories(cached);
        } catch (e) {
          console.error(e);
        }
      }

      const [cRes, pRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("id, category_id, category")
      ]);

      if (cRes.data && cRes.data.length > 0) {
        setCategories(cRes.data);
        if (typeof window !== "undefined") {
          localStorage.setItem("asali_swad_categories_cache", JSON.stringify(cRes.data));
        }
      } else if (cached && cached.length > 0) {
        // Auto-sync cached categories (e.g. Urad Dal) into Supabase DB if DB is currently empty
        console.log("DB empty, auto-syncing cached categories to Supabase DB...");
        const cleanPayload = cached.map(({ id, ...rest }) => rest);
        const { data: syncedData } = await supabase.from("categories").insert(cleanPayload).select();
        if (syncedData && syncedData.length > 0) {
          setCategories(syncedData);
          if (typeof window !== "undefined") {
            localStorage.setItem("asali_swad_categories_cache", JSON.stringify(syncedData));
          }
        }
      }
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

  // 1:1 Square Blinkit/Zepto-style Image Compression (Target: ~40 KB)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageSizeNotice("Processing 1:1 square crop & compressing to ~40KB...");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Create 1:1 square canvas (300x300 for crisp thumbnail)
        const canvas = document.createElement("canvas");
        const size = 300;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Fill crisp background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, size, size);

          // Center-crop aspect ratio math
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          // Export as JPEG with 0.72 quality (~20-40 KB)
          const base64Square = canvas.toDataURL("image/jpeg", 0.72);
          const approxKb = Math.round((base64Square.length * 0.75) / 1024);

          setImagePreview(base64Square);
          setImageSizeNotice(`✨ Square 1:1 cropped image ready (${approxKb} KB - Perfect Blinkit Size)`);
        }
        setUploadingImage(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    let finalImageUrl = imagePreview || null;
    if (imagePreview && imagePreview.startsWith("data:")) {
      try {
        finalImageUrl = await uploadToSupabaseBucket(
          "categories", 
          imagePreview, 
          `cat_${Date.now()}_${categoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}.jpg`
        );
      } catch (err) {
        console.warn("Category Supabase bucket upload notice:", err);
      }
    }

    const payload = {
      name: categoryName.trim(),
      slug: categoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
      description: mainCategory,
      main_category: mainCategory,
      image_url: finalImageUrl,
      updated_at: new Date().toISOString()
    };

    try {
      let savedCategory: any = null;
      if (editingCategoryId) {
        const response = await fetch("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategoryId, updates: payload })
        });
        const resJson = await response.json();
        if (!resJson.success) throw new Error(resJson.message || "Failed to update category");
        savedCategory = resJson.data || { id: editingCategoryId, ...payload };
        setStatusMessage(`✅ Subcategory "${categoryName.trim()}" updated successfully.`);
      } else {
        const response = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const resJson = await response.json();
        if (!resJson.success) throw new Error(resJson.message || "Failed to save category");
        savedCategory = resJson.data;
        setStatusMessage(`✨ New subcategory "${categoryName.trim()}" created under ${mainCategory}!`);
      }

      loadData();
      setCategoryName("");
      setImagePreview("");
      setImageSizeNotice("");
      setEditingCategoryId(null);
    } catch (e: any) {
      console.error("Error saving category to database:", e);
      alert(`❌ Database Error: ${e.message || "Could not save category"}`);
    }
  };

  const handleEditClick = (category: any) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setMainCategory(category.main_category || "Grocery");
    setImagePreview(category.image_url || "");
    setImageSizeNotice("");
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setImagePreview("");
    setImageSizeNotice("");
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    setActioningId(categoryId);
    try {
      const response = await fetch(`/api/admin/categories?id=${categoryId}`, {
        method: "DELETE"
      });
      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to delete category");

      const updated = categories.filter((c) => c.id !== categoryId);
      setCategories(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("asali_swad_categories_cache", JSON.stringify(updated));
      }
      setStatusMessage(`🗑️ Category deleted.`);
    } catch (e: any) {
      console.error("Error deleting category:", e);
      alert(`❌ Database Error: ${e.message || "Could not delete category"}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleSeedCategories = async () => {
    const defaults = [
      { name: "Spices & Masala", main_category: "Grocery", icon: "🌶️" },
      { name: "Handmade Bori", main_category: "Snacks", icon: "🧆" },
      { name: "Pulses & Dals", main_category: "Grocery", icon: "🥣" },
      { name: "Pure Oils & Ghee", main_category: "Oils & Ghee", icon: "🧴" },
      { name: "Rice & Grains", main_category: "Grocery", icon: "🌾" },
      { name: "Pickles & Chutney", main_category: "Snacks", icon: "🏺" },
      { name: "Fresh Breads & Buns", main_category: "Bakery", icon: "🍞" },
      { name: "Cakes & Pastries", main_category: "Bakery", icon: "🍰" },
      { name: "Sweets & Mithai", main_category: "Bakery", icon: "🍬" },
      { name: "Namkeen & Chips", main_category: "Snacks", icon: "🍿" },
      { name: "Organic Specials", main_category: "Organic Specials", icon: "🌿" }
    ];
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults)
      });
      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message || "Failed to seed categories");
      
      setStatusMessage("✅ 11 Real Shop Categories seeded to production database!");
      loadData();
    } catch (err: any) {
      console.warn("Notice seeding categories:", err);
      alert(`❌ Seeding Error: ${err.message}`);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const matchesSearch = (c.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMain = selectedMainCategoryFilter === "ALL" || (c.main_category || "Grocery").toLowerCase() === selectedMainCategoryFilter.toLowerCase();
    return matchesSearch && matchesMain;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <Tag className="w-4 h-4" />
            <span>Main Categories & Subcategories (Blinkit Style)</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Shop by Category Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create main categories (Grocery, Bakery, Snacks), upload square pictures (~40KB size), and manage subcategories.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSeedCategories}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <span>✨ Seed Real Categories</span>
          </button>
          <button
            onClick={() => exportCategoriesExcel(categories, products)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
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

      {/* Category Creation & Editing Form */}
      <form onSubmit={handleSaveCategory} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>{editingCategoryId ? "Edit Subcategory" : "Create New Subcategory & Square Picture"}</span>
          </h3>
          {editingCategoryId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Category Selector */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-2">Main Category *</label>
            <select
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            >
              {MAIN_CATEGORIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Subcategory Name */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-2">Subcategory Name *</label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Spices & Masala, Namkeen, Bori..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Square Image Upload (Blinkit / Zepto style <= 40KB) */}
          <div>
            <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 block mb-2">
              Square Picture Upload (Blinkit Style ≤40KB)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs cursor-pointer hover:bg-emerald-100/50 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Choose Square Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-emerald-500 shadow-sm bg-white shrink-0">
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(""); setImageSizeNotice(""); }}
                    className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            {imageSizeNotice && (
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{imageSizeNotice}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={uploadingImage}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            {editingCategoryId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{editingCategoryId ? "Save Changes" : "Save Subcategory"}</span>
          </button>
        </div>
      </form>

      {/* Categories Grid View with Main Category Tabs */}
      <div className="space-y-4">
        {/* Main Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <span className="text-xs font-black uppercase text-slate-400 shrink-0 mr-2">Filter Main Category:</span>
          {["ALL", ...MAIN_CATEGORIES].map((mainTab) => (
            <button
              key={mainTab}
              onClick={() => setSelectedMainCategoryFilter(mainTab)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shrink-0 cursor-pointer ${
                selectedMainCategoryFilter.toLowerCase() === mainTab.toLowerCase()
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {mainTab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subcategories..."
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
            No subcategories found. Click "Seed Real Categories" to populate defaults.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((c) => {
              const productCount = products.filter((p) => p.category_id === c.id || p.category === c.name).length;
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-emerald-500/50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Square Picture or Emoji */}
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getCategoryIcon(c.name).value}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/50">
                        {c.main_category || "Grocery"}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{c.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        {productCount} Products Linked
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(c)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
