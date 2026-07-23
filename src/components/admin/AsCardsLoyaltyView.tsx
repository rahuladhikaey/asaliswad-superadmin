"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  CreditCard, 
  Coins, 
  Calendar, 
  Gift, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Mail, 
  Phone, 
  Sparkles, 
  RefreshCw 
} from "lucide-react";

export default function AsCardsLoyaltyView() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"cards" | "offers">("cards");
  const [statusMessage, setStatusMessage] = useState("");

  const [selectedMainProduct, setSelectedMainProduct] = useState<string>("");
  const [selectedOfferProducts, setSelectedOfferProducts] = useState<number[]>([]);
  const [activeOffer, setActiveOffer] = useState<{
    mainProductId: number;
    offerProductIds: number[];
    isActive: boolean;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("asali-swad-card-applications") : null;
      if (stored) {
        setApplications(JSON.parse(stored));
      } else {
        setApplications([
          {
            id: "card_101",
            name: "Ramesh Sharma",
            email: "ramesh@example.com",
            phone: "+91 9876543210",
            cardType: "Silver Privilege",
            status: "APPROVED",
            appliedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            coins: 250,
            cardNumber: "AS-8842-1920"
          }
        ]);
      }

      const { data: pData } = await supabase.from("products").select("id, name, price");
      setProducts(pData || []);

      const storedOffer = typeof window !== "undefined" ? window.localStorage.getItem("asali-swad-card-active-offer") : null;
      if (storedOffer) {
        const parsed = JSON.parse(storedOffer);
        setActiveOffer(parsed);
        if (parsed) {
          setSelectedMainProduct(parsed.mainProductId?.toString() || "");
          setSelectedOfferProducts(parsed.offerProductIds || []);
        }
      }
    } catch (e: any) {
      console.error("Error loading AS Cards data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = (appId: string, status: string) => {
    const updated = applications.map((app) => {
      if (app.id === appId) {
        return { ...app, status, updatedAt: new Date().toISOString() };
      }
      return app;
    });
    setApplications(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updated));
    }
    setStatusMessage(`💳 Card application ${appId} marked as ${status}.`);
  };

  const handleUpdateRenewDate = (appId: string, dateStr: string) => {
    const updated = applications.map((app) => {
      if (app.id === appId) {
        return { ...app, expiresAt: new Date(dateStr).toISOString() };
      }
      return app;
    });
    setApplications(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updated));
    }
    setStatusMessage("📅 Expiration date updated.");
  };

  const handleUpdateCoins = (appId: string, coinsVal: number) => {
    const updated = applications.map((app) => {
      if (app.id === appId) {
        return { ...app, coins: coinsVal };
      }
      return app;
    });
    setApplications(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updated));
    }
    setStatusMessage("🪙 AS Coins balance updated.");
  };

  const handleSaveActiveOffer = () => {
    if (!selectedMainProduct) {
      alert("Please select a primary main product for the offer.");
      return;
    }
    const offerPayload = {
      mainProductId: Number(selectedMainProduct),
      offerProductIds: selectedOfferProducts,
      isActive: true,
    };
    setActiveOffer(offerPayload);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("asali-swad-card-active-offer", JSON.stringify(offerPayload));
    }
    setStatusMessage("🎁 Cardholder exclusive bundle offer activated!");
  };

  const handleToggleOfferProduct = (productId: number) => {
    if (selectedOfferProducts.includes(productId)) {
      setSelectedOfferProducts(selectedOfferProducts.filter((id) => id !== productId));
    } else {
      setSelectedOfferProducts([...selectedOfferProducts, productId]);
    }
  };

  const filteredApps = applications.filter((app) => {
    const query = searchQuery.toLowerCase();
    return (
      (app.name || "").toLowerCase().includes(query) ||
      (app.email || "").toLowerCase().includes(query) ||
      (app.phone || "").toLowerCase().includes(query) ||
      (app.cardNumber || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-widest">
            <CreditCard className="w-4 h-4" />
            <span>Asali Swad Privilege Club</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">AS-Cards & Loyalty Program</h2>
          <p className="text-xs text-amber-100 max-w-xl">
            Approve card applications, adjust reward coins, set card validity dates, and deploy exclusive cardholder bundle offers.
          </p>
        </div>

        <div className="flex items-center bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("cards")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-amber-100 hover:text-white"
            }`}
          >
            Membership Cards
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === "offers" ? "bg-white text-slate-900 shadow-sm" : "text-amber-100 hover:text-white"
            }`}
          >
            Special Offers & BOGO
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-amber-600 hover:opacity-80">✕</button>
        </div>
      )}

      {activeTab === "cards" ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member applications by Name, Email, Phone, or Card Number..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    <th className="px-6 py-4">Cardholder</th>
                    <th className="px-6 py-4">Card Details</th>
                    <th className="px-6 py-4">AS Coins</th>
                    <th className="px-6 py-4">Renewal / Expiry</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                        No card applications found.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{app.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{app.email}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{app.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-black text-[10px] uppercase">
                            {app.cardType || "Privilege Card"}
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
                            {app.cardNumber || "Pending Assignment"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <input
                              type="number"
                              value={app.coins || 0}
                              onChange={(e) => handleUpdateCoins(app.id, Number(e.target.value))}
                              className="w-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-amber-500"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                              type="date"
                              value={app.expiresAt ? app.expiresAt.split("T")[0] : ""}
                              onChange={(e) => handleUpdateRenewDate(app.id, e.target.value)}
                              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium outline-none focus:border-amber-500"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            app.status === "APPROVED" 
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : app.status === "REJECTED"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleUpdateStatus(app.id, "APPROVED")}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                            title="Approve Card"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(app.id, "REJECTED")}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                            title="Reject Card"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              <span>Cardholder Exclusive Bundle & BOGO Builder</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select an anchor main product and map multiple bonus offer products that cardholders unlock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                1. Primary Anchor Product
              </label>
              <select
                value={selectedMainProduct}
                onChange={(e) => setSelectedMainProduct(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors cursor-pointer"
              >
                <option value="">-- Select Main Anchor Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
                2. Select Bonus Bundle Products
              </label>
              <div className="max-h-56 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                {products.map((p) => {
                  const isSelected = selectedOfferProducts.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleOfferProduct(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                        isSelected
                          ? "bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300"
                          : "border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[11px] text-slate-400">₹{p.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleSaveActiveOffer}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Activate Loyalty Bundle Offer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
