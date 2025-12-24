"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Button, Card, CardBody, CardHeader, Container, H1, Input, Label, Notice } from "@/components/ui";

export default function LoginPage() {
  const sb = supabaseBrowser();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const fn = mode === "signin" ? sb.auth.signInWithPassword : sb.auth.signUp;
      const { error } =
        mode === "signin"
          ? await fn({ email, password })
          : await fn({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
      if (error) setMsg(error.message);
      else setMsg(mode === "signup" ? "Conta criada! Se seu Supabase exigir confirmação de email, confirme e faça login." : "Logado!");
      if (!error && mode === "signin") window.location.href = "/dashboard";
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-16">
      <Card>
        <CardHeader>
          <H1>Ebook Factory</H1>
          <p className="text-sm text-zinc-600">Entre para criar ebooks completos (80–100 páginas) com fluxo simples e revisão automática.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          {msg ? <Notice tone={msg.includes("Logado") ? "ok" : "info"}>{msg}</Notice> : null}
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu@email.com" required />
            </div>
            <div>
              <Label>Senha</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
            </div>
            <Button disabled={busy} className="w-full">
              {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="text-sm text-zinc-600 flex items-center justify-between">
            <span>{mode === "signin" ? "Ainda não tem conta?" : "Já tem conta?"}</span>
            <button className="underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Criar conta" : "Entrar"}
            </button>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
