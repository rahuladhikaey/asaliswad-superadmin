"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
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
  X
} from "lucide-react";

export default function SuperAdminSellersPage() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadSellers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });

      setSellers(data || []);
    } catch (e) {
      console.error("Error fetching sellers:", e);
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
      const payload: any = { status: newStatus };
      if (reason) payload.rejection_reason = reason;

      const { error } = await supabase
        .from("sellers")
        .update(payload)
        .eq("id", sellerId);

      if (error) throw error;

      setSellers(sellers.map(s => s.id === sellerId ? { ...s, ...payload } : s));
      if (selectedSeller && selectedSeller.id === sellerId) {
        setSelectedSeller({ ...selectedSeller, ...payload });
      }
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (err: any) {
      alert(err.message || "Failed to update seller status.");
    }
    setActioningId(null);
  };

  const filteredSellers = sellers.filter(s => {
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const matchesSearch = 
      s.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Seller Management & Verification</h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Review pending merchant applications, approve sellers, or manage account suspensions.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
          {["all", "pending", "approved", "rejected", "suspended"].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                filterStatus === st
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st} ({sellers.filter(s => st === "all" || s.status === st).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search business, owner, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none"
          />
        </div>
      </div>

      {/* Sellers List Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-600"></div>
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Building2 size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
          <h3 className="text-base font-black">No Sellers Found</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">No merchant registrations match your current filter.</p>
        </div>
      ) : (
        <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black text-slate-400">
                  <th className="pb-3">Business Name</th>
                  <th className="pb-3">Owner / Contact</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSellers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-4 font-black text-slate-900 dark:text-white">
                      <div>{s.business_name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">Joined: {new Date(s.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="py-4">
                      <div>{s.owner_name}</div>
                      <div className="text-slate-400 text-[11px]">{s.email} | {s.mobile_number}</div>
                    </td>
                    <td className="py-4 text-slate-500">
                      {s.city}, {s.state} ({s.pincode})
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        s.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        s.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                        s.status === 'suspended' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(s.id, 'approved')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase shadow-md hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSeller(s);
                                setShowRejectModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-black uppercase shadow-md hover:bg-rose-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'suspended')}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-black uppercase shadow-md hover:bg-amber-700"
                          >
                            Suspend
                          </button>
                        )}
                        {s.status === 'suspended' && (
                          <button
                            onClick={() => handleUpdateStatus(s.id, 'approved')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase shadow-md hover:bg-emerald-700"
                          >
                            Re-Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl space-y-4">
            <h2 className="text-lg font-black">Reject Seller Registration</h2>
            <p className="text-xs font-bold text-slate-500">
              Provide a rejection reason for <span className="text-slate-900 dark:text-white font-black">{selectedSeller.business_name}</span>.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Incomplete business address or invalid contact info."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-4 text-xs font-bold outline-none"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 h-12 rounded-2xl border border-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedSeller.id, 'rejected', rejectionReason)}
                className="flex-1 h-12 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
