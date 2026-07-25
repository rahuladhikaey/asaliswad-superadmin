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
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";

export default function AsCardsLoyaltyView() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"cards" | "offers">("cards");
  const [statusMessage, setStatusMessage] = useState("");

  // New Card Modal State
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    name: "",
    email: "",
    phone: "",
    card_type: "Silver Privilege",
    coins: 250,
    expires_in_days: 365,
  });

  // Special Offer / BOGO State
  const [selectedMainProduct, setSelectedMainProduct] = useState<string>("");
  const [selectedOfferProducts, setSelectedOfferProducts] = useState<string[]>([]);
  const [activeOffer, setActiveOffer] = useState<{
    mainProductId: string;
    offerProductIds: string[];
    isActive: boolean;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Real Card Applications from Supabase DB
      const { data: cardsData, error: cardsErr } = await supabase
        .from("card_applications")
        .select("*")
        .order("applied_at", { ascending: false });

      if (cardsErr) {
        console.warn("Supabase card_applications fetch notice:", cardsErr);
      }
      setApplications(cardsData || []);

      // 2. Fetch Products
      const { data: pData } = await supabase.from("products").select("id, name, price");
      setProducts(pData || []);

      // 3. Fetch Active Special Offer / BOGO from store_settings
      const { data: offerData } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "special_offers_bogo")
        .maybeSingle();

      if (offerData?.value) {
        setActiveOffer(offerData.value);
        if (offerData.value.mainProductId) {
          setSelectedMainProduct(offerData.value.mainProductId.toString());
          setSelectedOfferProducts(offerData.value.offerProductIds || []);
        }
      }
    } catch (e: any) {
      console.error("Error loading AS Cards real data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription for zero-delay card applications updates
    const channel = supabase
      .channel("admin-card-apps-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "card_applications" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("card_applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;

      setApplications(applications.map(app => app.id === appId ? { ...app, status } : app));
      setStatusMessage(`💳 Card application marked as ${status} in real-time database.`);
    } catch (err: any) {
      alert(err.message || "Failed to update status in database.");
    }
  };

  const handleUpdateRenewDate = async (appId: string, dateStr: string) => {
    try {
      const expiresAt = new Date(dateStr).toISOString();
      const { error } = await supabase
        .from("card_applications")
        .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;

      setApplications(applications.map(app => app.id === appId ? { ...app, expires_at: expiresAt } : app));
      setStatusMessage("📅 Expiration date updated in real-time database.");
    } catch (err: any) {
      alert(err.message || "Failed to update expiration date.");
    }
  };

  const handleUpdateCoins = async (appId: string, coinsVal: number) => {
    try {
      const { error } = await supabase
        .from("card_applications")
        .update({ coins: coinsVal, updated_at: new Date().toISOString() })
        .eq("id", appId);

      if (error) throw error;

      setApplications(applications.map(app => app.id === appId ? { ...app, coins: coinsVal } : app));
      setStatusMessage("🪙 AS Coins balance updated in database.");
    } catch (err: any) {
      alert(err.message || "Failed to update coins.");
    }
  };

  const handleCreateNewCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cardNumber = `AS-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const expiresAt = new Date(Date.now() + newCardForm.expires_in_days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("card_applications")
        .insert([{
          name: newCardForm.name,
          email: newCardForm.email,
          phone: newCardForm.phone,
          card_type: newCardForm.card_type,
          card_number: cardNumber,
          coins: newCardForm.coins,
          status: "APPROVED",
          expires_at: expiresAt,
          applied_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setShowNewCardModal(false);
      setNewCardForm({ name: "", email: "", phone: "", card_type: "Silver Privilege", coins: 250, expires_in_days: 365 });
      setStatusMessage(`🎉 Issued new AS-Card (${cardNumber}) to ${data.name}!`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue new card.");
    }
  };

  const handleSaveActiveOffer = async () => {
    if (!selectedMainProduct) {
      alert("Please select a primary main product for the offer.");
      return;
    }
    const offerPayload = {
      mainProductId: selectedMainProduct,
      offerProductIds: selectedOfferProducts,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from("store_settings")
        .upsert({
          key: "special_offers_bogo",
          value: offerPayload,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setActiveOffer(offerPayload);
      setStatusMessage("🎁 Cardholder exclusive BOGO & bundle offer persisted to production database!");
    } catch (err: any) {
      alert(err.message || "Failed to save offer settings.");
    }
  };

  const handleToggleOfferProduct = (productId: string) => {
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
      (app.card_number || app.cardNumber || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-widest">
            <CreditCard className="w-4 h-4" />
            <span>Asali Swad Privilege Club (Real-time DB Active)</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">AS-Cards & Loyalty Program</h2>
          <p className="text-xs text-amber-100 max-w-xl">
            Approve card applications directly in Supabase DB, adjust reward coins, set card validity dates, and deploy real-time cardholder bundle offers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCardModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-amber-900 text-xs font-black hover:bg-amber-50 shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Card</span>
          </button>
          <div className="flex items-center bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab("cards")}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                activeTab === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-amber-100 hover:text-white"
              }`}
            >
              Membership Cards ({applications.length})
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
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-amber-600 hover:opacity-80">✕</button>
        </div>
      )}

      {activeTab === "cards" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real member applications by Name, Email, Phone, or Card Number..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              onClick={loadData}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              title="Refresh Real-time Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                        Loading card applications from database...
                      </td>
                    </tr>
                  ) : filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                        No card applications found in database.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{app.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{app.email || "N/A"}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{app.phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-black text-[10px] uppercase">
                            {app.card_type || app.cardType || "Privilege Card"}
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
                            {app.card_number || app.cardNumber || "Pending Assignment"}
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
                              value={(app.expires_at || app.expiresAt) ? (app.expires_at || app.expiresAt).split("T")[0] : ""}
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
              Select an anchor main product and map multiple bonus offer products that cardholders unlock in real-time.
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
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition-colors cursor-pointer font-bold"
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
                  const isSelected = selectedOfferProducts.includes(p.id.toString());
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleOfferProduct(p.id.toString())}
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
              <span>Save & Activate Production Loyalty Offer</span>
            </button>
          </div>
        </div>
      )}

      {/* Issue New Card Modal */}
      {showNewCardModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span>Issue New AS Privilege Card</span>
              </h3>
              <button onClick={() => setShowNewCardModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateNewCard} className="space-y-3 text-xs font-bold">
              <div>
                <label className="text-[10px] uppercase text-slate-400">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Cardholder Name"
                  value={newCardForm.name}
                  onChange={(e) => setNewCardForm({ ...newCardForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={newCardForm.phone}
                    onChange={(e) => setNewCardForm({ ...newCardForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newCardForm.email}
                    onChange={(e) => setNewCardForm({ ...newCardForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400">Initial AS Coins</label>
                  <input
                    type="number"
                    value={newCardForm.coins}
                    onChange={(e) => setNewCardForm({ ...newCardForm, coins: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-400">Validity (Days)</label>
                  <input
                    type="number"
                    value={newCardForm.expires_in_days}
                    onChange={(e) => setNewCardForm({ ...newCardForm, expires_in_days: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCardModal(false)}
                  className="w-1/2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-600 shadow-md"
                >
                  Issue Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
