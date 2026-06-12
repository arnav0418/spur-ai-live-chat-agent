import { eq, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/client";
import { conversations, messages, type Message } from "../db/schema";
import type { ChatMessage } from "./llm";

export async function getOrCreateConversation(sessionId?: string): Promise<string> {
  if (sessionId) {
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, sessionId))
      .limit(1);

    if (existing.length > 0) {
      const now = new Date();
      await db
        .update(conversations)
        .set({ updatedAt: now })
        .where(eq(conversations.id, sessionId));
      return sessionId;
    }
  }

  const id = uuidv4();
  const now = new Date();
  await db.insert(conversations).values({ id, createdAt: now, updatedAt: now });
  return id;
}

export async function saveMessage(
  conversationId: string,
  sender: "user" | "ai",
  text: string
): Promise<Message> {
  const id = uuidv4();
  const createdAt = new Date();
  const [msg] = await db
    .insert(messages)
    .values({ id, conversationId, sender, text, createdAt })
    .returning();
  return msg;
}

export async function getConversationHistory(conversationId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export function toApiMessages(msgs: Message[]): ChatMessage[] {
  return msgs.map((m) => ({
    role: m.sender === "user" ? "user" : "assistant",
    content: m.text,
  }));
}
