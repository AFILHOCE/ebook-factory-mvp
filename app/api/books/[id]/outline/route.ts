import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { enqueueJob } from "@/lib/jobs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const { data: book } = await supabaseAdmin.from("books").select("*").eq("id", params.id).maybeSingle();
  if (!book || book.user_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await enqueueJob(user.id, "generate_outline", { book_id: params.id });
  await supabaseAdmin.from("books").update({ status: "draft" }).eq("id", params.id);

  return NextResponse.redirect(new URL(`/dashboard/books/${params.id}`, process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
