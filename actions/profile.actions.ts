"use server";

import bcrypt from "bcrypt";
import { NotificationType, Prisma, TargetType } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { createNotification } from "@/lib/notifications";
import { getCurrentUser, PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

type DecimalLike = {
  toNumber: () => number;
};

export interface ProfileMetric {
  label: string;
  value: number;
}

export interface ProfileReadingItem {
  bookId: string;
  title: string;
  author: string;
  coverImage: string | null;
  currentPage: number;
  progressPercent: number;
  totalMinutes: number;
  lastReadAt: Date | null;
}

export interface ProfileOrderItem {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  books: string[];
}

export interface ProfileListingItem {
  id: string;
  title: string;
  price: number;
  status: string;
  views: number;
  cartAdds: number;
  purchases: number;
}

export interface ProfileHighlightItem {
  id: string;
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  text: string;
  note: string | null;
  createdAt: Date;
}

export interface ProfileRecommendationItem {
  id: string;
  bookId: string;
  title: string;
  author: string;
  score: number;
  reason: string | null;
}

export interface ProfileDashboardData {
  user: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    persona: string | null;
    preferredGenres: string[];
    bio: string | null;
    avatarUrl: string | null;
    dailyReadingGoalMinutes: number | null;
    dailyReadingGoalPages: number | null;
  };
  metrics: ProfileMetric[];
  reading: ProfileReadingItem[];
  orders: ProfileOrderItem[];
  listings: ProfileListingItem[];
  highlights: ProfileHighlightItem[];
  recommendations: ProfileRecommendationItem[];
}

export interface ProfileSettingsData {
  user: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    persona: string | null;
    preferredGenres: string[];
    bio: string | null;
    avatarUrl: string | null;
    budget: number | null;
    dailyReadingGoalMinutes: number | null;
    dailyReadingGoalPages: number | null;
  };
  categories: string[];
}

export interface UpdateProfileSettingsInput {
  displayName: string;
  avatarUrl: string;
  persona: string;
  bio: string;
  preferredGenres: string[];
  budget: string;
  dailyReadingGoalMinutes: string;
  dailyReadingGoalPages: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileActionResult {
  success: boolean;
  message: string;
}

export interface ProfileSecurityData {
  email: string | null;
  hasPassword: boolean;
}

function decimalToNumber(value: DecimalLike | number | string): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value.toNumber();
}

function normalizeText(value: string, maxLength: number): string | null {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  return cleanValue.slice(0, maxLength);
}

