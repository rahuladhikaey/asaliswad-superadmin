"use client";

import { createBrowserClient } from "@supabase/ssr";

// Instance A: Users, Storefront, Products, Categories, Orders, Card Applications, Store Settings
const supabaseAUrl = process.env.NEXT_PUBLIC_SUPABASE_A_URL ?? "https://bprkenwmheakcqryjupi.supabase.co";
const supabaseAAnonKey = process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY ?? "sb_publishable_W3vW-6g_CDVw57zEK-oF5A_Y3RzKCzR";

// Instance B: Super Admin Auth, Audit Logs, Sellers, Pickup Locations, Inventory, Settlements, Reports, Notifications
const supabaseBUrl = process.env.NEXT_PUBLIC_SUPABASE_B_URL ?? "https://qgiichnytbukisofuqiv.supabase.co";
const supabaseBAnonKey = process.env.NEXT_PUBLIC_SUPABASE_B_ANON_KEY ?? "sb_publishable_kMnEF2aqyz1z2SOB-sxtCQ_s4J-VisB";

export const supabaseA = createBrowserClient(supabaseAUrl, supabaseAAnonKey);
export const supabaseB = createBrowserClient(supabaseBUrl, supabaseBAnonKey);
export const supabase = supabaseB;
export const supabaseStorage = supabaseA;
