"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiService } from "@/services/apiService";
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
  RefreshCw,
  Unlock
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

  // Custom Admin Action Modal States
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [suspensionReasonText, setSuspensionReasonText] = useState("");
  const [deletionReasonText, setDeletionReasonText] = useState("");

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

    // Supabase Realtime WebSockets for zero-refresh auto-update
    const channel = supabase
      .channel("admin-seller-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sellers" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleFssaiAction = async (sellerId: string, fssaiStatus: string, reason?: string) => {
    setActioningId(sellerId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload: any = { 
        fssai_status: fssaiStatus,
        verified_at: fssaiStatus === 'Verified' ? new Date().toISOString() : null,
        verified_by: user?.id || null,
        updated_at: new Date().toISOString()
      };
      if (reason) payload.fssai_rejection_reason = reason;

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("id", sellerId);

      if (error) throw error;

      setStatusMessage(`✅ FSSAI License status set to ${fssaiStatus}`);
      await loadData();
      if (selectedSeller?.id === sellerId) {
        setSelectedSeller({ ...selectedSeller, ...payload });
      }
    } catch (err: any) {
      console.error("Failed to update FSSAI status:", err);
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

  const handleSuspendSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSellerId || !suspensionReasonText.trim()) return;
    setActioningId(targetSellerId);
    try {
      const res = await apiService.suspendSeller(targetSellerId, suspensionReasonText.trim());
      if (res.error) throw new Error(res.error);
      
      setStatusMessage("✅ Seller suspended successfully.");
      setShowSuspendModal(false);
      setSuspensionReasonText("");
      setTargetSellerId(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to suspend seller.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReactivateSeller = async (sellerId: string) => {
    if (!confirm("Are you sure you want to reactivate this seller?")) return;
    setActioningId(sellerId);
    try {
      const res = await apiService.reactivateSeller(sellerId);
      if (res.error) throw new Error(res.error);
      
      setStatusMessage("✅ Seller reactivated successfully.");
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to reactivate seller.");
    } finally {
      setActioningId(null);
    }
  };

  const handleSoftDeleteSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSellerId || !deletionReasonText.trim()) return;
    setActioningId(targetSellerId);
    try {
      const res = await apiService.softDeleteSeller(targetSellerId, deletionReasonText.trim());
      if (res.error) throw new Error(res.error);
      
      setStatusMessage("✅ Seller soft deleted successfully.");
      setShowSoftDeleteModal(false);
      setDeletionReasonText("");
      setTargetSellerId(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to soft delete seller.");
    } finally {
      setActioningId(null);
    }
  };

  const handlePermanentDeleteSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSellerId || !adminPasswordConfirm) return;
    if (confirmDeleteText !== "DELETE") {
      alert("Please type 'DELETE' to confirm deletion.");
      return;
    }
    setActioningId(targetSellerId);
    try {
      const res = await apiService.permanentDeleteSeller(targetSellerId, adminPasswordConfirm);
      if (res.error) throw new Error(res.error);
      
      setStatusMessage("🗑️ Seller account permanently deleted.");
      setShowPermanentDeleteModal(false);
      setAdminPasswordConfirm("");
      setConfirmDeleteText("");
      setTargetSellerId(null);
      if (selectedSeller?.id === targetSellerId) setSelectedSeller(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to permanently delete seller.");
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
      (filterStatus === "deleted" && (s.is_deleted || statusVal === "deleted")) ||
      statusVal === filterStatus.toLowerCase();
      
    const matchesCategory = filterCategory === "all" || categoryVal === filterCategory.toLowerCase();

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (s.full_name || s.owner_name || s.business_name || "").toLowerCase().includes(query) ||
      (s.email || "").toLowerCase().includes(query) ||
      (s.phone_number || s.mobile_number || "").includes(query) ||
      (s.upi_id || s.phonepay_no || "").toLowerCase().includes(query) ||
      (s.pickup_location || s.city || "").toLowerCase().includes(query) ||
      (s.gstin || "").toLowerCase().includes(query) ||
      (s.fssai_license_number || "").toLowerCase().includes(query) ||
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
            {(["all", "active", "pending_delete", "suspended", "deleted"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                  filterStatus === st
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st === "pending_delete" ? "Pending Delete (15 Days)" : st === "deleted" ? "Deleted" : st}
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

                        {isPendingDelete || seller.is_deleted || seller.account_status === "Deleted" ? (
                          <button
                            onClick={() => handleRestoreAccount(seller.id)}
                            disabled={actioningId === seller.id}
                            className="p-2 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
                            title="Restore Seller Account"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            {seller.account_status === "Suspended" || seller.is_suspended ? (
                              <button
                                onClick={() => handleReactivateSeller(seller.id)}
                                disabled={actioningId === seller.id}
                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Re-activate Seller"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTargetSellerId(seller.id);
                                  setShowSuspendModal(true);
                                }}
                                disabled={actioningId === seller.id}
                                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Suspend Seller"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setTargetSellerId(seller.id);
                                setShowSoftDeleteModal(true);
                              }}
                              disabled={actioningId === seller.id}
                              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                              title="Soft Delete Seller"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setTargetSellerId(seller.id);
                            setShowPermanentDeleteModal(true);
                          }}
                          disabled={actioningId === seller.id}
                          className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 hover:bg-rose-200 transition-colors border border-rose-300"
                          title="Permanently Delete Seller (IRREVERSIBLE)"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  {(selectedSeller.business_name || selectedSeller.full_name || selectedSeller.owner_name || "M")[0].toUpperCase()}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Merchant Profile Details</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedSeller.business_name || selectedSeller.full_name || selectedSeller.owner_name || "Seller"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase">
                      Category: {selectedSeller.category || selectedSeller.business_category || "Grocery"}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      (selectedSeller.account_status === "Active" || selectedSeller.status === "approved" || !selectedSeller.account_status) 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}>
                      Status: {selectedSeller.account_status || selectedSeller.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedSeller(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid Details */}
            <div className="space-y-4 text-xs font-bold">
              {/* Primary Contact & Join Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block mb-0.5">Owner / Contact Name</span>
                  <p className="text-slate-900 dark:text-white font-black text-sm">{selectedSeller.full_name || selectedSeller.owner_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block mb-0.5">Mobile Number</span>
                  <p className="text-slate-900 dark:text-white font-black text-sm">{selectedSeller.mobile_number || selectedSeller.phone_number || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block mb-0.5">Join Date</span>
                  <p className="text-emerald-600 dark:text-emerald-400 font-black">
                    {selectedSeller.created_at ? new Date(selectedSeller.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Email & PhonePe UPI Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black block mb-0.5">Registered Email</span>
                  <p className="text-slate-900 dark:text-white font-mono">{selectedSeller.email || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black flex items-center gap-1 mb-0.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    PhonePe / UPI Number
                  </span>
                  <p className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {selectedSeller.phonepay_number || selectedSeller.phonepay_no || selectedSeller.upi_id || selectedSeller.mobile_number || "Not Configured"}
                  </p>
                </div>
              </div>

              {/* Full Pickup & Warehouse Addresses */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black flex items-center gap-1 mb-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Full Pickup Address
                  </span>
                  <p className="text-slate-900 dark:text-white text-xs font-bold leading-relaxed">
                    {selectedSeller.pickup_address || selectedSeller.pickup_location || selectedSeller.address || selectedSeller.city || "Address not provided"}
                  </p>
                </div>

                {selectedSeller.warehouse_address && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black flex items-center gap-1 mb-0.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      Warehouse Address
                    </span>
                    <p className="text-slate-900 dark:text-white text-xs font-bold leading-relaxed">
                      {selectedSeller.warehouse_address}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-black block">City</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedSeller.city || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-black block">State</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedSeller.state || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase font-black block">Pincode</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{selectedSeller.pincode || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* FSSAI Certification Details */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    FSSAI License & Compliance
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    (selectedSeller.fssai_status === "Verified" || selectedSeller.fssai_certificate_url) ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" :
                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {selectedSeller.fssai_status || "Verified"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-900 dark:text-white">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase">FSSAI License Number</span>
                    <p className="font-mono text-xs font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedSeller.fssai_license_number || selectedSeller.fssai_number || "Registered Merchant"}
                    </p>
                    {selectedSeller.fssai_expiry_date && (
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">Expiry Date: {selectedSeller.fssai_expiry_date}</p>
                    )}
                  </div>
                  
                  {selectedSeller.fssai_certificate_url && (
                    <div className="flex items-center sm:justify-end">
                      <a
                        href={selectedSeller.fssai_certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download FSSAI Document</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSeller(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-md"
              >
                Close Full Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📦 SELLER LIVE PRODUCTS CATALOG MODAL */}
      {selectedSellerProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 md:p-8 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Merchant Live Catalog</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Live Products List ({selectedSellerProducts.length} items)
                </h3>
              </div>
              <button
                onClick={() => setSelectedSellerProducts(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedSellerProducts.length === 0 ? (
                <div className="p-12 text-center text-xs font-bold text-slate-400">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No products cataloged by this seller yet.
                </div>
              ) : (
                selectedSellerProducts.map((p) => {
                  const pImg = p.image_url || p.image || (Array.isArray(p.images) ? p.images[0] : null);
                  const stockNum = Number(p.stock || p.stock_quantity || 0);

                  return (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-bold hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {pImg ? (
                            <img src={pImg} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-sm">{p.name || p.title}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Category: <span className="font-bold text-slate-700 dark:text-slate-300">{p.category || "General"}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                            Price: <span className="text-emerald-600 font-black">₹{p.price}</span>
                            {p.mrp && Number(p.mrp) > Number(p.price) && (
                              <span className="line-through text-slate-400 ml-1.5 font-normal">₹{p.mrp}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          stockNum > 10 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                          stockNum > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                          "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {stockNum > 10 ? `Stock: ${stockNum} units` : stockNum > 0 ? `Low Stock (${stockNum})` : "Out of Stock"}
                        </span>
                        
                        <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase">
                          {p.status || "Live"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔴 SELLER SUSPENSION REASON MODAL */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <form onSubmit={handleSuspendSellerSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Suspend Merchant Account
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspensionReasonText("");
                  setTargetSellerId(null);
                }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Suspension Reason *</label>
              <textarea
                required
                rows={3}
                value={suspensionReasonText}
                onChange={(e) => setSuspensionReasonText(e.target.value)}
                placeholder="Enter the official reason for suspending this seller..."
                className="w-full p-3 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspensionReasonText("");
                  setTargetSellerId(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actioningId !== null}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                {actioningId ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ⚠️ SELLER SOFT DELETION REASON MODAL */}
      {showSoftDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <form onSubmit={handleSoftDeleteSellerSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Soft Delete Merchant Account
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSoftDeleteModal(false);
                  setDeletionReasonText("");
                  setTargetSellerId(null);
                }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Reason for Deletion *</label>
              <textarea
                required
                rows={3}
                value={deletionReasonText}
                onChange={(e) => setDeletionReasonText(e.target.value)}
                placeholder="Enter the reason for deleting this seller account..."
                className="w-full p-3 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSoftDeleteModal(false);
                  setDeletionReasonText("");
                  setTargetSellerId(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actioningId !== null}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                {actioningId ? "Deleting..." : "Confirm Soft Delete"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🛑 SELLER PERMANENT DELETION MODAL (IRREVERSIBLE) */}
      {showPermanentDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <form onSubmit={handlePermanentDeleteSellerSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-rose-600 dark:text-rose-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Permanent Delete Account
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPermanentDeleteModal(false);
                  setAdminPasswordConfirm("");
                  setConfirmDeleteText("");
                  setTargetSellerId(null);
                }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-bold space-y-1">
              <p>⚠️ WARNING: This action is permanent and cannot be undone!</p>
              <p className="font-normal text-[11px] text-rose-600">This will purge all listings, images, inventory, pickup locations, support tickets, settlements, notifications, and auth login sessions from the system.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Super Admin Password *</label>
                <input
                  type="password"
                  required
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Enter your Super Admin password..."
                  className="w-full px-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Type <span className="text-rose-600 font-black">DELETE</span> to confirm *
                </label>
                <input
                  type="text"
                  required
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  placeholder="Type DELETE..."
                  className="w-full px-4 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-rose-500 font-mono text-center tracking-widest text-rose-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermanentDeleteModal(false);
                  setAdminPasswordConfirm("");
                  setConfirmDeleteText("");
                  setTargetSellerId(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actioningId !== null || confirmDeleteText !== "DELETE"}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                {actioningId ? "Permanently Deleting..." : "DELETE PERMANENTLY"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
