"use client";

import { useState, useEffect } from "react";
import { supabaseB as supabase } from "@shared/utils/supabaseClient";
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
  Clock
} from "lucide-react";

export default function SellerManagementView() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);

  // Modals & Action States
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetSellerId, setTargetSellerId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"directory" | "logs">("directory");

  // Activity audit logs
  const [logs, setLogs] = useState<any[]>([]);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Database query notice for sellers:", error);
      }
      setSellers(data || []);
    } catch (e: any) {
      console.error("Error loading sellers from database:", e);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const handleUpdateStatus = async (sellerId: string, newStatus: string, reason?: string) => {
    setActioningId(sellerId);
    try {
      const payload: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (reason !== undefined) payload.rejection_reason = reason;

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("id", sellerId);

      if (error) {
        console.error("Supabase update seller status error:", error);
        alert(`Failed to update seller status in database: ${error.message}`);
        setActioningId(null);
        return;
      }

      // Reload fresh real data from database
      await loadSellers();

      // Add audit log entry
      const targetSeller = sellers.find(s => s.id === sellerId || s.user_id === sellerId);
      setLogs(prev => [
        {
          id: Date.now(),
          seller: targetSeller?.business_name || "Seller",
          action: `Status changed to ${newStatus.toUpperCase()}${reason ? `: ${reason}` : ''}`,
          timestamp: new Date().toLocaleString(),
          type: newStatus === "approved" ? "success" : newStatus === "rejected" ? "error" : "warning"
        },
        ...prev
      ]);

      setShowRejectModal(false);
      setRejectionReason("");
      setTargetSellerId(null);
    } catch (err: any) {
      console.error("Failed to update seller status:", err);
      alert(err.message || "Failed to update seller status.");
    }
    setActioningId(null);
  };

  const handleDeleteSeller = async (sellerId: string, businessName: string) => {
    if (!confirm(`Are you sure you want to permanently delete seller account "${businessName}"? This action cannot be undone.`)) {
      return;
    }

    setActioningId(sellerId);
    try {
      const { error } = await supabase.from("sellers").delete().eq("id", sellerId);
      if (error) throw error;

      setSellers(sellers.filter(s => s.id !== sellerId));
      if (selectedSeller?.id === sellerId) setSelectedSeller(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete seller record.");
    }
    setActioningId(null);
  };

  const filteredSellers = sellers.filter(s => {
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const matchesSearch = 
      s.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mobile_number?.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const counts = {
    all: sellers.length,
    pending: sellers.filter(s => s.status === "pending").length,
    approved: sellers.filter(s => s.status === "approved").length,
    rejected: sellers.filter(s => s.status === "rejected").length,
    suspended: sellers.filter(s => s.status === "suspended").length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Merchant Directory</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Seller Management & Approvals</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Review onboardings, verify credentials, manage account status, and track seller activity logs.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "directory" 
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Seller Directory ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "logs" 
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Seller Activity Logs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Pending Review</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active Approved</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.approved}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Rejected</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.rejected}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suspended</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.suspended}</p>
        </div>
      </div>

      {activeTab === "directory" ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
              {(["all", "pending", "approved", "rejected", "suspended"] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
                    filterStatus === st 
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {st} ({counts[st]})
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search business, owner, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Sellers Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">
                Loading merchant directory...
              </div>
            ) : filteredSellers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">
                No sellers found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Business & Owner</th>
                      <th className="p-4">Contact Info</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {filteredSellers.map(seller => (
                      <tr key={seller.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0">
                              {seller.business_name?.[0]?.toUpperCase() || "S"}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 dark:text-white">{seller.business_name}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{seller.owner_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{seller.email}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{seller.mobile_number}</span>
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{seller.city || "—"}, {seller.state || "—"} ({seller.pincode})</span>
                          </p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            seller.status === "approved" 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900" 
                              : seller.status === "pending"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                              : seller.status === "rejected"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              seller.status === "approved" ? "bg-emerald-500" : seller.status === "pending" ? "bg-amber-500" : "bg-rose-500"
                            }`} />
                            {seller.status}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedSeller(seller)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {seller.status === "pending" && (
                              <>
                                <button
                                  disabled={actioningId === seller.id}
                                  onClick={() => handleUpdateStatus(seller.id, "approved")}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  disabled={actioningId === seller.id}
                                  onClick={() => { setTargetSellerId(seller.id); setShowRejectModal(true); }}
                                  className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-xs transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {seller.status === "approved" && (
                              <button
                                disabled={actioningId === seller.id}
                                onClick={() => handleUpdateStatus(seller.id, "suspended", "Admin manually suspended account.")}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold text-xs transition-colors"
                              >
                                Suspend
                              </button>
                            )}

                            {seller.status === "suspended" && (
                              <button
                                disabled={actioningId === seller.id}
                                onClick={() => handleUpdateStatus(seller.id, "approved")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs transition-colors"
                              >
                                Reactivate
                              </button>
                            )}

                            <button
                              disabled={actioningId === seller.id}
                              onClick={() => handleDeleteSeller(seller.id, seller.business_name)}
                              className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Delete Seller"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </>
      ) : (
        /* Activity Logs View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Seller Audit & Activity Trail
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map(log => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="font-black text-slate-900 dark:text-white">{log.seller}: </span>
                  <span className="text-slate-600 dark:text-slate-400">{log.action}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Reject Seller Application</h3>
            <p className="text-xs font-bold text-slate-500">
              Provide a clear reason for rejecting this seller. This will be communicated to the merchant.
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Invalid GSTIN or address verification failed."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-xs font-bold outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(""); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim()}
                onClick={() => targetSellerId && handleUpdateStatus(targetSellerId, "rejected", rejectionReason.trim())}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller Profile Drawer */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Merchant Profile</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedSeller.business_name}</h3>
              </div>
              <button onClick={() => setSelectedSeller(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Owner Info</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{selectedSeller.owner_name}</p>
                <p className="text-slate-600 dark:text-slate-300">Email: {selectedSeller.email}</p>
                <p className="text-slate-600 dark:text-slate-300">Phone: {selectedSeller.mobile_number}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400">Addresses</p>
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-400">Pickup:</span> {selectedSeller.pickup_address}</p>
                <p className="text-slate-700 dark:text-slate-300"><span className="text-slate-400">Warehouse:</span> {selectedSeller.warehouse_address || selectedSeller.pickup_address}</p>
                <p className="text-slate-700 dark:text-slate-300">{selectedSeller.city}, {selectedSeller.state} - {selectedSeller.pincode}</p>
              </div>

              {selectedSeller.rejection_reason && (
                <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 border border-rose-200">
                  <p className="text-[10px] font-black uppercase">Rejection Reason</p>
                  <p className="mt-1">{selectedSeller.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
