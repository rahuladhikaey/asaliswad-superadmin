"use client";

import { useState } from "react";
import { Settings, Tag, Percent, Truck, ShieldCheck, CheckCircle2, DollarSign, Package } from "lucide-react";

export default function MarketplaceSettingsView() {
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "coupons">("general");
  const [statusMsg, setStatusMsg] = useState("");

  const [generalConfig, setGeneralConfig] = useState({
    marketplaceName: "Asali Swad Marketplace",
    supportEmail: "support@asaliswad.com",
    supportPhone: "+91 9876543210",
    freeShippingThreshold: "100",
    codEnabled: true,
  });

  const [billingSettings, setBillingSettings] = useState({
    deliveryFee: "29",
    freeDeliveryThreshold: "100",
    packagingFee: "9",
    taxPercentage: "3",
  });

  const [globalCartOffer, setGlobalCartOffer] = useState({
    threshold: "139",
    percentage: "50",
    isActive: true,
  });

  const [coupons, setCoupons] = useState<any[]>([
    { id: 1, code: "WELCOME10", discount: "10%", type: "Percentage", expiry: "2026-12-31", active: true },
    { id: 2, code: "FREESHIP", discount: "₹99", type: "Flat Shipping Off", expiry: "2026-10-15", active: true },
  ]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("🎉 Marketplace & Billing settings updated successfully!");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Platform Control</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Marketplace Settings & Billing Rules</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Configure global marketplace policies, delivery rates, packaging fees, cart offers & promo coupons.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "general" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            System Info
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "billing" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Billing & Fees
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "coupons" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"
            }`}
          >
            Coupons ({coupons.length})
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
          {statusMsg}
        </div>
      )}

      {activeTab === "general" ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            General Marketplace Configuration
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Marketplace Name</label>
              <input
                type="text"
                value={generalConfig.marketplaceName}
                onChange={(e) => setGeneralConfig({ ...generalConfig, marketplaceName: e.target.value })}
                className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Support Email</label>
                <input
                  type="email"
                  value={generalConfig.supportEmail}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, supportEmail: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Support Phone</label>
                <input
                  type="text"
                  value={generalConfig.supportPhone}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, supportPhone: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              Save Configuration
            </button>
          </form>
        </div>
      ) : activeTab === "billing" ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Delivery, Packaging & Tax Rules
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Adjust Checkout Fees applied to customer orders platform-wide.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Default Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={billingSettings.deliveryFee}
                  onChange={(e) => setBillingSettings({ ...billingSettings, deliveryFee: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Free Shipping Threshold (₹)</label>
                <input
                  type="number"
                  value={billingSettings.freeDeliveryThreshold}
                  onChange={(e) => setBillingSettings({ ...billingSettings, freeDeliveryThreshold: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Packaging Fee (₹)</label>
                <input
                  type="number"
                  value={billingSettings.packagingFee}
                  onChange={(e) => setBillingSettings({ ...billingSettings, packagingFee: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Sales Tax / GST (%)</label>
                <input
                  type="number"
                  value={billingSettings.taxPercentage}
                  onChange={(e) => setBillingSettings({ ...billingSettings, taxPercentage: e.target.value })}
                  className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Global Cart Offer Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  Global Cart Value Discount
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalCartOffer.isActive}
                    onChange={(e) => setGlobalCartOffer({ ...globalCartOffer, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Min Cart Threshold (₹)</label>
                  <input
                    type="number"
                    value={globalCartOffer.threshold}
                    onChange={(e) => setGlobalCartOffer({ ...globalCartOffer, threshold: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Discount Off (%)</label>
                  <input
                    type="number"
                    value={globalCartOffer.percentage}
                    onChange={(e) => setGlobalCartOffer({ ...globalCartOffer, percentage: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
            >
              Save Billing Settings
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            Promotional Coupons & Discounts
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {coupons.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between text-xs font-bold">
                <div>
                  <span className="font-mono font-black text-emerald-600 text-sm">{c.code}</span>
                  <p className="text-slate-500 font-medium">{c.discount} ({c.type}) • Expires: {c.expiry}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
