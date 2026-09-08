export type UserRole = "BUYER" | "SELLER" | "MODERATOR" | "ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  dailyGoalMinutes?: number;
  streakDays?: number;
}

export interface Book {
  id: string;
  title: string;
  authorName: string;
  description: string | null;
  coverPath: string | null;
  price: number;
  rating: number | null;
  category?: {
    name: string;
    slug: string;
  };
  score?: number;
  evidence?: string;
}

export interface ReaderChapter {
  chapterNumber: number;
  chapterTitle: string;
  startPage: number;
  isLocked: boolean;
}

export interface ReaderPageContent {
  pageNumber: number;
  content: string;
  chapterNumber: number;
  chapterTitle: string;
  chunkIndex: number;
}

export interface ReaderBookContent {
  pages: ReaderPageContent[];
  chapters: ReaderChapter[];
  sourceLabel: string;
  access: "FULL" | "PREVIEW";
  visiblePageCount: number;
  totalPageCount: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  durationDays: number;
  features: string[];
}

export interface SubscriptionInfo {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";
  startsAt: string;
  endsAt: string;
  plan: {
    name: string;
  };
}

export type RootStackParamList = {
  MainTabs: undefined;
  BookDetail: { bookId: string };
  Reader: { bookId: string; initialChapter?: number };
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Catalog: undefined;
  Membership: undefined;
  Profile: undefined;
};
