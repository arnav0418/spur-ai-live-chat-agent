"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { sendMessage, fetchHistory, ApiError } from "@/lib/api";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  isError?: boolean;
}

const SESSION_KEY = "spur_session_id";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      setIsLoadingHistory(false);
      return;
    }

    fetchHistory(stored)
      .then((data) => {
        if (!isMounted.current) return;
        setSessionId(data.sessionId);
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
          }))
        );
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY);
      })
      .finally(() => {
        if (isMounted.current) setIsLoadingHistory(false);
      });
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const data = await sendMessage(trimmed, sessionId ?? undefined);

        if (!isMounted.current) return;

        if (!sessionId) {
          setSessionId(data.sessionId);
          sessionStorage.setItem(SESSION_KEY, data.sessionId);
        }

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), sender: "ai", text: data.reply },
        ]);
      } catch (err) {
        if (!isMounted.current) return;

        let errorText = "Something went wrong. Please try again.";
        if (err instanceof ApiError) errorText = err.message;
        else if (err instanceof Error && err.name === "TimeoutError") {
          errorText = "The request timed out. Please try again.";
        }

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), sender: "ai", text: errorText, isError: true },
        ]);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([]);
  }, []);

  return { messages, isLoading, isLoadingHistory, send, clearSession, sessionId };
}
