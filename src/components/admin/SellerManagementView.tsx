"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  ShieldAlert, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  X, 
  Eye, 
  Trash2, 
  RotateCcw, 
  Activity,
  TrendingUp,
  Clock,
  Download,
  CreditCard,
  Tag,
  Package,
  ShoppingBag,
  User,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

export default function SellerManagementView() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Filtering States
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Action States
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  const [selectedSellerProducts, setSelectedSellerProducts] = useState<any[] | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"directory" | "logs">("directory");
  const [statusMessage, setStatusMessage] = useState("");

  // Activity audit logs
  const [logs, setLogs] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, oRes] = await Promise.all([
        supabase.from("sellers").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("*"),
        supabase.from("orders").select("*")
      ]);

      if (sRes.error) console.error("Sellers fetch notice:", sRes.error);
      
      setSellers(sRes.data || []);
      setProducts(pRes.data || []);
      setOrders(oRes.data || []);
    } catch (e: any) {
      console.error("Error loading sellers data:", e);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (sellerId: string, newStatus: string, reason?: string) => {
    setActioningId(sellerId);
    try {
      const payload: any = { 
        account_status: newStatus, 
        status: newStatus.toLowerCase(),
        updated_at: new Date().toISOString() 
      };
      
      if (newStatus === "active" || newStatus === "approved") {
        payload.delete_requested = false;
        payload.delete_date = null;
      }

      if (reason !== undefined) payload.rejection_reason = reason;

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("id", sellerId);

      if (error) throw error;

      setStatusMessage(`✅ Seller status updated to ${newStatus.toUpperCase()}`);
      await loadData();

      // Add activity log
      setLogs((prev) => [
        {
          id: Date.now(),
          seller: sellerId,
          action: `Status changed to ${newStatus.toUpperCase()}${reason ? `: ${reason}` : ''}`,
          timestamp: new Date().toLocaleString(),
          type: newStatus === "active" || newStatus === "approved" ? "success" : "warning"
        },
        ...prev
      ]);

      setShowRejectModal(false);
      setRejectionReason("");
      setTargetSellerId(null);
    } catch (err: any) {
      console.error("Failed to update seller status:", err);
      setStatusMessage(`❌ Error: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleRestoreAccount = async (sellerId: string) => {
    setActioningId(sellerId);
    try {
      const { error } = await supabase
        .from("sellers")
        .update({
          account_status: "Active",
          status: "approved",
          delete_requested: false,
          delete_date: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", sellerId);

      if (error) throw error;
      setStatusMessage(`🔄 Seller account restored to Active status!`);
      await loadData();
    } catch (err: any) {
      console.error("Failed to restore seller account:", err);
      setStatusMessage(`❌ Error restoring account: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteSellerPermanently = async (sellerId: string, sellerName: string) => {
    if (!confirm(`Are you sure you want to permanently delete seller "${sellerName}"? All profile data and listings will be purged.`)) {
      return;
    }

    setActioningId(sellerId);
    try {
      const { error } = await supabase.from("sellers").delete().eq("id", sellerId);
      if (error) throw error;

      setStatusMessage(`🗑️ Seller "${sellerName}" permanently deleted.`);
      if (selectedSeller?.id === sellerId) setSelectedSeller(null);
      await loadData();
    } catch (err: any) {
      console.error("Failed to delete seller:", err);
      setStatusMessage(`❌ Error deleting seller: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleViewProducts = (seller: any) => {
    const sellerProds = products.filter(
      (p) => p.seller_id === seller.id || p.seller_id === seller.seller_id || p.brand === seller.full_name
    );
    setSelectedSellerProducts(sellerProds);
  };

  const handleExportSellersExcel = () => {
    const exportData = filteredSellers.map((s) => ({
      "Seller ID": s.seller_id || s.id,
      "Full Name": s.full_name || s.owner_name || s.business_name,
      "Phone Number": s.phone_number || s.mobile_number,
      "Email": s.email,
      "UPI / PhonePe ID": s.upi_id || s.phonepay_no || "N/A",
      "Pickup Location": s.pickup_location || s.city || "N/A",
      "Category": s.category || "Grocery",
      "Account Status": s.account_status || s.status || "Active",
      "Delete Requested": s.delete_requested ? "Yes (15 Days)" : "No",
      "Registered Date": s.created_at ? new Date(s.created_at).toLocaleDateString() : "N/A"
    }));

    exportCustomDataExcel(exportData, "AsaliSwad_Sellers_Registry");
  };

  const filteredSellers = sellers.filter((s) => {
    const statusVal = (s.account_status || s.status || "active").toLowerCase();
    const categoryVal = (s.category || "grocery").toLowerCase();
    
    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "pending_delete" && (s.delete_requested || statusVal.includes("delete"))) ||
      statusVal === filterStatus.toLowerCase();
      
    const matchesCategory = filterCategory === "all" || categoryVal === filterCategory.toLowerCase();

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (s.full_name || s.owner_name || s.business_name || "").toLowerCase().includes(query) ||
      (s.email || "").toLowerCase().includes(query) ||
      (s.phone_number || s.mobile_number || "").includes(query) ||
      (s.upi_id || s.phonepay_no || "").toLowerCase().includes(query) ||
      (s.pickup_location || s.city || "").toLowerCase().includes(query) ||
      (s.seller_id || s.id || "").toString().includes(query);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const getRemainingDeleteDays = (deleteDateStr?: string) => {
    if (!deleteDateStr) return 15;
    const targetDate = new Date(deleteDateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((targetDate - now) / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Merchant Network</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Seller Management & Profiles</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor merchant accounts, review UPI & Pickup locations, manage categories (Grocery/Snacks/Bakery), and process 15-day deletion requests.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <button
            onClick={handleExportSellersExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Seller Data</span>
          </button>
          
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Sellers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-emerald-600 hover:opacity-80">✕</button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active Sellers</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {sellers.filter((s) => !s.delete_requested && (s.account_status === "Active" || s.status === "approved" || !s.account_status)).length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Pending Delete (15 Days)</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {sellers.filter((s) => s.delete_requested || s.account_status === "Pending Delete" || s.account_status === "PENDING_DELETE").length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Suspended</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {sellers.filter((s) => s.account_status === "Suspended" || s.status === "suspended").length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Registered</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{sellers.length}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        
        {/* Category & Status Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-slate-400 px-3">Category:</span>
            {(["all", "grocery", "snacks", "bakery"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all capitalize ${
                  filterCategory === cat
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <span className="text-[10px] font-black uppercase text-slate-400 px-3">Status:</span>
            {(["all", "active", "pending_delete", "suspended"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                  filterStatus === st
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st === "pending_delete" ? "Pending Delete (15 Days)" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search seller by Name, Phone, UPI ID, Location..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading merchant directory...
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">
            No sellers found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Seller & Category</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">UPI / PhonePe ID</th>
                  <th className="p-4">Pickup Location</th>
                  <th className="p-4">Catalog & Orders</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                {filteredSellers.map((seller) => {
                  const sName = seller.full_name || seller.owner_name || seller.business_name || "Merchant";
                  const sCategory = seller.category || "Grocery";
                  const sUpi = seller.upi_id || seller.phonepay_no || "N/A";
                  const sPickup = seller.pickup_location || seller.city || "Default Warehouse";
                  const isPendingDelete = seller.delete_requested || seller.account_status === "Pending Delete" || seller.account_status === "PENDING_DELETE";
                  const daysLeft = isPendingDelete ? getRemainingDeleteDays(seller.delete_date) : 15;

                  const sellerProdsCount = products.filter(p => p.seller_id === seller.id || p.seller_id === seller.seller_id || p.brand === sName).length;
                  const sellerOrdersCount = orders.filter(o => o.seller_id === seller.id || o.seller_id === seller.seller_id).length;

                  return (
                    <tr key={seller.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                            {seller.profile_photo ? (
                              <img src={seller.profile_photo} alt={sName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{sName[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white">{sName}</p>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 mt-0.5">
                              {sCategory}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{seller.phone_number || seller.mobile_number || "—"}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{seller.email || "—"}</span>
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{sUpi}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{sPickup}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] space-y-0.5">
                          <p className="text-slate-600 dark:text-slate-300 font-bold">
                            <Package className="w-3 h-3 inline mr-1 text-slate-400" />
                            {sellerProdsCount} Products
                          </p>
                          <p className="text-slate-400">
                            <ShoppingBag className="w-3 h-3 inline mr-1 text-slate-400" />
                            {sellerOrdersCount} Orders
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        {isPendingDelete ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300">
                              <Clock className="w-3 h-3 animate-pulse" />
                              Pending Delete
                            </span>
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                              ⌛ {daysLeft} Days Countdown
                            </p>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            (seller.account_status === "Active" || seller.status === "approved" || !seller.account_status)
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (seller.account_status === "Active" || seller.status === "approved" || !seller.account_status) ? "bg-emerald-500" : "bg-rose-500"
                            }`} />
                            {seller.account_status || seller.status || "Active"}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right pr-6 space-x-1.5">
                        <button
                          onClick={() => setSelectedSeller(seller)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                          title="View Full Seller Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleViewProducts(seller)}
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                          title="View Products Catalog"
                        >
                          <Package className="w-4 h-4" />
                        </button>

                        {isPendingDelete ? (
                          <button
                            onClick={() => handleRestoreAccount(seller.id)}
                            disabled={actioningId === seller.id}
                            className="p-2 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
                            title="Restore Seller Account"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(seller.id, seller.account_status === "Suspended" ? "Active" : "Suspended")}
                            disabled={actioningId === seller.id}
                            className={`p-2 rounded-xl transition-colors ${
                              seller.account_status === "Suspended"
                                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            }`}
                            title={seller.account_status === "Suspended" ? "Re-activate Seller" : "Suspend Seller"}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSellerPermanently(seller.id, sName)}
                          disabled={actioningId === seller.id}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                          title="Permanently Delete Seller"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔮 SELLER PROFILE MODAL */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                  {(selectedSeller.full_name || selectedSeller.owner_name || "M")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedSeller.full_name || selectedSeller.owner_name || selectedSeller.business_name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">
                    Category: {selectedSeller.category || "Grocery"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSeller(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Phone Number</span>
                  <p className="text-slate-900 dark:text-white mt-0.5">{selectedSeller.phone_number || selectedSeller.mobile_number || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Email Address</span>
                  <p className="text-slate-900 dark:text-white mt-0.5">{selectedSeller.email || "N/A"}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                    PhonePe / UPI ID
                  </span>
                  <p className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {selectedSeller.upi_id || selectedSeller.phonepay_no || "Not configured"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Pickup Location
                  </span>
                  <p className="text-slate-900 dark:text-white mt-1">
                    {selectedSeller.pickup_location || selectedSeller.city || "Standard pickup warehouse"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-300">
                <span className="text-[10px] uppercase font-black">GST Document Status</span>
                <p className="text-xs font-bold mt-0.5">
                  ✅ GST Not Required in this system architecture. Fast instant seller onboarding enabled.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSeller(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📦 SELLER PRODUCTS MODAL */}
      {selectedSellerProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Seller Catalog Products ({selectedSellerProducts.length})
              </h3>
              <button
                onClick={() => setSelectedSellerProducts(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {selectedSellerProducts.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  No products cataloged by this seller yet.
                </div>
              ) : (
                selectedSellerProducts.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                    <div>
                      <p className="text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">₹{p.price} • Stock: {p.stock || 0} units</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">
                      Cataloged
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
