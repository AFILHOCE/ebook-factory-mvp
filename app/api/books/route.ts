import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireActiveSubscription } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const schema = z.object({
  language: z.enum(["pt", "en"]),
  niche: z.string().min(2),
  targetAudience: z.string().min(3),
  tone: z.string().min(2),
  promise: z.string().min(10),
  constraints: z.string().optional(),
  sources: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = schema.parse(body);

    const subCheck = await requireActiveSubscription(user.id);
    if (!subCheck.ok) {
      return NextResponse.json({ error: subCheck.reason === "inactive" ? "Assinatura inativa." : "Sem créditos no ciclo." }, { status: 402 });
    }

    const { data: book, error } = await supabaseAdmin
      .from("books")
      .insert({
        user_id: user.id,
        language: parsed.language,
        niche: parsed.niche,
        target_audience: parsed.targetAudience,
        tone: parsed.tone,
        promise: parsed.promise,
        constraints: parsed.constraints ?? null,
        sources: parsed.sources ?? null,
        status: "draft",
        word_target_min: 32000,
        word_target_max: 38000
      })
      .select("*")
      .single();

    if (error) throw error;

    // Consume 1 credit immediately on book creation (prevents abuse).
    await supabaseAdmin
      .from("subscriptions")
      .update({ ebooks_remaining_in_period: Math.max(0, (subCheck.sub.ebooks_remaining_in_period ?? 0) - 1), updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ book_id: book.id });
  } catch (e: any) {
    const msg = e?.message ?? "Erro";
    const status = msg === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
