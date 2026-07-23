"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Clock, 
  Search, 
  Download, 
  ArrowRight, 
  Trash2, 
  RefreshCw,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Calendar
} from "lucide-react";
import { exportOrdersExcel } from "@/utils/excelExport";

export default function PreOrdersView() {
  const [loading, setLoading] = useState(true);
  const [preOrders, setPreOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actioningId, setActioningId] = useState<number | string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const loadPreOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_status", "PRE_ORDER")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPreOrders(data || []);
    } catch (e: any) {
      console.error("Error loading pre-orders:", e);
      setPreOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreOrders();
  }, []);

  const handleConvertToRegularOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to convert this Pre-Order into a regular dispatch order?")) return;

    setActioningId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: "PENDING" })
        .eq("id", orderId);

      if (error) throw error;
      setStatusMessage(`✅ Order #${orderId} converted to regular order.`);
      loadPreOrders();
    } catch (e: any) {
      console.error("Error converting pre-order:", e);
      setStatusMessage(`❌ Error converting pre-order: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleDeletePreOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to permanently delete this pre-order record?")) return;

    setActioningId(orderId);
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      setStatusMessage(`🗑️ Pre-order #${orderId} deleted.`);
      loadPreOrders();
    } catch (e: any) {
      console.error("Error deleting pre-order:", e);
      setStatusMessage(`❌ Error deleting pre-order: ${e.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const filteredOrders = preOrders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      (order.customer_name || "").toLowerCase().includes(query) ||
      (order.phone || "").toLowerCase().includes(query) ||
      (order.product_details || "").toLowerCase().includes(query) ||
      (order.id?.toString() || "").includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            <span>Pre-Order Reservations Hub</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Advance Reservations & Backorders
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage customer pre-orders and convert them into active dispatches when stock arrives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportOrdersExcel(filteredOrders, true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Pre-Orders Excel</span>
          </button>
          <button
            onClick={loadPreOrders}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-amber-600 hover:opacity-80">✕</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pre-orders by Customer Name, Phone, Product details, or Order ID..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Loading active pre-orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No Pre-Orders Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no active pre-orders reserved by customers matching your query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => (
            <div 
              key={order.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:border-amber-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-black text-[10px] uppercase tracking-wider">
                    Pre-Order #{order.id}
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{order.customer_name || 'Guest Customer'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{order.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{order.address || 'No address provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Reserved on: {new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-1">Reserved Items</p>
                  <p className="line-clamp-3">{order.product_details || 'Standard Pre-order Batch'}</p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleDeletePreOrder(order.id)}
                  disabled={actioningId === order.id}
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                  title="Delete Pre-order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleConvertToRegularOrder(order.id)}
                  disabled={actioningId === order.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {actioningId === order.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Convert to Active Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
