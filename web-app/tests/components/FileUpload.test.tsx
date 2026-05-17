import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "../../components/ui/FileUpload";
import type { UploadStateWithProgress } from "../../types";
import { toDocumentId } from "../../types";

const idleState: UploadStateWithProgress = { status: "idle" };

const mockIngestResponse = {
  documentId: toDocumentId("doc-001"),
  status: "ingested" as const,
  chunkCount: 5,
};

describe("FileUpload", () => {
  it("renders upload prompt in idle state", () => {
    render(<FileUpload onFile={vi.fn()} state={idleState} />);
    expect(screen.getByText(/drop a pdf here/i)).toBeInTheDocument();
  });

  it("shows progress bar with correct percentage in uploading state", () => {
    const state: UploadStateWithProgress = {
      status: "uploading",
      progress: 60,
    };
    const { container } = render(<FileUpload onFile={vi.fn()} state={state} />);

    expect(screen.getByText(/60%/)).toBeInTheDocument();
    const progressBar = container.querySelector('[style*="60%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("shows processing message in processing state", () => {
    const state: UploadStateWithProgress = { status: "processing" };
    render(<FileUpload onFile={vi.fn()} state={state} />);
    expect(screen.getByText(/processing document/i)).toBeInTheDocument();
  });

  it("shows success message in success state", () => {
    const state: UploadStateWithProgress = {
      status: "success",
      data: mockIngestResponse,
    };
    render(<FileUpload onFile={vi.fn()} state={state} />);
    expect(screen.getByText(/successfully/i)).toBeInTheDocument();
  });

  it("shows error message in error state", () => {
    const state: UploadStateWithProgress = {
      status: "error",
      error: "Upload failed",
    };
    render(<FileUpload onFile={vi.fn()} state={state} />);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("calls onFile when file is selected via input", async () => {
    // userEvent.upload correctly simulates the full browser file selection flow —
    // it sets files on the input and fires the change event in the right order.
    // fireEvent.change alone does not populate e.target.files correctly in jsdom.
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(<FileUpload onFile={onFile} state={idleState} />);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("calls onFile when file is dropped", () => {
    const onFile = vi.fn();
    const { container } = render(
      <FileUpload onFile={onFile} state={idleState} />,
    );

    // The inner div has the onDrop handler — not the outer wrapper div
    const dropZone = container.querySelector('[class*="border-dashed"]') as HTMLElement;
    const file = new File(["content"], "dropped.pdf", {
      type: "application/pdf",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("file input is disabled during uploading state", () => {
    const state: UploadStateWithProgress = { status: "uploading", progress: 0 };
    render(<FileUpload onFile={vi.fn()} state={state} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("file input is disabled during processing state", () => {
    const state: UploadStateWithProgress = { status: "processing" };
    render(<FileUpload onFile={vi.fn()} state={state} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
