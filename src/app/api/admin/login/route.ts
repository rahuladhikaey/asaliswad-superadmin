import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyPassword } from "@/lib/crypto";
import { supabaseServer } from "@shared/utils/supabaseServer";

// Simple in-memory rate limiting map (IP -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + limitWindow });
    return true;
  }

  if (record.count >= maxAttempts) {
    return false;
  }

  record.count += 1;
  return true;
}

async function recordAuditLog(username: string, ip: string, userAgent: string, action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED', details?: string) {
  try {
    await supabaseServer.from("admin_audit_logs").insert({
      username: username || "unknown",
      ip_address: ip,
      user_agent: userAgent,
      action: action,
      details: details || "",
    });
  } catch (err) {
    console.error("[Audit Log Error]:", err);
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Rate Limiting Check
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const username = (body.username ?? body.key1 ?? "").trim();
    const password = (body.password ?? body.key2 ?? "").trim();

    const ADMIN_ACCESS_KEY_1 = process.env.ADMIN_ACCESS_KEY_1 || "admin";
    const ADMIN_ACCESS_KEY_2 = process.env.ADMIN_ACCESS_KEY_2 || "admin123";
    const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "asaliswad_super_admin_jwt_secret_key_2026";

    if (!username || !password) {
      await recordAuditLog(username, ip, userAgent, "LOGIN_FAILED", "Missing credentials");
      return NextResponse.json({ success: false, message: "Username and password required." }, { status: 400 });
    }

    let isValidUser = false;
    let userRole = "SUPER_ADMIN";

    // 1. Check database for manually created admin in admin_users table
    const { data: dbAdmin } = await supabaseServer
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (dbAdmin) {
      isValidUser = await verifyPassword(password, dbAdmin.password_hash);
      userRole = dbAdmin.role || "SUPER_ADMIN";
    } else {
      // 2. Fallback to env configured Super Admin credentials
      if (username === ADMIN_ACCESS_KEY_1) {
        isValidUser = await verifyPassword(password, ADMIN_ACCESS_KEY_2);
      }
    }

    if (isValidUser && userRole === "SUPER_ADMIN") {
      const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

      // Create JWT token with SUPER_ADMIN role claim
      const token = await new SignJWT({ role: "SUPER_ADMIN", user: username })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET_KEY);

      await recordAuditLog(username, ip, userAgent, "LOGIN_SUCCESS", "Super Admin Authenticated");

      const response = NextResponse.json({ success: true, message: "Authorized as SUPER_ADMIN" });

      // Set HTTP-only secure cookie
      response.cookies.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    }

    await recordAuditLog(username, ip, userAgent, "LOGIN_FAILED", "Invalid username or password");
    return NextResponse.json(
      { success: false, message: "Invalid credentials or non-admin role." },
      { status: 401 }
    );

  } catch (error: any) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server authentication error." },
      { status: 500 }
    );
  }
}
