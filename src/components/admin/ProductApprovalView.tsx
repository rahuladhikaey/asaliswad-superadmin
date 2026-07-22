"use client";

import { useState, useEffect } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  EyeOff, 
  Eye, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  AlertCircle
} from "lucide-react";

export default function ProductApprovalView() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"pending" | "approved" | "hidden" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | number | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleUpdateProductStatus = async (productId: string | number, updates: any) => {
    setActioningId(productId);
    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId);

      if (error) throw error;

      setProducts(products.map(p => p.id === productId ? { ...p, ...updates } : p));
      if (selectedProduct?.id === productId) {
        setSelectedProduct({ ...selectedProduct, ...updates });
      }
    } catch (err: any) {
      alert(err.message || "Failed to update product.");
    }
    setActioningId(null);
  };

  const handleDeleteProduct = async (productId: string | number, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;

    setActioningId(productId);
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      if (selectedProduct?.id === productId) setSelectedProduct(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete product.");
    }
    setActioningId(null);
  };

  const filteredProducts = products.filter(p => {
    let matchesTab = true;
    if (filterTab === "pending") matchesTab = p.approval_status === "pending" || p.is_approved === false;
    else if (filterTab === "approved") matchesTab = p.is_active !== false && (p.approval_status === "approved" || p.is_approved === true || !p.approval_status);
    else if (filterTab === "hidden") matchesTab = p.is_active === false;

    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Product Moderation</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Product Approvals & Image Review</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Approve seller products, inspect quality & images, hide non-compliant listings, or remove duplicate products.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {(["pending", "approved", "hidden", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
                filterTab === tab
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold text-xs">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-slate-400 font-bold text-xs">No products found for selected criteria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(prod => (
            <div key={prod.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative shrink-0">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{prod.brand || "Asali Swad"}</span>
                  <h3 className="font-black text-slate-900 dark:text-white truncate">{prod.name}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">₹{prod.price} {prod.mrp ? <span className="line-through text-slate-400 text-[10px]">₹{prod.mrp}</span> : null}</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Stock: {prod.stock ?? "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  prod.is_active === false ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                }`}>
                  {prod.is_active === false ? "Hidden" : "Active"}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Approve / Reject */}
                  {prod.approval_status === "pending" && (
                    <button
                      onClick={() => handleUpdateProductStatus(prod.id, { approval_status: "approved", is_approved: true, is_active: true })}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      title="Approve Product"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Hide / Show Toggle */}
                  <button
                    onClick={() => handleUpdateProductStatus(prod.id, { is_active: !prod.is_active })}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                    title={prod.is_active ? "Hide Product" : "Show Product"}
                  >
                    {prod.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
