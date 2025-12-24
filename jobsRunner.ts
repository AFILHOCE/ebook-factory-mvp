import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { systemOrchestrator, outlinePrompt, chapterPrompt, editPrompt } from "@/lib/prompts";
import { runText } from "@/lib/openai";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import PDFDocument from "pdfkit";
import { marked } from "marked";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini"; // set OPENAI_MODEL in env if needed

function safeJsonParse(text: string) {
  // Best-effort to extract JSON from model output.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = text.slice(start, end + 1);
    return JSON.parse(slice);
  }
  return JSON.parse(text);
}

async function getBundle(bookId: string) {
  const { data: book, error } = await supabaseAdmin.from("books").select("*").eq("id", bookId).maybeSingle();
  if (error || !book) throw new Error("BOOK_NOT_FOUND");
  const { data: outline } = await supabaseAdmin.from("book_outlines").select("*").eq("book_id", bookId).maybeSingle();
  const { data: chapters } = await supabaseAdmin.from("chapters").select("*").eq("book_id", bookId).order("chapter_number", { ascending: true });
  return { book, outline, chapters: chapters ?? [] };
}

export async function runJob(job: any) {
  const type = job.type as string;
  const payload = job.payload as any;

  if (type === "generate_outline") {
    await generateOutline(payload.book_id);
    return;
  }
  if (type === "generate_chapter") {
    await generateChapter(payload.book_id, Number(payload.chapter_number));
    return;
  }
  if (type === "review_chapter") {
    await reviewChapter(payload.book_id, Number(payload.chapter_number));
    return;
  }
  if (type === "export_docx") {
    await exportDocx(payload.book_id);
    return;
  }
  if (type === "export_pdf") {
    await exportPdf(payload.book_id);
    return;
  }

  throw new Error("UNKNOWN_JOB_TYPE");
}

async function generateOutline(bookId: string) {
  const { book } = await getBundle(bookId);
  const inputs = {
    language: book.language,
    niche: book.niche,
    targetAudience: book.target_audience,
    tone: book.tone,
    promise: book.promise,
    constraints: book.constraints ?? undefined,
    sources: book.sources ?? undefined
  } as any;

  const system = systemOrchestrator(book.language);
  const prompt = outlinePrompt(inputs);

  const { text } = await runText(MODEL, system, prompt);
  const outlineJson = safeJsonParse(text);

  // Save outline
  await supabaseAdmin.from("book_outlines").upsert({ book_id: bookId, outline_json: outlineJson });

  // Create chapter stubs
  const chapters = outlineJson?.chapters ?? [];
  for (const c of chapters) {
    await supabaseAdmin.from("chapters").upsert({
      book_id: bookId,
      chapter_number: c.n,
      title: c.title,
      objective: c.objective,
      status: "pending",
      content_md: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "book_id,chapter_number" });
  }

  // Set title from first option if empty
  if (!book.title && outlineJson?.title_options?.[0]) {
    await supabaseAdmin.from("books").update({
      title: outlineJson.title_options[0].title,
      subtitle: outlineJson.title_options[0].subtitle,
      status: "blueprint_ready"
    }).eq("id", bookId);
  } else {
    await supabaseAdmin.from("books").update({ status: "blueprint_ready" }).eq("id", bookId);
  }

  // Create default subscription row if missing (MVP convenience)
  await supabaseAdmin.from("subscriptions").upsert({
    user_id: book.user_id,
    status: "active",
    plan: "basic",
    ebooks_remaining_in_period: 0, // already consumed on creation
    updated_at: new Date().toISOString()
  });
}

async function generateChapter(bookId: string, n: number) {
  const { book, outline } = await getBundle(bookId);
  if (!outline?.outline_json) throw new Error("OUTLINE_NOT_READY");

  const chapter = outline.outline_json.chapters.find((c: any) => Number(c.n) === n);
  if (!chapter) throw new Error("CHAPTER_NOT_IN_OUTLINE");

  await supabaseAdmin.from("chapters").update({ status: "writing", updated_at: new Date().toISOString() }).eq("book_id", bookId).eq("chapter_number", n);

  const system = systemOrchestrator(book.language);
  const prompt = chapterPrompt(book.language, outline.outline_json, chapter);
  const { text } = await runText(MODEL, system, prompt);

  await supabaseAdmin
    .from("chapters")
    .update({ content_md: text, status: "reviewing", updated_at: new Date().toISOString() })
    .eq("book_id", bookId)
    .eq("chapter_number", n);
}

