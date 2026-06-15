"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatBubble } from "./ChatBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatInput } from "./ChatInput";

const SUGGESTIONS = [
  "What's your return policy?",
  "Do you ship to Europe?",
  "How long does standard shipping take?",
  "What payment methods do you accept?",
];

export function ChatWidget() {
  const { messages, isLoading, isLoadingHistory, send, clearSession } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const isEmpty = !isLoadingHistory && messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-indigo-600 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            NT
          </div>
          <div>
            <p className="font-semibold text-sm">Nova Threads Support</p>
            <p className="text-xs text-indigo-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              AI Agent · Online
            </p>
          </div>
        </div>
        <button
          onClick={clearSession}
          title="Start new conversation"
          className="text-indigo-200 hover:text-white transition-colors text-xs flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.46-4.46M20 15a9 9 0 01-15.46 4.46" />
          </svg>
          New chat
        </button>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-400 text-sm">Loading conversation…</div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium text-sm">How can we help you today?</p>
              <p className="text-gray-400 text-xs mt-1">Ask about shipping, returns, orders, and more.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  );
}
