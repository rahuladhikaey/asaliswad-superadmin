"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiService } from "@/services/apiService";
import { jsPDF } from "jspdf";
import { 
  CreditCard, 
  IndianRupee, 
  Search, 
  Download, 
  Clock, 
  CheckCircle2, 
  X, 
  Eye, 
  ArrowRight,
  TrendingUp,
  Filter,
  RefreshCw,
  FileText,
  AlertTriangle
} from "lucide-react";

type Settlement = {
  id: string;
  seller_id: string;
  business_name?: string;
  week_number: number;
  start_date: string;
  end_date: string;
  total_orders: number;
  gross_sales: number;
  commission_deducted: number;
  platform_fees: number;
  taxes: number;
  net_amount: number;
  status: 'PENDING' | 'PAID';
  transaction_id?: string;
  payment_date?: string;
  receipt_number?: string;
  receipt_pdf_url?: string;
  notes?: string;
  email_sent: boolean;
  created_at: string;
  sellers?: {
    business_name: string;
    owner_name: string;
    email: string;
    mobile_number: string;
    phonepay_number: string;
    phonepay_no: string;
  };
};

export default function SettlementDashboard() {
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sellersList, setSellersList] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalPending: 0,
    totalPaid: 0,
    todayPayments: 0,
    weeklyPayments: 0,
    monthlyPayments: 0,
    totalPayout: 0
  });

  // Modal states
  const [payingSettlement, setPayingSettlement] = useState<Settlement | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Details view state
  const [detailsSettlement, setDetailsSettlement] = useState<Settlement | null>(null);
  const [detailsOrders, setDetailsOrders] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Reconcile and load settlements
      const res = await apiService.getSettlements();
      const sData = (res.data || []) as Settlement[];
      setSettlements(sData);

      // Load unique sellers for filters
      const { data: sellers } = await supabase.from("sellers").select("id, business_name");
      setSellersList(sellers || []);

      calculateStats(sData);
    } catch (err) {
      console.error("Failed to load settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime channel for zero-refresh updates
    const channel = supabase
      .channel("admin-settlement-changes")
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "seller_settlements" }, 
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Apply filters
    let temp = [...settlements];

    if (selectedSellerId !== "all") {
      temp = temp.filter(s => s.seller_id === selectedSellerId);
    }
    if (selectedStatus !== "all") {
      temp = temp.filter(s => s.status === selectedStatus);
    }
    if (selectedWeek !== "all") {
      temp = temp.filter(s => s.week_number === parseInt(selectedWeek, 10));
    }
    if (startDateFilter) {
      temp = temp.filter(s => new Date(s.start_date) >= new Date(startDateFilter));
    }
    if (endDateFilter) {
      temp = temp.filter(s => new Date(s.end_date) <= new Date(endDateFilter + "T23:59:59"));
    }
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      temp = temp.filter(s => 
        s.sellers?.business_name?.toLowerCase().includes(search) ||
        s.receipt_number?.toLowerCase().includes(search) ||
        s.transaction_id?.toLowerCase().includes(search)
      );
    }

    setFilteredSettlements(temp);
  }, [settlements, selectedSellerId, selectedStatus, selectedWeek, startDateFilter, endDateFilter, searchQuery]);

  const calculateStats = (data: Settlement[]) => {
    const pending = data.filter(s => s.status === "PENDING").reduce((sum, s) => sum + Number(s.net_amount), 0);
    const paid = data.filter(s => s.status === "PAID").reduce((sum, s) => sum + Number(s.net_amount), 0);
    
    // Payments grouping
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const todayPay = data
      .filter(s => s.status === "PAID" && s.payment_date && new Date(s.payment_date).getTime() >= startOfToday)
      .reduce((sum, s) => sum + Number(s.net_amount), 0);

    const weekPay = data
      .filter(s => s.status === "PAID" && s.payment_date && new Date(s.payment_date).getTime() >= startOfWeek)
      .reduce((sum, s) => sum + Number(s.net_amount), 0);

    const monthPay = data
      .filter(s => s.status === "PAID" && s.payment_date && new Date(s.payment_date).getTime() >= startOfMonth)
      .reduce((sum, s) => sum + Number(s.net_amount), 0);

    setStats({
      totalPending: pending,
      totalPaid: paid,
      todayPayments: todayPay,
      weeklyPayments: weekPay,
      monthlyPayments: monthPay,
      totalPayout: paid
    });
  };

  const handleOpenPayModal = (s: Settlement) => {
    setErrorMsg("");
    setTransactionId("");
    setPaymentNotes("");
    setPayingSettlement(s);
  };

  const handleOpenDetails = async (s: Settlement) => {
    setDetailsSettlement(s);
    setDetailsLoading(true);
    setDetailsOrders([]);
    setAuditLogs([]);
    try {
      const res = await apiService.getSettlementDetails(s.id);
      if (res.success) {
        setDetailsOrders(res.data.orders || []);
      }

      // Fetch payment audit logs
      const { data: logs } = await supabase
        .from("payment_audit_logs")
        .select("*")
        .eq("settlement_id", s.id)
        .order("created_at", { ascending: false });
      setAuditLogs(logs || []);
    } catch (err) {
      console.error("Failed to load details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const generateReceiptPDF = (s: Settlement, sellerInfo: any, recNumber: string, datePaid: Date): Blob => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Branding
    doc.setFillColor(5, 150, 105); // emerald-600
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ASALISWAD MARKETPLACE", 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("WEEKLY SELLER SETTLEMENT RECEIPT", 15, 25);

    // Metadata Right-aligned
    doc.setFont("helvetica", "bold");
    doc.text(`RECEIPT: ${recNumber}`, 130, 18);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Paid: ${datePaid.toLocaleString()}`, 130, 25);

    // Body Info
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("SELLER INFORMATION", 15, 50);
    doc.line(15, 52, 195, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Seller ID: ${s.seller_id}`, 15, 60);
    doc.text(`Business Name: ${sellerInfo.business_name}`, 15, 66);
    doc.text(`Owner Name: ${sellerInfo.owner_name || ""}`, 15, 72);
    doc.text(`Email: ${sellerInfo.email}`, 15, 78);
    doc.text(`PhonePe Number: ${sellerInfo.phonepay_number || sellerInfo.phonepay_no || sellerInfo.mobile_number || ""}`, 15, 84);

    // Settlement Info
    doc.setFont("helvetica", "bold");
    doc.text("SETTLEMENT DETAILS", 15, 100);
    doc.line(15, 102, 195, 102);

    doc.setFont("helvetica", "normal");
    doc.text(`Settlement Week: Week ${s.week_number}`, 15, 110);
    doc.text(`Period Range: ${new Date(s.start_date).toLocaleDateString()} - ${new Date(s.end_date).toLocaleDateString()}`, 15, 116);
    doc.text(`Total Included Orders: ${s.total_orders}`, 15, 122);
    doc.text(`PhonePe UPI Transaction ID: ${transactionId}`, 15, 128);

    // Payout Summary Table Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 140, 180, 50, "F");
    doc.rect(15, 140, 180, 50, "D");

    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECONCILIATION SUMMARY", 20, 148);

    doc.setFont("helvetica", "normal");
    doc.text(`Gross Sales Revenue:`, 20, 158);
    doc.text(`₹ ${s.gross_sales}`, 150, 158, { align: "right" });

    doc.text(`Marketplace Commission Deducted:`, 20, 164);
    doc.text(`- ₹ ${s.commission_deducted}`, 150, 164, { align: "right" });

    doc.text(`App Platform Charges Deducted:`, 20, 170);
    doc.text(`- ₹ ${s.platform_fees}`, 150, 170, { align: "right" });

    doc.text(`Estimated Taxes (GST) Deducted:`, 20, 176);
    doc.text(`- ₹ ${s.taxes}`, 150, 176, { align: "right" });

    // Net Payout
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`NET DISBURSED SETTLEMENT AMOUNT:`, 20, 184);
    doc.text(`₹ ${s.net_amount}`, 150, 184, { align: "right" });

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("This receipt is generated automatically upon successful payment clearance via PhonePe UPI.", 15, 270);
    doc.text("If you have any disputes or settlement questions, contact support@asaliswad.com.", 15, 275);

    return doc.output("blob");
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSettlement || !transactionId.trim()) return;

    setActionLoading(true);
    setErrorMsg("");

    try {
      // 1. Double check unique transaction ID inside this frontend component as a safety check
      const { data: duplicateCheck } = await supabase
        .from("seller_settlements")
        .select("id")
        .eq("transaction_id", transactionId.trim())
        .maybeSingle();

      if (duplicateCheck) {
        throw new Error("This PhonePe Transaction ID has already been recorded for another settlement.");
      }

      // 2. Fetch seller details to generate the PDF receipt
      const { data: sellerInfo, error: sErr } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", payingSettlement.seller_id)
        .single();

      if (sErr || !sellerInfo) {
        throw new Error("Unable to retrieve seller configuration details.");
      }

      // 3. Generate a temporary receipt number & paid date for client-side PDF compilation
      const tempRecNumber = `REC-SET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${payingSettlement.id.slice(0, 6)}-${Math.floor(Math.random() * 10000)}`;
      const paidDate = new Date();

      // 4. Generate the PDF blob
      const pdfBlob = generateReceiptPDF(payingSettlement, sellerInfo, tempRecNumber, paidDate);

      // 5. Upload PDF file to Supabase Storage Bucket 'settlement-receipts'
      const filePath = `receipts/${payingSettlement.id}/${tempRecNumber}.pdf`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("settlement-receipts")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true
        });

      if (uploadErr) {
        console.warn("Storage upload failed, attempting default recovery:", uploadErr);
      }

      // 6. Get Public URL of the uploaded receipt
      const { data: urlData } = supabase.storage
        .from("settlement-receipts")
        .getPublicUrl(filePath);

      const publicPdfUrl = urlData?.publicUrl || null;

      // 7. Make transactional payment request to backend controller
      const payRes = await apiService.paySettlement(payingSettlement.id, {
        transactionId: transactionId.trim(),
        notes: paymentNotes,
        pdfUrl: publicPdfUrl
      });

      if (!payRes.success) {
        throw new Error(payRes.error || "Failed to mark settlement as paid.");
      }

      setPayingSettlement(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during payment processing.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDFReceipt = (s: Settlement) => {
    if (s.receipt_pdf_url) {
      window.open(s.receipt_pdf_url, "_blank");
    } else {
      alert("Receipt PDF not found.");
    }
  };

  const exportToExcel = () => {
    // Basic CSV download
    const headers = ["Seller Name", "Week", "Start Date", "End Date", "Total Orders", "Gross Sales", "Commission Deducted", "Platform Fees", "Taxes", "Net Amount", "Status", "Transaction ID", "Receipt Number", "Payment Date"];
    const rows = filteredSettlements.map(s => [
      s.sellers?.business_name || "",
      s.week_number,
      new Date(s.start_date).toLocaleDateString(),
      new Date(s.end_date).toLocaleDateString(),
      s.total_orders,
      s.gross_sales,
      s.commission_deducted,
      s.platform_fees,
      s.taxes,
      s.net_amount,
      s.status,
      s.transaction_id || "",
      s.receipt_number || "",
      s.payment_date ? new Date(s.payment_date).toLocaleDateString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AS_Marketplace_Settlements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Seller Settlements & Commission</h1>
          <p className="text-xs font-bold text-slate-500">Weekly payouts dashboard, PhonePe ledger verification, and immutable receipts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportToExcel} className="btn bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-emerald-700 shadow-md">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400">Pending Settlements</p>
          <p className="text-xl font-black text-amber-600 mt-1">₹{stats.totalPending.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400">Total Paid Out</p>
          <p className="text-xl font-black text-emerald-600 mt-1">₹{stats.totalPaid.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400">Paid Today</p>
          <p className="text-xl font-black text-slate-950 dark:text-white mt-1">₹{stats.todayPayments.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400">Paid This Week</p>
          <p className="text-xl font-black text-slate-950 dark:text-white mt-1">₹{stats.weeklyPayments.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400">Paid This Month</p>
          <p className="text-xl font-black text-slate-950 dark:text-white mt-1">₹{stats.monthlyPayments.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400">Marketplace Share</p>
          <p className="text-xl font-black text-emerald-700 mt-1">₹{stats.totalPayout.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Search Details</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search Txn ID, Receipt..." 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-slate-900 dark:text-white outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Filter Seller</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
            >
              <option value="all">All Registered Sellers</option>
              {sellersList.map(s => (
                <option key={s.id} value={s.id}>{s.business_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Payment Status</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Payments Status</option>
              <option value="PENDING">Pending Settlement</option>
              <option value="PAID">Paid / Completed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">Settlement Week</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              <option value="all">All Weeks</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">From Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">To Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs flex justify-center items-center gap-2">
            <RefreshCw className="animate-spin" size={16} /> Loading settlements log...
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">
            No matching settlement cycles found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-700 dark:text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-widest font-black text-[9px]">
                  <th className="px-6 py-4">Seller Name</th>
                  <th className="px-6 py-4 text-center">Week</th>
                  <th className="px-6 py-4">Settlement Period</th>
                  <th className="px-6 py-4 text-center">Orders</th>
                  <th className="px-6 py-4 text-right">Gross Sales</th>
                  <th className="px-6 py-4 text-right">Commission</th>
                  <th className="px-6 py-4 text-right">Net Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSettlements.map((s) => {
                  const isLocked = s.status === "PENDING" && s.week_number > 1 && 
                    settlements.some(other => other.seller_id === s.seller_id && other.week_number < s.week_number && other.status === "PENDING");
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 font-bold">
                      <td className="px-6 py-4 text-slate-900 dark:text-white">
                        <span className="block font-black">{s.sellers?.business_name || "Unknown Seller"}</span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">{s.seller_id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 font-mono">Week {s.week_number}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(s.start_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })} - {new Date(s.end_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-mono">{s.total_orders}</td>
                      <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-mono">₹{Number(s.gross_sales).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-right text-rose-600 font-mono">-₹{Number(s.commission_deducted).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-mono">₹{Number(s.net_amount).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-center">
                        {s.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        ) : isLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 px-2.5 py-1 text-[10px] font-black uppercase">
                            Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 text-[10px] font-black uppercase">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1.5">
                        <button onClick={() => handleOpenDetails(s)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors" title="View Details">
                          <Eye size={14} />
                        </button>
                        {s.status === "PENDING" ? (
                          <button 
                            onClick={() => handleOpenPayModal(s)} 
                            disabled={isLocked}
                            className={`px-3 py-2 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                              isLocked 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800/50' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-sm'
                            }`}
                          >
                            <CreditCard size={12} /> Pay
                          </button>
                        ) : (
                          <button onClick={() => handleDownloadPDFReceipt(s)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors" title="Download Receipt">
                            <Download size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual PhonePe Payment Flow Modal */}
      {payingSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <CreditCard className="text-emerald-600" size={16} /> Disburse PhonePe Payout
              </h3>
              <button onClick={() => setPayingSettlement(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleMarkAsPaid} className="p-6 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100/30 flex gap-4 items-center">
                <div className="h-10 w-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-black shrink-0">
                  ₹
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400">Net Settlement Amount</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">₹{payingSettlement.net_amount.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="space-y-3 font-bold text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                  <span className="text-slate-400">Seller Business Name</span>
                  <span className="text-slate-900 dark:text-white">{payingSettlement.sellers?.business_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                  <span className="text-slate-400">PhonePe Number / UPI</span>
                  <span className="text-emerald-600 font-black">
                    {payingSettlement.sellers?.phonepay_number || payingSettlement.sellers?.phonepay_no || payingSettlement.sellers?.mobile_number || "Not Configured"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                  <span className="text-slate-400">Settlement Week</span>
                  <span className="text-slate-950 dark:text-white">Week {payingSettlement.week_number}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                  <span className="text-slate-400">Date Range</span>
                  <span className="text-slate-500">
                    {new Date(payingSettlement.start_date).toLocaleDateString()} - {new Date(payingSettlement.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100/30 p-3.5 rounded-xl text-[10px] font-bold text-amber-800 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={14} />
                <span>
                  <strong>Manual PhonePe Verification Instructions:</strong> Open your PhonePe merchant/personal dashboard and initiate a payment of <strong>₹{payingSettlement.net_amount}</strong> to the seller's verified number listed above. Copy the transaction reference ID, and submit it below to generate the immutable settlement receipt.
                </span>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">PhonePe Transaction ID (UTR / Txn Ref) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter 12-digit transaction reference ID..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Internal Notes (Optional)</label>
                <textarea 
                  placeholder="Record dispatch verification notes, specific remarks..." 
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div className="p-3 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/30 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setPayingSettlement(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1 disabled:bg-emerald-600/50"
                >
                  {actionLoading ? <RefreshCw className="animate-spin" size={12} /> : null} Mark as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Details Drawer/Modal */}
      {detailsSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">Settlement details log</h3>
                <p className="text-[10px] text-slate-400 font-bold font-mono">{detailsSettlement.id}</p>
              </div>
              <button onClick={() => setDetailsSettlement(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Payment Status</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {detailsSettlement.status === "PAID" ? "💰 Completed & Disbursed" : "⏳ Pending Reconciliation"}
                  </p>
                </div>
                {detailsSettlement.status === "PAID" && (
                  <button onClick={() => handleDownloadPDFReceipt(detailsSettlement)} className="btn bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-50">
                    <FileText size={14} /> Download Receipt
                  </button>
                )}
              </div>

              {/* Seller details grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Seller Info</h4>
                  <div className="space-y-1.5">
                    <p className="text-slate-950 dark:text-white font-black">{detailsSettlement.sellers?.business_name}</p>
                    <p className="text-slate-400">{detailsSettlement.sellers?.owner_name}</p>
                    <p className="text-slate-400 font-mono">{detailsSettlement.sellers?.email}</p>
                    <p className="text-slate-400">{detailsSettlement.sellers?.mobile_number}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Payout Settings</h4>
                  <div className="space-y-1.5">
                    <p className="text-slate-400">PhonePe Number / UPI ID:</p>
                    <p className="text-emerald-600 font-black font-mono text-sm">
                      {detailsSettlement.sellers?.phonepay_number || detailsSettlement.sellers?.phonepay_no || detailsSettlement.sellers?.mobile_number || "Not Setup"}
                    </p>
                    <p className="text-slate-400">Settlement Period:</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {new Date(detailsSettlement.start_date).toLocaleDateString()} - {new Date(detailsSettlement.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 font-bold text-xs">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Financial Reconciliation</h4>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Sales Revenue</span>
                  <span className="text-slate-900 dark:text-white font-mono">₹{Number(detailsSettlement.gross_sales).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Marketplace Commission Deducted</span>
                  <span className="font-mono">-₹{Number(detailsSettlement.commission_deducted).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>App Platform Fees Deducted</span>
                  <span className="font-mono">-₹{Number(detailsSettlement.platform_fees).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Estimated Taxes (GST) Deducted</span>
                  <span className="font-mono">-₹{Number(detailsSettlement.taxes).toFixed(2)}</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-800 my-2" />
                <div className="flex justify-between font-black text-sm text-emerald-600">
                  <span>Net Disbursed Settlement</span>
                  <span className="font-mono">₹{Number(detailsSettlement.net_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Orders List inside settlement range */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-2">Orders Included in Payout ({detailsOrders.length})</h4>
                {detailsLoading ? (
                  <div className="text-center py-4 font-bold text-slate-400 text-[10px]">Loading orders data...</div>
                ) : detailsOrders.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-800/10 rounded-xl">No eligible orders fell within this cycle.</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                    {detailsOrders.map(o => (
                      <div key={o.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs">
                        <div>
                          <span className="block font-black text-slate-900 dark:text-white">Order #{o.order_number}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(o.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-mono text-slate-900 dark:text-white">₹{Number(o.total_amount).toFixed(2)}</span>
                          <span className="text-[9px] text-emerald-600 uppercase font-black">{o.payment_method}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit history logs */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-2">Audit Logs & History</h4>
                {detailsLoading ? (
                  <div className="text-center py-4 font-bold text-slate-400 text-[10px]">Loading audit trail...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-800/10 rounded-xl">No audit logs registered yet.</div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold text-[10px] uppercase">
                          <span className="text-emerald-600 font-black">{log.action}</span>
                          <span className="text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{log.notes || "No notes registered."}</p>
                        <div className="flex gap-4 text-[9px] text-slate-400 font-mono">
                          <span>By: {log.performed_by || "Admin"}</span>
                          <span>IP: {log.ip_address}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 shrink-0">
              <button onClick={() => setDetailsSettlement(null)} className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black hover:bg-slate-100">
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
