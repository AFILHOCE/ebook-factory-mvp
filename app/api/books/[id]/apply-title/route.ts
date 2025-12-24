import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const form = await req.formData();
  const title = String(form.get("title") ?? "");
  const subtitle = String(form.get("subtitle") ?? "");

  // Ensure ownership
  const { data: book } = await supabaseAdmin.from("books").select("*").eq("id", params.id).maybeSingle();
  if (!book || book.user_id !== user.id) return NextResponse.redirect(new URL("/dashboard", process.env.APP_BASE_URL ?? "http://localhost:3000"));

  await supabaseAdmin.from("books").update({ title, subtitle }).eq("id", params.id);

  return NextResponse.redirect(new URL(`/dashboard/books/${params.id}`, process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
