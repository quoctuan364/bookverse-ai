"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface ReaderHighlightItem {
  id: string;
  bookId: string;
  pageNumber: number;
  blockId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  text: string;
  note: string | null;
  createdAt: string;
}

interface SelectionDraft {
  blockId: string;
  startOffset: number;
  endOffset: number;
  text: string;
}

interface HighlightContextValue {
  highlights: ReaderHighlightItem[];
  selectionDraft: SelectionDraft | null;
  isLoading: boolean;
  message: string | null;
  captureSelection: () => void;
  saveSelectionHighlight: (note?: string) => Promise<void>;
  renderHighlightedText: (text: string, blockId: string) => ReactNode;
  refreshHighlights: () => Promise<void>;
}

interface HighlightProviderProps {
  bookId: string;
  currentPage: number;
  children: ReactNode;
}

const HighlightContext = createContext<HighlightContextValue | null>(null);

function isHighlightItem(value: unknown): value is ReaderHighlightItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as ReaderHighlightItem;

  return (
    typeof item.id === "string" &&
    typeof item.bookId === "string" &&
    typeof item.pageNumber === "number" &&
    (typeof item.blockId === "string" || item.blockId === null) &&
    (typeof item.startOffset === "number" || item.startOffset === null) &&
    (typeof item.endOffset === "number" || item.endOffset === null) &&
    typeof item.text === "string"
  );
}

function isHighlightsResponse(value: unknown): value is { success: true; data: ReaderHighlightItem[] } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as { success?: unknown; data?: unknown };

  return response.success === true && Array.isArray(response.data) && response.data.every(isHighlightItem);
}

function getElementFromNode(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }

  if (node instanceof HTMLElement) {
    return node;
  }

  return node.parentElement;
}

function getSelectionDraft(): SelectionDraft | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();

  if (!selectedText) {
    return null;
  }

  const startElement = getElementFromNode(range.startContainer);
  const endElement = getElementFromNode(range.endContainer);
  const startBlock = startElement?.closest<HTMLElement>("[data-reader-block-id]");
  const endBlock = endElement?.closest<HTMLElement>("[data-reader-block-id]");

  if (!startBlock || !endBlock || startBlock.dataset.readerBlockId !== endBlock.dataset.readerBlockId) {
    return null;
  }

  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(startBlock);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);

  const startOffset = preSelectionRange.toString().length;
  const endOffset = startOffset + selectedText.length;

  return {
    blockId: startBlock.dataset.readerBlockId ?? "",
    startOffset,
    endOffset,
    text: selectedText,
  };
}

function getHighlightsForBlock(text: string, blockId: string, highlights: ReaderHighlightItem[]) {
  return highlights
    .map((highlight) => {
      if (highlight.blockId === blockId && highlight.startOffset !== null && highlight.endOffset !== null) {
        return {
          ...highlight,
          startOffset: highlight.startOffset,
          endOffset: highlight.endOffset,
        };
      }

      const fallbackIndex = highlight.text ? text.indexOf(highlight.text) : -1;
      if (fallbackIndex < 0) {
        return null;
      }

      return {
        ...highlight,
        startOffset: fallbackIndex,
        endOffset: fallbackIndex + highlight.text.length,
      };
    })
    .filter((highlight): highlight is ReaderHighlightItem & { startOffset: number; endOffset: number } =>
      Boolean(highlight),
    )
    .filter((highlight) => highlight.endOffset > highlight.startOffset)
    .sort((left, right) => left.startOffset - right.startOffset);
}

export function HighlightProvider({ bookId, currentPage, children }: HighlightProviderProps) {
  const [highlights, setHighlights] = useState<ReaderHighlightItem[]>([]);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshHighlights = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/highlights?bookId=${encodeURIComponent(bookId)}`, {
        cache: "no-store",
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isHighlightsResponse(payload)) {
        throw new Error("API highlight trả dữ liệu không hợp lệ.");
      }

      setHighlights(payload.data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Không thể tải highlight.";
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void refreshHighlights();
  }, [refreshHighlights]);

  const captureSelection = useCallback(() => {
    const draft = getSelectionDraft();
    setSelectionDraft(draft);

    if (!draft) {
      setMessage("Hãy bôi đen một đoạn trong nội dung đọc trước khi lưu highlight.");
    }
  }, []);

  const saveSelectionHighlight = useCallback(
    async (note?: string) => {
      const draft = selectionDraft ?? getSelectionDraft();

      if (!draft) {
        setMessage("Chưa có đoạn bôi đen hợp lệ để lưu.");
        return;
      }

      const response = await fetch("/api/highlights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          pageNumber: currentPage,
          blockId: draft.blockId,
          startOffset: draft.startOffset,
          endOffset: draft.endOffset,
          text: draft.text,
          note,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok || !payload || typeof payload !== "object" || (payload as { success?: unknown }).success !== true) {
        throw new Error("Không thể lưu highlight.");
      }

      setSelectionDraft(null);
      setMessage("Đã lưu highlight từ đoạn bôi đen.");
      await refreshHighlights();
    },
    [bookId, currentPage, refreshHighlights, selectionDraft],
  );

  const renderHighlightedText = useCallback(
    (text: string, blockId: string) => {
      const blockHighlights = getHighlightsForBlock(text, blockId, highlights);

      if (blockHighlights.length === 0) {
        return text;
      }

      const segments: ReactNode[] = [];
      let cursor = 0;

      for (const highlight of blockHighlights) {
        const startOffset = Math.max(cursor, Math.min(highlight.startOffset, text.length));
        const endOffset = Math.max(startOffset, Math.min(highlight.endOffset, text.length));

        if (startOffset > cursor) {
          segments.push(text.slice(cursor, startOffset));
        }

        if (endOffset > startOffset) {
          segments.push(
            <mark
              className="rounded bg-[#F2C14E]/35 px-0.5 text-inherit ring-1 ring-[#F2C14E]/30"
              data-highlight-id={highlight.id}
              key={highlight.id}
              title={highlight.note ?? highlight.text}
            >
              {text.slice(startOffset, endOffset)}
            </mark>,
          );
        }

        cursor = endOffset;
      }

      if (cursor < text.length) {
        segments.push(text.slice(cursor));
      }

      return segments;
    },
    [highlights],
  );

  const value = useMemo<HighlightContextValue>(
    () => ({
      highlights,
      selectionDraft,
      isLoading,
      message,
      captureSelection,
      saveSelectionHighlight,
      renderHighlightedText,
      refreshHighlights,
    }),
    [
      captureSelection,
      highlights,
      isLoading,
      message,
      refreshHighlights,
      renderHighlightedText,
      saveSelectionHighlight,
      selectionDraft,
    ],
  );

  return <HighlightContext.Provider value={value}>{children}</HighlightContext.Provider>;
}

export function useHighlightEngine(): HighlightContextValue | null {
  return useContext(HighlightContext);
}
