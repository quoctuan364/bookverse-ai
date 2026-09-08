import { create } from "zustand";

export type ReaderThemeKey = "dark" | "sepia" | "light";

interface ReaderSettingsState {
  theme: ReaderThemeKey;
  fontSize: number;
  lineHeightMultiplier: number;
  bookmarks: Record<string, number[]>; // bookId -> pageNumbers
  setTheme: (theme: ReaderThemeKey) => void;
  setFontSize: (size: number) => void;
  toggleBookmark: (bookId: string, pageNumber: number) => void;
  isBookmarked: (bookId: string, pageNumber: number) => boolean;
}

export const useReaderStore = create<ReaderSettingsState>((set, get) => ({
  theme: "sepia",
  fontSize: 18,
  lineHeightMultiplier: 1.6,
  bookmarks: {},

  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize: Math.max(14, Math.min(28, fontSize)) }),

  toggleBookmark: (bookId, pageNumber) => {
    const current = get().bookmarks[bookId] || [];
    const exists = current.includes(pageNumber);
    const updated = exists
      ? current.filter((p) => p !== pageNumber)
      : [...current, pageNumber].sort((a, b) => a - b);

    set((state) => ({
      bookmarks: {
        ...state.bookmarks,
        [bookId]: updated,
      },
    }));
  },

  isBookmarked: (bookId, pageNumber) => {
    const current = get().bookmarks[bookId] || [];
    return current.includes(pageNumber);
  },
}));