async function reviewChapter(bookId: string, n: number) {
  const { book, outline, chapters } = await getBundle(bookId);
  if (!outline?.outline_json) throw new Error("OUTLINE_NOT_READY");

  const row = chapters.find((c: any) => Number(c.chapter_number) === n);
  if (!row?.content_md) throw new Error("CHAPTER_NOT_WRITTEN");

  const chapterMeta = outline.outline_json.chapters.find((c: any) => Number(c.n) === n);
  if (!chapterMeta) throw new Error("CHAPTER_META_MISSING");

  await supabaseAdmin.from("chapters").update({ status: "reviewing", updated_at: new Date().toISOString() }).eq("book_id", bookId).eq("chapter_number", n);

  const system = systemOrchestrator(book.language);
  const prompt = editPrompt(book.language, outline.outline_json, chapterMeta, row.content_md);

  const { text } = await runText(MODEL, system, prompt);

  await supabaseAdmin
    .from("chapters")
    .update({ content_md: text, status: "done", updated_at: new Date().toISOString() })
    .eq("book_id", bookId)
    .eq("chapter_number", n);

  // If all chapters done => mark book done
  const { data: updatedChapters } = await supabaseAdmin.from("chapters").select("status").eq("book_id", bookId);
  const allDone = (updatedChapters ?? []).length > 0 && (updatedChapters ?? []).every((c: any) => c.status === "done");
  if (allDone) await supabaseAdmin.from("books").update({ status: "done" }).eq("id", bookId);
}

function mdToPlain(md: string) {
  // quick & safe-ish: use marked to HTML and strip tags
  const html = marked.parse(md) as string;
  const plain = html.replace(/<[^>]+>/g, "");
  return plain;
}

async function exportDocx(bookId: string) {
  const { book, chapters } = await getBundle(bookId);
  if (!chapters.length) throw new Error("NO_CHAPTERS");

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: book.title ?? "Ebook", heading: HeadingLevel.TITLE }),
          ...(book.subtitle ? [new Paragraph({ text: book.subtitle })] : []),
          new Paragraph({ text: "" }),
          ...chapters
            .filter((c: any) => c.status === "done" && c.content_md)
            .flatMap((c: any) => {
              const plain = mdToPlain(c.content_md);
              const parts = plain.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
              return [
                new Paragraph({ text: `${c.chapter_number}. ${c.title}`, heading: HeadingLevel.HEADING_1 }),
                ...parts.map((p) => new Paragraph({ text: p }))
              ];
            })
        ]
      }
    ]
  });

  const buf = await Packer.toBuffer(doc);

  const fileName = `book-${bookId}-${Date.now()}.docx`;
  const storagePath = `docx/${fileName}`;

  const { error } = await supabaseAdmin.storage.from("exports").upload(storagePath, buf, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true
  });
  if (error) throw error;

  await supabaseAdmin.from("exports").insert({ book_id: bookId, type: "docx", storage_path: storagePath });
}

async function exportPdf(bookId: string) {
  const { book, chapters } = await getBundle(bookId);
  if (!chapters.length) throw new Error("NO_CHAPTERS");

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (d) => chunks.push(d));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(20).text(book.title ?? "Ebook", { align: "center" });
  if (book.subtitle) {
    doc.moveDown(0.5);
    doc.fontSize(12).text(book.subtitle, { align: "center" });
  }
  doc.moveDown(1);

  for (const ch of chapters.filter((c: any) => c.status === "done" && c.content_md)) {
    doc.addPage();
    doc.fontSize(16).text(`${ch.chapter_number}. ${ch.title}`);
    doc.moveDown(0.5);
    doc.fontSize(10).text(mdToPlain(ch.content_md), { align: "left" });
  }

  doc.end();
  const buf = await done;

  const fileName = `book-${bookId}-${Date.now()}.pdf`;
  const storagePath = `pdf/${fileName}`;

  const { error } = await supabaseAdmin.storage.from("exports").upload(storagePath, buf, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) throw error;

  await supabaseAdmin.from("exports").insert({ book_id: bookId, type: "pdf", storage_path: storagePath });
}
