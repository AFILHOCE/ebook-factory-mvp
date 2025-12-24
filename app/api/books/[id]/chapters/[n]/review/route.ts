import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { enqueueJob } from "@/lib/jobs";

export async function POST(_req: Request, { params }: { params: { id: string; n: string } }) {
  const user = await requireUser();
  const n = Number(params.n);

  const { data: book } = await supabaseAdmin.from("books").select("*").eq("id", params.id).maybeSingle();
  if (!book || book.user_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await enqueueJob(user.id, "review_chapter", { book_id: params.id, chapter_number: n });
  await supabaseAdmin.from("books").update({ status: "editing" }).eq("id", params.id);

  return NextResponse.redirect(new URL(`/dashboard/books/${params.id}`, process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
