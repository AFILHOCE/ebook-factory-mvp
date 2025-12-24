import OpenAI from "openai";
import { envServer } from "@/lib/env.server";

export const openai = new OpenAI({ apiKey: envServer.OPENAI_API_KEY });

export async function runText(model: string, system: string, input: string) {
  const response = await openai.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: input }
    ]
  });
  return {
    text: response.output_text ?? "",
    usage: (response as any).usage ?? null
  };
}
