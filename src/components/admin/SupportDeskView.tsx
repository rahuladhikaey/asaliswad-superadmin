"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2, Clock, Filter, Send } from "lucide-react";

export default function SupportDeskView() {
  const [activeStream, setActiveStream] = useState<"seller" | "customer">("seller");
  const [tickets, setTickets] = useState<any[]>([
    { id: "TICK-101", user: "Pure Spices Traders (Seller)", subject: "Payout disbursement delay query", status: "OPEN", priority: "HIGH", created: "2 hours ago", type: "seller" },
    { id: "TICK-102", user: "Ananya Sharma (Customer)", subject: "Tracking number not updating for order #10042", status: "IN_PROGRESS", priority: "MEDIUM", created: "5 hours ago", type: "customer" },
    { id: "TICK-103", user: "Himalayan Herbs (Seller)", subject: "Requesting category expansion for Organic Teas", status: "RESOLVED", priority: "LOW", created: "1 day ago", type: "seller" },
  ]);

  const handleUpdateStatus = (id: string, status: string) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status } : t));
  };

  const filteredTickets = tickets.filter(t => t.type === activeStream);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Help Center</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Support Desk & Ticket Resolution</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Resolve incoming support inquiries from merchants and customers in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveStream("seller")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeStream === "seller" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Seller Tickets
          </button>
          <button
            onClick={() => setActiveStream("customer")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeStream === "customer" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Customer Tickets
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTickets.map(t => (
            <div key={t.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-emerald-600">{t.id}</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{t.subject}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">From: {t.user} • Created {t.created}</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={t.status}
                  onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold outline-none"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