function parseBudget(value: string): number | null {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  const parsedValue = Number(cleanValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.min(parsedValue, 100_000_000);
}

function parseOptionalPositiveInt(value: string, maxValue: number): number | null {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  const parsedValue = Number(cleanValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return Math.min(parsedValue, maxValue);
}

function normalizeAvatarUrl(value: string): string | null {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return null;
  }

  if (cleanValue.startsWith("/") || cleanValue.startsWith("https://") || cleanValue.startsWith("http://")) {
    return cleanValue.slice(0, 500);
  }

  return null;
}

function handleProfileActionError(error: unknown, fallbackMessage: string): ProfileActionResult {
  if (error instanceof PermissionError) {
    return {
      success: false,
      message: error.message,
    };
  }

  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  console.error(`[profile] ${message}`);

  return {
    success: false,
    message: fallbackMessage,
  };
}

export async function getProfileDashboardData(): Promise<ProfileDashboardData | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    return null;
  }

  const userId = currentUser.id;

  try {
    const [
      user,
      reading,
      orders,
      listings,
      highlights,
      recommendations,
      reviewCount,
      bookmarkCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          profile: true,
        },
      }),
      prisma.readingProgress.findMany({
        where: {
          userId,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 6,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              authorName: true,
              coverPath: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          buyerId: userId,
          NOT: {
            AND: [
              {
                status: "PENDING",
              },
              {
                paymentMethod: null,
              },
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        include: {
          items: {
            include: {
              book: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      }),
      prisma.listing.findMany({
        where: {
          sellerId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
      prisma.highlight.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          book: {
            select: {
              title: true,
            },
          },
        },
      }),
      prisma.recommendation.findMany({
        where: {
          userId,
          targetType: TargetType.BOOK,
          isDismissed: false,
        },
        orderBy: {
          rank: "asc",
        },
        take: 6,
      }),
      prisma.review.count({
        where: {
          userId,
        },
      }),
      prisma.bookmark.count({
        where: {
          userId,
        },
      }),
    ]);

    if (!user) {
      return null;
    }

    const recommendationBookIds = recommendations.map((item) => item.targetId);
    const recommendationBooks = await prisma.book.findMany({
      where: {
        id: {
          in: recommendationBookIds,
        },
      },
      select: {
        id: true,
        title: true,
        authorName: true,
      },
    });
    const bookById = new Map(recommendationBooks.map((book) => [book.id, book]));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        persona: user.profile?.persona ?? null,
        preferredGenres: user.profile?.preferredGenres ?? [],
        bio: user.profile?.bio ?? null,
        avatarUrl: user.profile?.avatarUrl ?? null,
        dailyReadingGoalMinutes: user.profile?.dailyReadingGoalMinutes ?? null,
        dailyReadingGoalPages: user.profile?.dailyReadingGoalPages ?? null,
      },
      metrics: [
        { label: "Sách đang đọc", value: reading.length },
        { label: "Bookmark", value: bookmarkCount },
        { label: "Review", value: reviewCount },
        { label: "Đơn hàng", value: orders.length },
      ],
      reading: reading.map((item) => ({
        bookId: item.bookId,
        title: item.book.title,
        author: item.book.authorName,
        coverImage: normalizeBookCoverUrl(item.book.coverPath),
        currentPage: item.currentPage,
        progressPercent: item.progressPercent,
        totalMinutes: item.totalMinutes,
        lastReadAt: item.lastReadAt,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: decimalToNumber(order.totalAmount),
        createdAt: order.createdAt,
        books: order.items.map((item) => item.book.title),
      })),
      listings: listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: decimalToNumber(listing.price),
        status: listing.status,
        views: listing.views,
        cartAdds: listing.cartAdds,
        purchases: listing.purchases,
      })),
      highlights: highlights.map((highlight) => ({
        id: highlight.id,
        bookId: highlight.bookId,
        bookTitle: highlight.book.title,
        pageNumber: highlight.pageNumber,
        text: highlight.text,
        note: highlight.note,
        createdAt: highlight.createdAt,
      })),
      recommendations: recommendations
        .map((recommendation) => {
          const book = bookById.get(recommendation.targetId);

          if (!book) {
            return null;
          }

          return {
            id: recommendation.id,
            bookId: book.id,
            title: book.title,
            author: book.authorName,
            score: recommendation.score,
            reason: recommendation.reason,
          };
        })
        .filter((item): item is ProfileRecommendationItem => Boolean(item)),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getProfileDashboardData] ${message}`);
    return null;
  }
}

export async function getProfileSettingsData(): Promise<ProfileSettingsData | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    return null;
  }

  const userId = currentUser.id;

  try {
    const [user, categories] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          profile: true,
        },
      }),
      prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          name: true,
        },
        take: 18,
      }),
    ]);

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        persona: user.profile?.persona ?? null,
        preferredGenres: user.profile?.preferredGenres ?? [],
        bio: user.profile?.bio ?? null,
        avatarUrl: user.profile?.avatarUrl ?? null,
        budget: user.profile?.budget ? decimalToNumber(user.profile.budget) : null,
        dailyReadingGoalMinutes: user.profile?.dailyReadingGoalMinutes ?? null,
        dailyReadingGoalPages: user.profile?.dailyReadingGoalPages ?? null,
      },
      categories: categories.map((category) => category.name),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getProfileSettingsData] ${message}`);
    return null;
  }
}

export async function getProfileSecurityData(): Promise<ProfileSecurityData | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.isLocked) {
    return null;
  }

  const userId = currentUser.id;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      password: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    hasPassword: Boolean(user.password),
  };
}

