import { supabaseServer } from "@/lib/supabase";
import { Card, CardBody, CardHeader, H1, H2, Button, Notice, Pill, Separator } from "@/components/ui";
import Link from "next/link";
import { marked } from "marked";

async function getBook(sb: any, id: string) {
  const { data: book, error } = await sb.from("books").select("*").eq("id", id).maybeSingle();
  if (error || !book) return null;
  const { data: outline } = await sb.from("book_outlines").select("*").eq("book_id", id).maybeSingle();
  const { data: chapters } = await sb.from("chapters").select("*").eq("book_id", id).order("chapter_number", { ascending: true });
  const { data: exports } = await sb.from("exports").select("*").eq("book_id", id).order("created_at", { ascending: false });
  return { book, outline, chapters: chapters ?? [], exports: exports ?? [] };
}

export default async function BookPage({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const bundle = await getBook(sb, params.id);
  if (!bundle) {
    return <Notice tone="warn">Livro não encontrado.</Notice>;
  }

  const { book, outline, chapters, exports } = bundle;

  const toc = outline?.outline_json?.chapters ?? null;
  const titleOptions = outline?.outline_json?.title_options ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <H1>{book.title ?? "Ebook em construção"}</H1>
              <p className="text-sm text-zinc-600">{book.subtitle ?? "Gere o blueprint e escolha um título."}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <Pill>{book.language.toUpperCase()}</Pill>
                <Pill>{book.status}</Pill>
                <Pill>{book.niche}</Pill>
              </div>
            </div>
            <div className="flex gap-2">
              <form action={`/api/books/${book.id}/refresh`} method="post">
                <Button variant="secondary" type="submit">Atualizar status</Button>
              </form>
              <Link href="/dashboard"><Button variant="ghost">Voltar</Button></Link>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {!outline ? (
            <Notice tone="info">
              Blueprint está sendo gerado. Em produção, o cron processa jobs automaticamente; no dev, você pode apertar “Processar jobs”.
              <div className="mt-3 flex gap-2 flex-wrap">
                <form action="/api/jobs/process" method="post"><Button type="submit">Processar jobs</Button></form>
                <form action={`/api/books/${book.id}/outline`} method="post"><Button variant="secondary" type="submit">Regerar blueprint</Button></form>
              </div>
            </Notice>
          ) : (
            <>
              <Notice tone="ok">
                Blueprint pronto. Agora gere capítulos um por vez (isso melhora a qualidade e evita custo descontrolado).
              </Notice>

              {titleOptions ? (
                <Card className="border-zinc-200">
                  <CardHeader><H2>Opções de título (1 clique para aplicar)</H2></CardHeader>
                  <CardBody className="space-y-2">
                    {titleOptions.map((t: any, idx: number) => (
                      <form key={idx} action={`/api/books/${book.id}/apply-title`} method="post" className="rounded-xl border border-zinc-200 p-3">
                        <input type="hidden" name="title" value={t.title} />
                        <input type="hidden" name="subtitle" value={t.subtitle} />
                        <div className="font-medium">{t.title}</div>
                        <div className="text-sm text-zinc-600">{t.subtitle}</div>
                        <div className="text-xs text-zinc-500 mt-1">{t.angle}</div>
                        <div className="mt-2"><Button variant="secondary" type="submit">Aplicar</Button></div>
                      </form>
                    ))}
                  </CardBody>
                </Card>
              ) : null}

              {toc ? (
                <Card>
                  <CardHeader><H2>Sumário</H2></CardHeader>
                  <CardBody className="space-y-2">
                    {toc.map((c: any) => (
                      <div key={c.n} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
                        <div className="min-w-0">
                          <div className="font-medium">{c.n}. {c.title}</div>
                          <div className="text-xs text-zinc-600">{c.objective}</div>
                        </div>
                        <div className="flex gap-2">
                          <form action={`/api/books/${book.id}/chapters/${c.n}/generate`} method="post">
                            <Button variant="secondary" type="submit">Gerar</Button>
                          </form>
                          <form action={`/api/books/${book.id}/chapters/${c.n}/review`} method="post">
                            <Button variant="ghost" type="submit">Revisar</Button>
                          </form>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <form action="/api/jobs/process" method="post"><Button type="submit">Processar jobs</Button></form>
                      <form action={`/api/books/${book.id}/export/docx`} method="post"><Button variant="secondary" type="submit">Exportar DOCX</Button></form>
                      <form action={`/api/books/${book.id}/export/pdf`} method="post"><Button variant="ghost" type="submit">Exportar PDF</Button></form>
                    </div>
                  </CardBody>
                </Card>
              ) : null}
            </>
          )}

          {exports?.length ? (
            <Card>
              <CardHeader><H2>Exportações</H2></CardHeader>
              <CardBody className="space-y-2">
                {exports.map((ex: any) => (
                  <div key={ex.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                    <div className="text-sm">
                      <b>{ex.type.toUpperCase()}</b> • {new Date(ex.created_at).toLocaleString()}
                      <div className="text-xs text-zinc-500">{ex.storage_path}</div>
                    </div>
                    <Link className="underline text-sm" href={`/api/books/${book.id}/export/download?path=${encodeURIComponent(ex.storage_path)}`}>Baixar</Link>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Separator />

          <Card>
            <CardHeader><H2>Capítulos</H2></CardHeader>
            <CardBody className="space-y-4">
              {!chapters.length ? (
                <div className="text-sm text-zinc-600">Ainda não há capítulos gerados. Comece pelo capítulo 1.</div>
              ) : (
                chapters.map((ch: any) => (
                  <div key={ch.id} className="rounded-2xl border border-zinc-200 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{ch.chapter_number}. {ch.title}</div>
                        <div className="text-xs text-zinc-600">{ch.objective}</div>
                        <div className="text-xs text-zinc-500 mt-1"><Pill>{ch.status}</Pill></div>
                      </div>
                      <div className="flex gap-2">
                        <form action={`/api/books/${book.id}/chapters/${ch.chapter_number}/generate`} method="post">
                          <Button variant="secondary" type="submit">Regerar</Button>
                        </form>
                        <form action={`/api/books/${book.id}/chapters/${ch.chapter_number}/review`} method="post">
                          <Button variant="ghost" type="submit">Revisar</Button>
                        </form>
                      </div>
                    </div>
                    <div className="p-4 prose prose-zinc max-w-none">
                      {ch.content_md ? (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(ch.content_md) as any }} />
                      ) : (
                        <div className="text-sm text-zinc-600">Sem conteúdo ainda.</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </div>
  );
}
