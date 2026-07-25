import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://asaliswad-backend.onrender.com';

    // Call backend admin analytics rollup API
    await fetch(`${backendUrl}/api/v1/cron/admin/analytics-rollup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      domain: 'admin.asaliswad.com',
      service: 'Super Admin Panel Cron',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
