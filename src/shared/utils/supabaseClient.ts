"use client";

import { createBrowserClient } from "@supabase/ssr";

// Unified Production DB Instance (Single Data Source for SuperAdmin, Customer, and Seller apps)
const unifiedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_B_URL ?? "https://qgiichnytbukisofuqiv.supabase.co";
const unifiedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_B_ANON_KEY ?? "sb_publishable_kMnEF2aqyz1z2SOB-sxtCQ_s4J-VisB";

export const supabaseA = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabaseB = createBrowserClient(unifiedUrl, unifiedAnonKey);
export const supabase = supabaseB;
export const supabaseStorage = supabaseA;
