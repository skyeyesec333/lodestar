import { z } from "zod";

export const CHAT_ROLE_VALUES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLE_VALUES)[number];

export const chatMessageSchema = z.object({
  role: z.enum(CHAT_ROLE_VALUES),
  content: z.string().trim().min(1).max(8000),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  pageContext: z.string().trim().max(1000).optional(),
  context: z
    .object({
      page: z.enum(["projects_list", "project_detail"]).optional(),
      projectId: z.string().min(1).optional(),
      projectSlug: z.string().min(1).optional(),
    })
    .optional(),
  messages: z.array(chatMessageSchema).max(24).default([]),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatRuntimeContext = NonNullable<ChatRequest["context"]>;

export interface ChatCitation {
  readonly title: string;
  readonly url: string;
  readonly sourceType: "app" | "official_exim";
  readonly lastVerifiedAt?: string;
}

export interface ChatContextDocument {
  readonly id: string;
  readonly title: string;
  readonly snippet: string;
  readonly sourceType: "app" | "official_exim";
  readonly url?: string;
  readonly lastVerifiedAt?: string;
}
