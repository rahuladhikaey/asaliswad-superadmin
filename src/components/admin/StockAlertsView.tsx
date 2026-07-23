"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertTriangle,
  Bell,
  History,
  Package,
  Search,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  User,
  Clock
} from "lucide-react";

export default function StockAlertsView() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [notifyRequests, setNotifyRequests] = useState<any[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"critical" | "notify" | "history">("critical");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load low stock products
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });

      setProducts(pData || []);

      // 2. Load stock notify requests (or local storage fallback)
      const storedNotify = typeof window !== "undefined" ? window.localStorage.getItem("asali-swad-notify-requests") : null;
      if (storedNotify) {
        setNotifyRequests(JSON.parse(storedNotify));
      } else {
        setNotifyRequests([
          {
            id: 1,
            product_name: "Kashmiri Red Chilli Powder 250g",
            customer_email: "anand@example.com",
            requested_at: new Date().toISOString(),
            status: "PENDING"
          }
        ]);
      }

      // 3. Load stock history logs
      const storedHistory = typeof window !== "undefined" ? window.localStorage.getItem("asali-swad-stock-history") : null;
      if (storedHistory) {
        setStockHistory(JSON.parse(storedHistory));
      } else {
        setStockHistory([
          {
            id: 1,
            product_name: "Organic Turmeric Powder",
            change_type: "RESTOCK",
            amount: +50,
            timestamp: new Date().toISOString(),
            user: "Admin"
          }
        ]);
      }
    } catch (e: any) {
      console.error("Error loading stock alerts data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const criticalProducts = products.filter((p) => {
    const stockVal = Number(p.stock || 0);
    const limitVal = Number(p.low_stock_limit || 5);
    return stockVal <= limitVal;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-800 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" />
            <span>Inventory Health & Alerts</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Stock Alerts & Back-In-Stock Requests</h2>
          <p className="text-xs text-rose-100 max-w-xl">
            Monitor low stock thresholds, fulfill customer back-in-stock notifications, and trace inventory restock logs.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("critical")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === "critical" ? "bg-white text-slate-900 shadow-sm" : "text-rose-100 hover:text-white"
              }`}
          >
            Critical Stock ({criticalProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("notify")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === "notify" ? "bg-white text-slate-900 shadow-sm" : "text-rose-100 hover:text-white"
              }`}
          >
            Notify Requests ({notifyRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-rose-100 hover:text-white"
              }`}
          >
            History Log
          </button>
        </div>
      </div>

      {activeTab === "critical" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
              Products Below Minimum Threshold
            </h3>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">Scanning inventory stock levels...</p>
            </div>
          ) : criticalProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">Inventory Healthy!</p>
              <p className="text-xs text-slate-400">All products have stock above their defined minimum threshold limits.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalProducts.map((p) => {
                const stockVal = Number(p.stock || 0);
                const limitVal = Number(p.low_stock_limit || 5);
                const isOutOfStock = stockVal <= 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 ${isOutOfStock ? "border-rose-300 dark:border-rose-900/60" : "border-amber-300 dark:border-amber-900/60"
                      }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isOutOfStock
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          }`}>
                          {isOutOfStock ? "Out of Stock" : "Low Stock Alert"}
                        </span>
                        <span className="text-xs font-mono text-slate-400">SKU: {p.sku || p.id}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h4>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
                        <span className="text-slate-400">Current Units:</span>
                        <span className={`font-black text-sm ${isOutOfStock ? "text-rose-600" : "text-amber-600"}`}>
                          {stockVal} units
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Low Stock Limit:</span>
                        <span>{limitVal} units</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "notify" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Customer Back-In-Stock Notification Requests
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-400">
                  <th className="px-6 py-4">Requested Product</th>
                  <th className="px-6 py-4">Customer Email</th>
                  <th className="px-6 py-4">Requested Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                {notifyRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{req.product_name}</td>
                    <td className="px-6 py-4 flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{req.customer_email}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(req.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>Recent Stock Audit Trail</span>
          </h3>
          <div className="space-y-3">
            {stockHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-white">{item.product_name}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{item.user}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black text-xs">
                  {item.amount > 0 ? `+${item.amount}` : item.amount} Units
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
