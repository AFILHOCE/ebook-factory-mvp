export type BookStatus = "draft" | "blueprint_ready" | "writing" | "editing" | "done";
export type ChapterStatus = "pending" | "writing" | "reviewing" | "done" | "failed";
export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type Book = {
  id: string;
  user_id: string;
  title: string | null;
  subtitle: string | null;
  language: "pt" | "en";
  niche: string;
  target_audience: string;
  tone: string;
  promise: string;
  constraints: string | null;
  sources: string | null;
  status: BookStatus;
  word_target_min: number;
  word_target_max: number;
  created_at: string;
};

export type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  objective: string;
  content_md: string | null;
  status: ChapterStatus;
  updated_at: string;
};

export type Outline = {
  book_id: string;
  outline_json: any;
  created_at: string;
};
