import { supabaseServer } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function requireUser() {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("UNAUTHENTICATED");
  return data.user;
}

export async function requireActiveSubscription(userId: string) {
  const { data: sub } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (!sub || sub.status !== "active") {
    return { ok: false as const, reason: "inactive" as const, sub };
  }
  if ((sub.ebooks_remaining_in_period ?? 0) <= 0) {
    return { ok: false as const, reason: "no_credits" as const, sub };
  }
  return { ok: true as const, sub };
}
