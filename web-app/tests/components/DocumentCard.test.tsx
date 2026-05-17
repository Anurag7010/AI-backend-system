import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentCard } from "../../components/ui/DocumentCard";
import { toDocumentId } from "../../types";
import type { DocumentSummary, DocumentStatus } from "../../types";

function makeDoc(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: toDocumentId("doc-001"),
    filename: "test-document.pdf",
    status: "ingested",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("DocumentCard", () => {
  it("renders filename", () => {
    render(
      <DocumentCard document={makeDoc({ filename: "test-document.pdf" })} />,
    );
    expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
  });

  it.each<DocumentStatus>(["pending", "ingested", "failed"])(
    "renders correct status badge for status: %s",
    (status) => {
      render(<DocumentCard document={makeDoc({ status })} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );

  it("does not render delete button when onDelete is not provided", () => {
    render(<DocumentCard document={makeDoc()} />);
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });

  it("renders delete button when onDelete is provided", () => {
    render(<DocumentCard document={makeDoc()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("calls onDelete with correct DocumentId when delete button clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const doc = makeDoc({ id: toDocumentId("doc-abc") });

    render(<DocumentCard document={doc} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("doc-abc");
  });

  it("renders createdAt as relative time", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    render(<DocumentCard document={makeDoc({ createdAt: twoHoursAgo })} />);
    expect(screen.getByText(/2 hours ago/)).toBeInTheDocument();
  });
});
