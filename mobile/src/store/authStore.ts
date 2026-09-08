import { create } from "zustand";
import { UserProfile, SubscriptionInfo } from "../types";

interface AuthState {
  user: UserProfile | null;
  subscription: SubscriptionInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  setSubscription: (sub: SubscriptionInfo | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: "demo-reader-id",
    name: "Độc giả BookVerse",
    email: "reader@bookverse.ai",
    role: "BUYER",
    dailyGoalMinutes: 30,
    streakDays: 7,
  },
  subscription: {
    id: "sub-demo-01",
    status: "ACTIVE",
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    plan: { name: "Gói Hội Viên Tháng" },
  },
  token: "demo-jwt-token",
  isAuthenticated: true,
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, subscription: null, isAuthenticated: false }),
  setSubscription: (subscription) => set({ subscription }),
}));
