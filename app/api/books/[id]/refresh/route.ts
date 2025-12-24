import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.redirect(new URL(`/dashboard/books/${params.id}`, process.env.APP_BASE_URL ?? "http://localhost:3000"));
}
