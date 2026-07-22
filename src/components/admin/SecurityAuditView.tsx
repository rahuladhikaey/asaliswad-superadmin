"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Key, UserX, Clock, Lock } from "lucide-react";

export default function SecurityAuditView() {
  const [activeTab, setActiveTab] = useState<"audit" | "logins" | "failed">("audit");

  const [auditLogs] = useState<any[]>([
    { id: 1, actor: "Super Admin", action: "Approved merchant seller 'Himalayan Herbs Enterprise'", ip: "103.21.124.8", time: "10 mins ago" },
    { id: 2, actor: "Seller: Pure Spices", action: "Updated product price for 'Wild Honey 500g'", ip: "157.48.201.12", time: "45 mins ago" },
    { id: 3, actor: "Super Admin", action: "Updated marketplace global commission rate to 10%", ip: "103.21.124.8", time: "2 hours ago" },
  ]);

  const [failedAttempts] = useState<any[]>([
    { id: 1, email: "unknown_user@gmail.com", ip: "45.132.18.9", reason: "Invalid password attempt (3x)", time: "1 hour ago" },
    { id: 2, email: "seller_test@business.com", ip: "103.11.24.5", reason: "Unverified email login block", time: "6 hours ago" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Security</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Security, Audit Logs & Login History</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect security events, audit administrative actions, track merchant login history, and monitor failed login attempts.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "audit" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab("failed")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "failed" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Failed Attempts ({failedAttempts.length})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
        {activeTab === "audit" ? (
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Administrative Audit Logs
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs font-bold">
                  <div>
                    <span className="font-black text-slate-900 dark:text-white">{log.actor}: </span>
                    <span className="text-slate-600 dark:text-slate-300">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>IP: {log.ip}</span>
                    <span>{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Failed Login Attempt Log
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {failedAttempts.map(log => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs font-bold">
                  <div>
                    <span className="font-black text-rose-600">{log.email}: </span>
                    <span className="text-slate-600 dark:text-slate-300">{log.reason}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>IP: {log.ip}</span>
                    <span>{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
