export type BookInputs = {
  language: "pt" | "en";
  niche: string;
  targetAudience: string;
  tone: string;
  promise: string;
  constraints?: string;
  sources?: string;
};

export const bannedFillerPt = [
  "em suma",
  "vale destacar",
  "de modo geral",
  "é importante ressaltar",
  "neste contexto",
  "por conseguinte"
];

export const systemOrchestrator = (lang: "pt" | "en") =>
  lang === "pt"
    ? `Você é um editor-chefe. Sua missão é gerar ebooks publicáveis e úteis, com densidade real e sem enrolação.
Regras:
- Nada de clichês de IA, nada de parágrafos vazios. Cada seção deve ensinar, exemplificar ou aplicar.
- Evite frases genéricas e repetição.
- Use exemplos concretos (preferir Brasil quando fizer sentido).
- Não invente dados ou estatísticas. Se precisar de números, peça ao usuário ou use linguagem qualitativa.
- Estilo: claro, direto, profissional e agradável.
- Estrutura: capítulos com abertura forte, conceito central, aprofundamento, aplicação prática, checklist, resumo e gancho.`
    : `You are a chief editor. Your mission is to produce publishable, genuinely useful ebooks with real density—no fluff.
Rules:
- No AI clichés, no empty paragraphs. Every section must teach, exemplify, or apply.
- Avoid generic phrasing and repetition.
- Use concrete examples (use US/UK context when appropriate).
- Do not invent stats or data. If numbers are needed, ask the user or stay qualitative.
- Style: clear, direct, professional, pleasant.
- Structure: chapters with strong hook, core concept, deep dive, practical application, checklist, recap, and a hook to the next chapter.`;

export const outlinePrompt = (inputs: BookInputs) => {
  const lang = inputs.language;
  const pt = lang === "pt";
  return pt
    ? `Crie um BLUEPRINT editorial para um ebook. NÃO escreva os capítulos ainda.
Dados:
- Nicho: ${inputs.niche}
- Público: ${inputs.targetAudience}
- Tom: ${inputs.tone}
- Promessa do livro: ${inputs.promise}
- Restrições adicionais: ${inputs.constraints ?? "nenhuma"}
- Materiais do usuário (se houver): ${inputs.sources ?? "nenhum"}

Saída em JSON com este formato EXATO:
{
  "title_options": [{"title":"", "subtitle":"", "angle":""}, ... (3)],
  "book_promise": "",
  "style_guide": {
    "voice": "",
    "do": ["..."],
    "dont": ["..."],
    "banned_phrases": [${bannedFillerPt.map(s => `"${s}"`).join(", ")}]
  },
  "chapters": [
    {
      "n": 1,
      "title": "",
      "objective": "",
      "reader_will_be_able_to": ["..."],
      "must_include": ["..."],
      "avoid_repeating": ["..."],
      "example_seed": "um exemplo específico sugerido"
    }
  ]
}
Regras:
- 8 a 10 capítulos.
- Cada capítulo deve ter 1 ideia central (não 5).
- "avoid_repeating" deve ser real (algo que já apareceu antes).`
    : `Create an editorial BLUEPRINT for an ebook. Do NOT write chapters yet.
Inputs:
- Niche: ${inputs.niche}
- Audience: ${inputs.targetAudience}
- Tone: ${inputs.tone}
- Book promise: ${inputs.promise}
- Additional constraints: ${inputs.constraints ?? "none"}
- User materials (if any): ${inputs.sources ?? "none"}

Return JSON in this EXACT format:
{
  "title_options": [{"title":"", "subtitle":"", "angle":""}, ... (3)],
  "book_promise": "",
  "style_guide": {
    "voice": "",
    "do": ["..."],
    "dont": ["..."],
    "banned_phrases": ["in summary","it is important to note","in this context","generally speaking"]
  },
  "chapters": [
    {
      "n": 1,
      "title": "",
      "objective": "",
      "reader_will_be_able_to": ["..."],
      "must_include": ["..."],
      "avoid_repeating": ["..."],
      "example_seed": "a specific example suggestion"
    }
  ]
}
Rules:
- 8–10 chapters.
- Each chapter must have ONE core idea.
- "avoid_repeating" must be meaningful, based on prior chapters.`;
};

