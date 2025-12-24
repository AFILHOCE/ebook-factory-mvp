import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { env } from "@/lib/env";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "missing path" }, { status: 400 });

  const { data: book } = await supabaseAdmin.from("books").select("*").eq("id", params.id).maybeSingle();
  if (!book || book.user_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Signed URL from Supabase Storage
  const { data, error } = await supabaseAdmin.storage.from("exports").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: error?.message ?? "failed" }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
