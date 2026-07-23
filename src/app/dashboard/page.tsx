"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Product } from "@/types/products";
import type { Category } from "@/types/categories";
import type { Order } from "@/types/orders";
import DashboardOverview from "@/components/DashboardOverview";
import SellerManagementView from "@/components/admin/SellerManagementView";
import ProductApprovalView from "@/components/admin/ProductApprovalView";
import CategoriesShelvesView from "@/components/admin/CategoriesShelvesView";
import InventoryMonitoringView from "@/components/admin/InventoryMonitoringView";
import StockAlertsView from "@/components/admin/StockAlertsView";
import OrderManagementView from "@/components/admin/OrderManagementView";
import AsCardsLoyaltyView from "@/components/admin/AsCardsLoyaltyView";
import ShippingLogisticsView from "@/components/admin/ShippingLogisticsView";
import PaymentsCommissionView from "@/components/admin/PaymentsCommissionView";
import ReportsAnalyticsView from "@/components/admin/ReportsAnalyticsView";
import ReviewsModerationView from "@/components/admin/ReviewsModerationView";
import SupportDeskView from "@/components/admin/SupportDeskView";
import NotificationsBroadcastView from "@/components/admin/NotificationsBroadcastView";
import SecurityAuditView from "@/components/admin/SecurityAuditView";
import MarketplaceSettingsView from "@/components/admin/MarketplaceSettingsView";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [tab, setTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [adminUser, setAdminUser] = useState("Super Admin");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, oRes, sRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("sellers").select("*").order("created_at", { ascending: false })
      ]);

      setProducts(pRes.data || []);
      setCategories(cRes.data || []);
      setOrders(oRes.data || []);
      setSellers(sRes.data || []);
    } catch (e) {
      console.error("Data loading error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400 font-bold text-xs">Loading Super Admin Platform...</p>
      </main>
    );
  }

  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Overview & Analytics', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'sellers', label: 'Seller Management', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'products', label: 'Product Approvals', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
    { id: 'categories', label: 'Shelves & Categories', icon: 'M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01' },
    { id: 'inventory', label: 'Inventory Monitoring', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'alerts', label: 'Stock Alerts & Notify', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'orders', label: 'Order Dispatches', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'as-card', label: 'AS-Cards & Loyalty', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'shipping', label: 'Shipping & Logistics', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1' },
    { id: 'payments', label: 'Payments & Commission', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'reviews', label: 'Customer Reviews', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { id: 'support', label: 'Support Desk', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'security', label: 'Security & Audit', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'settings', label: 'Marketplace Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden font-sans">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 h-20 px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <span className="text-white font-black text-xs">AS</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase truncate">Super Admin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{adminUser}</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 no-scrollbar">
          {MENU_ITEMS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${tab === t.id
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <svg className={`h-5 w-5 ${tab === t.id ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200 relative">
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 transition-colors duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search everywhere..." className="bg-transparent border-none outline-none w-full text-xs font-medium pl-3 text-slate-900 dark:text-white placeholder:text-slate-400" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle Switch */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-slate-200 dark:bg-slate-800"
              aria-label="Toggle theme"
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                className={`pointer-events-none relative inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${isDarkMode ? "translate-x-6" : "translate-x-0"
                  }`}
              >
                {isDarkMode ? (
                  <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </span>
            </button>
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 cursor-pointer">
              <span className="text-emerald-700 font-bold text-xs">SA</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-[1400px] mx-auto w-full space-y-6">
            {statusMessage && (
              <div className="mb-8 flex items-center gap-4 rounded-2xl bg-amber-50 p-4 border border-amber-100 shadow-sm animate-in fade-in">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-amber-900">{statusMessage}</p>
              </div>
            )}

            {tab === "dashboard" && (
              <DashboardOverview
                orders={orders}
                products={products}
                customers={customers}
                categories={categories}
                loading={loading}
                onRefresh={fetchData}
              />
            )}

            {tab === "sellers" && <SellerManagementView />}
            {tab === "products" && <ProductApprovalView />}
            {tab === "categories" && <CategoriesShelvesView />}
            {tab === "inventory" && <InventoryMonitoringView />}
            {tab === "alerts" && <StockAlertsView />}
            {tab === "orders" && <OrderManagementView />}
            {tab === "as-card" && <AsCardsLoyaltyView />}
            {tab === "shipping" && <ShippingLogisticsView />}
            {tab === "payments" && <PaymentsCommissionView />}
            {tab === "reports" && <ReportsAnalyticsView orders={orders} products={products} sellers={sellers} />}
            {tab === "reviews" && <ReviewsModerationView />}
            {tab === "support" && <SupportDeskView />}
            {tab === "notifications" && <NotificationsBroadcastView />}
            {tab === "security" && <SecurityAuditView />}
            {tab === "settings" && <MarketplaceSettingsView />}
          </div>
        </div>
      </main>
    </div>
  );
}