export const chapterPrompt = (lang: "pt" | "en", outlineJson: any, chapter: any) => {
  const pt = lang === "pt";
  const guide = outlineJson?.style_guide ? JSON.stringify(outlineJson.style_guide) : "{}";
  return pt
    ? `Escreva o CAPÍTULO ${chapter.n} do ebook.
Contexto editorial (style guide): ${guide}
Sumário completo: ${JSON.stringify(outlineJson.chapters)}
Capítulo alvo: ${JSON.stringify(chapter)}

Regras de qualidade:
- 3.200 a 3.800 palavras (aprox. 10–12 páginas em livro digital), densas e úteis.
- Estrutura obrigatória:
  1) Abertura forte (história curta, caso, ou provocação)
  2) Promessa do capítulo (1 parágrafo)
  3) Conceito central (explicação clara)
  4) Aprofundamento (2–4 seções com subtítulos)
  5) Exemplo concreto (use "example_seed" como base)
  6) Aplicação prática (passo a passo)
  7) Checklist (bullet points)
  8) Resumo + gancho para o próximo capítulo
- Proibido usar as frases em style_guide.banned_phrases.
- Não repita os tópicos em "avoid_repeating".
- Não invente estatísticas.
Formato de saída: Markdown com títulos (##) e listas.`
    : `Write CHAPTER ${chapter.n} of the ebook.
Editorial context (style guide): ${guide}
Full table of contents: ${JSON.stringify(outlineJson.chapters)}
Target chapter: ${JSON.stringify(chapter)}

Quality rules:
- 3,200 to 3,800 words (about 10–12 ebook pages), dense and useful.
- Required structure:
  1) Strong hook (short story, case, or provocative opening)
  2) Chapter promise (1 paragraph)
  3) Core concept (clear explanation)
  4) Deep dive (2–4 sections with headings)
  5) Concrete example (use example_seed)
  6) Practical application (step-by-step)
  7) Checklist (bullets)
  8) Recap + hook to next chapter
- Do NOT use banned phrases from style_guide.banned_phrases.
- Do NOT repeat items in avoid_repeating.
- Do not invent statistics.
Output format: Markdown with headings (##) and lists.`;
};

export const editPrompt = (lang: "pt" | "en", outlineJson: any, chapter: any, chapterMarkdown: string) => {
  const pt = lang === "pt";
  const guide = outlineJson?.style_guide ? JSON.stringify(outlineJson.style_guide) : "{}";
  return pt
    ? `Você é EDITOR. Revise o capítulo abaixo para ficar publicável.
Objetivo do capítulo: ${chapter.objective}
"Não repetir": ${JSON.stringify(chapter.avoid_repeating)}
Style guide: ${guide}

Tarefas:
- Cortar repetição e “frases vazias”.
- Tornar exemplos mais concretos e úteis.
- Remover qualquer frase genérica de IA.
- Garantir que a estrutura obrigatória está presente.
- Manter 3.200–3.800 palavras (se passar muito, corte; se faltar, adicione profundidade com exemplos e aplicação).

Capítulo (Markdown):
${chapterMarkdown}

Saída: o capítulo revisado em Markdown.`
    : `You are the EDITOR. Revise the chapter below to be publication-ready.
Chapter objective: ${chapter.objective}
"Do not repeat": ${JSON.stringify(chapter.avoid_repeating)}
Style guide: ${guide}

Tasks:
- Cut repetition and empty phrasing.
- Make examples more concrete and useful.
- Remove AI-generic language.
- Ensure the required structure exists.
- Keep 3,200–3,800 words (trim if too long; if short, add depth with examples and application).

Chapter (Markdown):
${chapterMarkdown}

Output: revised chapter in Markdown.`;
};
