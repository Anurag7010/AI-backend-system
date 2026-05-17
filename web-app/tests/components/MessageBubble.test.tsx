import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "../../components/ui/MessageBubble";
import type { Message } from "../../types";

describe("MessageBubble", () => {
  it("user message has right-alignment class", () => {
    const message: Message = { role: "user", content: "hello" };
    const { container } = render(<MessageBubble message={message} />);
    // justify-end aligns user messages to the right
    expect(container.querySelector(".justify-end")).toBeInTheDocument();
  });

  it("assistant message has left-alignment class", () => {
    const message: Message = { role: "assistant", content: "hello" };
    const { container } = render(<MessageBubble message={message} />);
    expect(container.querySelector(".justify-start")).toBeInTheDocument();
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

  it("preserves newlines in content via whitespace-pre-wrap class", () => {
    const message: Message = {
      role: "assistant",
      content: "Line one\nLine two",
    };
    const { container } = render(<MessageBubble message={message} />);
    // whitespace-pre-wrap tells the browser to render \n as line breaks
    const preWrap = container.querySelector(".whitespace-pre-wrap");
    expect(preWrap).toBeInTheDocument();
    // getByText normalizes whitespace — use textContent to check the raw newline
    expect(preWrap?.textContent).toBe("Line one\nLine two");
  });
});
