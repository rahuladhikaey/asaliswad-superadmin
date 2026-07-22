"use client";

import { useState, useEffect } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { MapPin, Truck, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

export default function ShippingLogisticsView() {
  const [loading, setLoading] = useState(true);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  const loadShippingData = async () => {
    setLoading(true);
    try {
      const { data: locations } = await supabase.from("seller_pickup_locations").select("*");
      setPickupLocations(locations || []);

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .not("shipment_id", "is", null);
      
      setShipments(orders || []);
    } catch (e: any) {
      console.error("Error loading shipping logistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShippingData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Logistics Hub</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Shipping, Pickup & Shiprocket Monitoring</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Manage seller pickup warehouses, monitor automated Shiprocket integrations, and track dispatch status.
          </p>
        </div>
      </div>

      {/* Integration Banner */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-base">Shiprocket API Connection</h3>
            <p className="text-xs text-emerald-300 font-medium">Status: Connected & Operational (Auto-manifesting active)</p>
          </div>
        </div>
        <button className="px-5 py-2.5 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-colors shrink-0">
          Sync Integration
        </button>
      </div>

      {/* Seller Pickup Locations Directory */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600" />
          Seller Warehouse & Pickup Locations
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs">Loading pickup locations...</div>
        ) : pickupLocations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs">No registered seller pickup locations found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pickupLocations.map(loc => (
              <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{loc.name || "Main Warehouse"}</h4>
                  {loc.is_default && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Default Pickup
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{loc.address_line1}, {loc.city}, {loc.state} - {loc.pincode}</p>
                <p className="text-[11px] text-slate-400 font-bold">Contact: {loc.phone} | {loc.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