export async function updateProfileSettings(input: UpdateProfileSettingsInput): Promise<ProfileActionResult> {
  try {
    const currentUser = await requireAuthenticatedUser();
    const userId = currentUser.id;
    const selectedGenres = Array.from(new Set(input.preferredGenres.map((genre) => genre.trim()).filter(Boolean)))
      .slice(0, 8);
    const validCategories = await prisma.category.findMany({
      where: {
        name: {
          in: selectedGenres,
        },
      },
      select: {
        name: true,
      },
    });
    const validGenreNames = new Set(validCategories.map((category) => category.name));
    const preferredGenres = selectedGenres.filter((genre) => validGenreNames.has(genre));
    const persona = normalizeText(input.persona, 80);
    const bio = normalizeText(input.bio, 500);
    const displayName = normalizeText(input.displayName, 120);
    const avatarUrl = normalizeAvatarUrl(input.avatarUrl);
    const budget = parseBudget(input.budget);
    const dailyReadingGoalMinutes = parseOptionalPositiveInt(input.dailyReadingGoalMinutes, 1_440);
    const dailyReadingGoalPages = parseOptionalPositiveInt(input.dailyReadingGoalPages, 5_000);

    if (!displayName) {
      return {
        success: false,
        message: "Tên hiển thị không được để trống.",
      };
    }

    if (input.avatarUrl.trim() && !avatarUrl) {
      return {
        success: false,
        message: "Avatar URL phải bắt đầu bằng http://, https:// hoặc /.",
      };
    }

    if (input.budget.trim() && budget === null) {
      return {
        success: false,
        message: "Ngân sách đọc/mua sách không hợp lệ.",
      };
    }

    if (input.dailyReadingGoalMinutes.trim() && dailyReadingGoalMinutes === null) {
      return {
        success: false,
        message: "Mục tiêu phút đọc mỗi ngày không hợp lệ.",
      };
    }

    if (input.dailyReadingGoalPages.trim() && dailyReadingGoalPages === null) {
      return {
        success: false,
        message: "Mục tiêu số trang mỗi ngày không hợp lệ.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          name: displayName,
        },
      });

      await tx.profile.upsert({
        where: {
          userId,
        },
        update: {
          persona,
          preferredGenres,
          bio,
          avatarUrl,
          budget,
          dailyReadingGoalMinutes,
          dailyReadingGoalPages,
        },
        create: {
          userId,
          persona,
          preferredGenres,
          bio,
          avatarUrl,
          budget,
          dailyReadingGoalMinutes,
          dailyReadingGoalPages,
        },
      });

      await createNotification(
        {
          userId,
          title: "Hồ sơ đã được cập nhật",
          message: "Thông tin cá nhân và sở thích đọc của bạn vừa được lưu.",
          type: NotificationType.SYSTEM,
          href: "/profile/settings",
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: userId,
          action: "USER_PROFILE_UPDATE",
          entityType: "USER",
          entityId: userId,
          metadata: {
            preferredGenreCount: preferredGenres.length,
            hasAvatar: Boolean(avatarUrl),
            hasDailyGoal: Boolean(dailyReadingGoalMinutes || dailyReadingGoalPages),
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    return {
      success: true,
      message: "Đã lưu hồ sơ đọc của bạn.",
    };
  } catch (error: unknown) {
    return handleProfileActionError(error, "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
  }
}

export async function changePassword(input: ChangePasswordInput): Promise<ProfileActionResult> {
  try {
    const currentUser = await requireAuthenticatedUser();
    const userId = currentUser.id;
    const currentPassword = input.currentPassword;
    const newPassword = input.newPassword;
    const confirmPassword = input.confirmPassword;

    if (newPassword.length < 8) {
      return {
        success: false,
        message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        message: "Mật khẩu xác nhận không trùng khớp.",
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "Không tìm thấy tài khoản.",
      };
    }

    if (!user.password) {
      return {
        success: false,
        message: "Tài khoản này chưa có mật khẩu cục bộ. Hãy tiếp tục đăng nhập bằng nhà cung cấp OAuth.",
      };
    }

    if (!currentPassword) {
      return {
        success: false,
        message: "Vui lòng nhập mật khẩu hiện tại.",
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: "Mật khẩu hiện tại không đúng.",
      };
    }

    const nextPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: nextPasswordHash,
        },
      });

      await createNotification(
        {
          userId: user.id,
          title: "Mật khẩu đã được đổi",
          message: "Nếu bạn không thực hiện thay đổi này, hãy liên hệ quản trị viên ngay.",
          type: NotificationType.SECURITY,
          href: "/profile/security",
        },
        tx,
      );

      await recordAuditLog(
        {
          actorId: user.id,
          action: "USER_PASSWORD_CHANGE",
          entityType: "USER",
          entityId: user.id,
          metadata: {
            source: "profile_security",
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });

    return {
      success: true,
      message: "Đã đổi mật khẩu thành công.",
    };
  } catch (error: unknown) {
    return handleProfileActionError(error, "Không thể đổi mật khẩu. Vui lòng thử lại.");
  }
}
