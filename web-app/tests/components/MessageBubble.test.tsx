import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../../components/ui/MessageBubble";
import type { Message } from "../../types";

describe("MessageBubble", () => {
  it("user message is right-aligned (flex-row-reverse)", () => {
    const message: Message = { role: "user", content: "hello" };
    const { container } = render(<MessageBubble message={message} />);
    // New layout: flex-row-reverse on the wrapper row for user messages
    expect(container.querySelector(".flex-row-reverse")).toBeInTheDocument();
  });

  it("assistant message is not right-aligned", () => {
    const message: Message = { role: "assistant", content: "hello" };
    const { container } = render(<MessageBubble message={message} />);
    expect(container.querySelector(".flex-row-reverse")).not.toBeInTheDocument();
  });

  it("renders message content", () => {
    const message: Message = { role: "user", content: "What is RAG?" };
    render(<MessageBubble message={message} />);
    expect(screen.getByText("What is RAG?")).toBeInTheDocument();
  });

  it("renders nothing when content is empty string", () => {
    const message: Message = { role: "user", content: "" };
    const { container } = render(<MessageBubble message={message} />);
    expect(container.firstChild).toBeNull();
  });

  it("user message content uses whitespace-pre-wrap", () => {
    const message: Message = {
      role: "user",
      content: "Line one\nLine two",
    };
    const { container } = render(<MessageBubble message={message} />);
    const preWrap = container.querySelector(".whitespace-pre-wrap");
    expect(preWrap).toBeInTheDocument();
    expect(preWrap?.textContent).toBe("Line one\nLine two");
  });
});
