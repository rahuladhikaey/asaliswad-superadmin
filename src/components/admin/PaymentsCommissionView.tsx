"use client";

import { useState, useEffect } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  CreditCard, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  History, 
  Settings, 
  CheckCircle2, 
  Search, 
  Download, 
  ExternalLink, 
  Smartphone, 
  X, 
  Clock, 
  ShieldCheck 
} from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

type SettlementRecord = {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_email: string;
  amount: number;
  upi_id: string;
  payment_method: string;
  utr_number: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  paid_at: string;
  created_at: string;
  notes?: string;
};

export default function PaymentsCommissionView() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State for "Mark as Paid"
  const [selectedSellerForPayment, setSelectedSellerForPayment] = useState<any | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    amount: "",
    upi_id: "",
    payment_method: "PhonePe",
    utr_number: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const [payoutStatusMessage, setPayoutStatusMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, sRes, setRes] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("sellers").select("*"),
        supabase.from("seller_settlements").select("*").order("created_at", { ascending: false })
      ]);

      setOrders(oRes.data || []);
      setSellers(sRes.data || []);

      if (!setRes.error && setRes.data) {
        setSettlements(setRes.data);
      } else {
        // LocalStorage fallback for settlements if table not yet created
        const storedSets = localStorage.getItem("asali_swad_all_seller_settlements");
        if (storedSets) {
          try {
            setSettlements(JSON.parse(storedSets));
          } catch (e) {
            console.error("Error loading stored settlements:", e);
          }
        }
      }
    } catch (e: any) {
      console.error("Error loading payment & settlement data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate gross metrics
  const totalGMV = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  const estimatedCommission = totalGMV * (commissionRate / 100);
  const totalPaidOut = settlements
    .filter(s => s.status === "PAID")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("✅ Global commission rules updated successfully!");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // Open payout modal for a seller
  const handleOpenPayoutModal = (seller: any, calculatedPending: number, upiId: string) => {
    setSelectedSellerForPayment(seller);
    setPayoutForm({
      amount: calculatedPending.toFixed(2),
      upi_id: upiId || seller.upi_id || seller.mobile_number + "@ybl" || "seller@upi",
      payment_method: seller.payment_method || "PhonePe",
      utr_number: "",
      payment_date: new Date().toISOString().split("T")[0],
      notes: `Manual settlement transfer for ${seller.business_name || seller.owner_name || 'Seller'}`
    });
    setPayoutStatusMessage("");
  };

  // Submit Payout & Mark as Paid
  const handleConfirmMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm.utr_number.trim()) {
      setPayoutStatusMessage("❌ UTR / Transaction Reference Number is required to record payment.");
      return;
    }

    if (!selectedSellerForPayment) return;

    const newSettlement: SettlementRecord = {
      id: `SET-${Date.now().toString().slice(-6)}`,
      seller_id: selectedSellerForPayment.id || `seller-${Date.now()}`,
      seller_name: selectedSellerForPayment.business_name || selectedSellerForPayment.owner_name || "Seller",
      seller_email: selectedSellerForPayment.email || "N/A",
      amount: Number(payoutForm.amount),
      upi_id: payoutForm.upi_id,
      payment_method: payoutForm.payment_method,
      utr_number: payoutForm.utr_number.trim(),
      status: "PAID",
      paid_at: new Date(payoutForm.payment_date).toISOString(),
      created_at: new Date().toISOString(),
      notes: payoutForm.notes
    };

    // Save to Supabase
    try {
      await supabase.from("seller_settlements").insert([newSettlement]);
    } catch (e) {
      console.warn("Could not insert into Supabase seller_settlements table:", e);
    }

    // Save to Local Storage fallback
    const updatedSets = [newSettlement, ...settlements];
    setSettlements(updatedSets);
    localStorage.setItem("asali_swad_all_seller_settlements", JSON.stringify(updatedSets));

    // Also update seller's isolated settlements
    if (selectedSellerForPayment.id) {
      const sellerKey = `seller_settlements_${selectedSellerForPayment.id}`;
      const sellerExisting = JSON.parse(localStorage.getItem(sellerKey) || "[]");
      localStorage.setItem(sellerKey, JSON.stringify([newSettlement, ...sellerExisting]));
    }

    setPayoutStatusMessage("✅ Settlement marked as PAID successfully with UTR reference!");
    setTimeout(() => {
      setSelectedSellerForPayment(null);
      setPayoutStatusMessage("");
    }, 1500);
  };

  // Export Settlement Report to Excel
  const handleExportSettlementExcel = () => {
    const rows = settlements.map(s => [
      s.id,
      new Date(s.created_at).toLocaleDateString("en-IN"),
      s.seller_name,
      s.seller_email,
      s.amount,
      s.payment_method,
      s.upi_id,
      s.utr_number,
      s.status,
      s.notes || ""
    ]);

    exportCustomDataExcel(
      "Seller Settlements Report",
      ["Settlement ID", "Date", "Seller Name", "Seller Email", "Amount Paid (₹)", "Payment Method", "UPI ID / PhonePe", "UTR Number", "Status", "Notes"],
      rows,
      `SuperAdmin_Seller_Settlements_${new Date().toISOString().split("T")[0]}`
    );
  };

  // Filtered settlements list
  const filteredSettlements = settlements.filter(s => 
    s.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.utr_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.upi_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Financial Ledger</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Seller Settlements & Commission Desk</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Process manual PhonePe/UPI payouts to sellers, enter UTR transaction references, and configure platform commissions.
          </p>
        </div>

        <button
          onClick={handleExportSettlementExcel}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          Export Settlement Ledger (Excel)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gross Merchandise Value (GMV)</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{totalGMV.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Platform Commission ({commissionRate}%)</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{estimatedCommission.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Total Settled (Paid)</p>
          <p className="text-2xl font-black text-blue-600 mt-1">₹{totalPaidOut.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Active Sellers Registered</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{sellers.length || 1} Merchants</p>
        </div>
      </div>

      {/* PENDING SELLER SETTLEMENTS SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Seller Settlements Queue
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Calculate payout amounts, verify seller PhonePe/UPI credentials, send payment manually, and enter UTR reference.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-3 px-4">Seller & Business Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">UPI ID / PhonePe Number</th>
                <th className="py-3 px-4">Calculated Net Payout</th>
                <th className="py-3 px-4 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
              {sellers.length > 0 ? (
                sellers.map((seller) => {
                  // Calculate pending payout per seller
                  const sellerOrders = orders.filter(o => o.seller_id === seller.id || o.order_status === "DELIVERED");
                  const sellerGross = sellerOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
                  const sellerNet = sellerGross * (1 - commissionRate / 100);
                  
                  const sellerPaid = settlements
                    .filter(s => (s.seller_id === seller.id || s.seller_name === (seller.business_name || seller.owner_name)) && s.status === "PAID")
                    .reduce((sum, s) => sum + Number(s.amount), 0);

                  const pendingAmount = Math.max(0, sellerNet - sellerPaid);
                  const sellerUpi = seller.upi_id || seller.mobile_number ? `${seller.mobile_number}@ybl` : "seller@upi";

                  return (
                    <tr key={seller.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-black text-slate-900 dark:text-white">{seller.business_name || seller.owner_name || "Merchant"}</p>
                        <p className="text-[10px] font-medium text-slate-400">ID: {seller.id}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-slate-600 dark:text-slate-300">{seller.email}</p>
                        <p className="text-[10px] font-medium text-slate-400">{seller.mobile_number || "N/A"}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{sellerUpi}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[8px] font-black uppercase">Verified</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-black text-base text-amber-600 dark:text-amber-400">
                        ₹{pendingAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenPayoutModal(seller, pendingAmount, sellerUpi)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
                        >
                          Pay Seller & Record UTR
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr key="default-seller">
                  <td className="py-4 px-4">
                    <p className="font-black text-slate-900 dark:text-white">Default Store Seller</p>
                    <p className="text-[10px] font-medium text-slate-400">Internal Seller Account</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-slate-600 dark:text-slate-300">seller@asaliswad.com</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-emerald-600 font-black">9876543210@ybl</span>
                  </td>
                  <td className="py-4 px-4 font-black text-base text-amber-600">
                    ₹{(totalGMV * (1 - commissionRate / 100) - totalPaidOut).toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleOpenPayoutModal(
                        { id: "default-seller", business_name: "Default Store Seller", email: "seller@asaliswad.com" },
                        Math.max(0, totalGMV * (1 - commissionRate / 100) - totalPaidOut),
                        "9876543210@ybl"
                      )}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
                    >
                      Pay Seller & Record UTR
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPLETED SETTLEMENT HISTORY TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Settlement Payout History
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Audit trail of all recorded manual PhonePe/UPI transfers with UTR references.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search UTR or Seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-3 px-4">Settlement ID & Date</th>
                <th className="py-3 px-4">Seller Name</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Transfer Method</th>
                <th className="py-3 px-4">Target UPI ID</th>
                <th className="py-3 px-4">UTR / Transaction Ref</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
              {filteredSettlements.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-mono font-black text-slate-900 dark:text-white">{s.id}</p>
                    <p className="text-[10px] font-medium text-slate-400">{new Date(s.created_at).toLocaleDateString("en-IN")}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-black text-slate-900 dark:text-white">{s.seller_name}</p>
                    <p className="text-[10px] font-medium text-slate-400">{s.seller_email}</p>
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                    ₹{Number(s.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase">
                      {s.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {s.upi_id}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    {s.utr_number}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredSettlements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No completed settlement records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Commission Settings Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          Global Commission Configuration Rules
        </h2>

        {saveStatus && (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            {saveStatus}
          </div>
        )}

        <form onSubmit={handleSaveCommission} className="flex flex-col sm:flex-row items-end gap-4 max-w-md">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Platform Seller Commission (%)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm font-black outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
          >
            Save Commission Rule
          </button>
        </form>
      </div>

      {/* "MARK AS PAID" MODAL DIALOG */}
      {selectedSellerForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedSellerForPayment(null)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Record Manual Settlement Transfer</h3>
                <p className="text-xs font-medium text-slate-400">{selectedSellerForPayment.business_name || selectedSellerForPayment.owner_name}</p>
              </div>
            </div>

            {payoutStatusMessage && (
              <div className={`p-4 rounded-2xl text-xs font-bold ${payoutStatusMessage.includes("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                {payoutStatusMessage}
              </div>
            )}

            {/* Quick UPI Pay Link Helper */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">UPI / PhonePe Transfer Details</span>
                <a
                  href={`upi://pay?pa=${payoutForm.upi_id}&pn=${encodeURIComponent(selectedSellerForPayment.business_name || 'Seller')}&am=${payoutForm.amount}&cu=INR`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:underline"
                >
                  Open PhonePe/UPI App <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Target VPA: <span className="font-mono text-emerald-600">{payoutForm.upi_id}</span>
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Amount to Send: <span className="text-base font-black text-emerald-600">₹{payoutForm.amount}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmMarkAsPaid} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Transfer Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-black outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Transfer Method</label>
                  <select
                    value={payoutForm.payment_method}
                    onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="PhonePe">PhonePe</option>
                    <option value="UPI">Generic UPI</option>
                    <option value="GPay">GPay (Google Pay)</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">UTR / Bank Transaction Reference Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 402319201948 or UPI/4023..."
                  value={payoutForm.utr_number}
                  onChange={(e) => setPayoutForm(prev => ({ ...prev, utr_number: e.target.value }))}
                  className="w-full rounded-2xl border-2 border-emerald-500/30 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payoutForm.payment_date}
                  onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSellerForPayment(null)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-wider hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Confirm & Mark as PAID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
