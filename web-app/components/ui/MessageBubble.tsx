"use client";

import React from "react";
import type { Message } from "../../types";

export function MessageBubble({
  message,
}: {
  message: Message;
}): React.ReactElement | null {
  // Empty content renders nothing — no empty bubble in the chat
  if (!message.content) return null;

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {/* whitespace-pre-wrap preserves newlines in multi-line responses */}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
