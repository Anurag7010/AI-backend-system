"use client";

import React, { useState, useCallback } from "react";
import { useAsk } from "../../hooks/useAsk";
import { MessageBubble } from "../ui/MessageBubble";
import { AsyncBoundary } from "../ui/AsyncBoundary";

export function ChatInterface(): React.ReactElement {
  const { state, messages, ask, clearHistory } = useAsk();
  const [input, setInput] = useState("");

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query) return;
    setInput(""); // clear input immediately — before async call
    await ask(query);
  }, [input, ask]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const isLoading = state.status === "loading";

  return (
    <div className="flex h-full flex-col">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400">
            Ask a question to get started
          </p>
        )}
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {/* Status area — shown below messages */}
        <AsyncBoundary
          state={state}
          renderLoading={() => (
            <div className="flex justify-start mb-3">
              <div className="rounded-2xl bg-gray-100 px-4 py-2">
                <div className="flex gap-1">
                  <span className="animate-bounce text-gray-400">●</span>
                  <span
                    className="animate-bounce text-gray-400"
                    style={{ animationDelay: "0.1s" }}
                  >
                    ●
                  </span>
                  <span
                    className="animate-bounce text-gray-400"
                    style={{ animationDelay: "0.2s" }}
                  >
                    ●
                  </span>
                </div>
              </div>
            </div>
          )}
          renderError={(error) => (
            <p className="text-center text-xs text-red-500 mt-2">{error}</p>
          )}
          renderSuccess={() => null} // success is already shown via messages array
          renderIdle={() => null}
        />
      </div>

      {/* Controls */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />

          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>

          {isLoading && (
            <button
              onClick={clearHistory}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Clear history
          </button>
        )}
      </div>
    </div>
  );
}
