import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * This is a generic webhook endpoint.
 * Plug your payment provider here (Asaas/Mercado Pago/etc.)
 * and validate the signature to avoid fraud.
 *
 * Expected normalized payload (you adapt it in code):
 * {
 *   "user_id": "uuid",
 *   "status": "active" | "inactive" | "past_due" | "canceled",
 *   "current_period_end": "ISO string",
 *   "ebooks_remaining_in_period": 1
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.user_id) return NextResponse.json({ error: "missing user_id" }, { status: 400 });

    await supabaseAdmin.from("subscriptions").upsert({
      user_id: body.user_id,
      status: body.status ?? "active",
      plan: "basic",
      current_period_end: body.current_period_end ?? null,
      ebooks_remaining_in_period: body.ebooks_remaining_in_period ?? 1,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "webhook error" }, { status: 400 });
  }
}
