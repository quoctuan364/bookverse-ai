"use server";

import { PostStatus, ReactionType, TargetType } from "@prisma/client";
import { normalizeBookCoverUrl } from "@/lib/book-cover";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import { getCurrentUser, PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { publicExperienceBookWhere } from "@/lib/public-book-policy";

export type CommunityPostType = "DISCUSSION" | "QUESTION" | "REVIEW";

export interface CommunityFilters {
  query?: string;
  type?: CommunityPostType | "ALL";
  categoryId?: string;
  spoiler?: boolean;
}

export interface CommunityPostAuthor {
  id: string;
  name: string;
}

export interface CommunityBookSummary {
  id: string;
  title: string;
  author: string;
  category: string;
  coverImage: string | null;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: CommunityPostAuthor;
  book: CommunityBookSummary | null;
  commentCount: number;
  reactionCount: number;
  reportCount: number;
  saveCount: number;
  isSaved: boolean;
  type: CommunityPostType;
  hasSpoiler: boolean;
  rating: number | null;
}

export interface CreatePostInput {
  title: string;
  content: string;
  bookId: string;
  type: CommunityPostType;
  hasSpoiler: boolean;
  rating?: number | null;
}

export interface CommunityComment {
  id: string;
  content: string;
  createdAt: Date;
  author: CommunityPostAuthor;
  parentId: string | null;
  replies: CommunityComment[];
}

export interface CommunityPostDetail extends CommunityPost {
  comments: CommunityComment[];
}

export interface CreateCommentInput {
  postId: string;
  content: string;
  parentId?: string | null;
}

export interface CommunityBookOption {
  id: string;
  title: string;
  author: string;
  categoryId: string;
  category: string;
}

export interface CreatePostResult {
  success: boolean;
  message: string;
  reason?: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

function buildPostId(): string {
  return `POST-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function handleCommunityPermission(error: PermissionError): CreatePostResult {
  return {
    success: false,
    message: error.message,
    reason: "AUTH_REQUIRED",
  };
}

function parsePostPresentation(tags: string[]): {
  type: CommunityPostType;
  hasSpoiler: boolean;
  rating: number | null;
  isModernLinkedPost: boolean;
} {
  const rawType = tags.find((tag) => tag.startsWith("type:"))?.slice(5);
  const type: CommunityPostType =
    rawType === "QUESTION" || rawType === "REVIEW" ? rawType : "DISCUSSION";
  const rawRating = Number(tags.find((tag) => tag.startsWith("rating:"))?.slice(7));
  return {
    type,
    hasSpoiler: tags.includes("spoiler"),
    rating: Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5 ? rawRating : null,
    isModernLinkedPost: tags.includes("linked-book-v2"),
  };
}

function makeLegacyPostCoherent(input: {
  title: string;
  content: string;
  bookTitle?: string;
  presentation: ReturnType<typeof parsePostPresentation>;
}): { title: string; content: string } {
  if (!input.bookTitle || input.presentation.isModernLinkedPost) {
    return { title: input.title, content: input.content };
  }
  const normalizedBookTitle = input.bookTitle.toLocaleLowerCase("vi");
  if (
    input.title.toLocaleLowerCase("vi").includes(normalizedBookTitle) ||
    input.content.toLocaleLowerCase("vi").includes(normalizedBookTitle)
  ) {
    return { title: input.title, content: input.content };
  }
  const label = input.title.includes("?") || input.title.toLocaleLowerCase("vi").includes("hỏi")
    ? "Góc hỏi sách"
    : input.title.toLocaleLowerCase("vi").includes("cảm nhận")
      ? "Cảm nhận cá nhân"
      : "Thảo luận nội dung";
  return {
    title: `${label}: ${input.bookTitle}`,
    content: `Mình đang đọc ${input.bookTitle} và muốn trao đổi thêm với cộng đồng. Bạn nào đã đọc rồi cho mình xin góc nhìn và trải nghiệm nhé.`,
  };
}

export async function getCommunityBookOptions(): Promise<CommunityBookOption[]> {
  try {
    const books = await prisma.book.findMany({
      where: publicExperienceBookWhere(),
      orderBy: [{ rating: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        authorName: true,
        category: { select: { id: true, name: true } },
      },
    });
    return books.map((book) => ({
      id: book.id,
      title: getVietnameseBookTitle(book.id, book.title),
      author: book.authorName,
      categoryId: book.category.id,
      category: book.category.name,
    }));
  } catch {
    return [];
  }
}

export async function getAllPosts(filters: CommunityFilters = {}): Promise<CommunityPost[]> {
  try {
    const currentUser = await getCurrentUser();
    const cleanQuery = filters.query?.trim();
    const typeTag = filters.type && filters.type !== "ALL" ? `type:${filters.type}` : null;
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        ...(typeTag || filters.spoiler
          ? { tags: { hasEvery: [...(typeTag ? [typeTag] : []), ...(filters.spoiler ? ["spoiler"] : [])] } }
          : {}),
        ...(filters.categoryId ? { book: { categoryId: filters.categoryId } } : {}),
        ...(cleanQuery
          ? {
              OR: [
                { title: { contains: cleanQuery, mode: "insensitive" } },
                { content: { contains: cleanQuery, mode: "insensitive" } },
                { book: { title: { contains: cleanQuery, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      // Trang feed chỉ tải một lát cắt mới nhất để không render hàng nghìn card trong một request.
      // Cursor pagination đầy đủ được giữ cho P1; dữ liệu gốc không bị thay đổi.
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    const postIds = posts.map((post) => post.id);
    const reactionGroups = postIds.length
      ? await prisma.reaction.groupBy({
          by: ["postId", "type"],
          where: { postId: { in: postIds } },
          _count: { _all: true },
        })
      : [];
    const savedPostIds = currentUser && postIds.length
      ? new Set((await prisma.reaction.findMany({
          where: { userId: currentUser.id, postId: { in: postIds }, type: ReactionType.SAVE },
          select: { postId: true },
        })).map((reaction) => reaction.postId).filter(Boolean) as string[])
      : new Set<string>();

    const reactionCount = (postId: string, type: ReactionType) =>
      reactionGroups.find((item) => item.postId === postId && item.type === type)?._count._all ?? 0;

    return posts.map((post) => {
      const presentation = parsePostPresentation(post.tags);
      const bookTitle = post.book ? getVietnameseBookTitle(post.book.id, post.book.title) : undefined;
      const coherentCopy = makeLegacyPostCoherent({ title: post.title, content: post.content, bookTitle, presentation });
      return {
      id: post.id,
      title: coherentCopy.title,
      content: coherentCopy.content,
      createdAt: post.createdAt,
      author: post.author,
      book: post.book
        ? {
            id: post.book.id,
            title: bookTitle!,
            author: post.book.authorName,
            category: post.book.category.name,
            coverImage: normalizeBookCoverUrl(post.book.coverPath),
          }
        : null,
      commentCount: post._count.comments,
      reactionCount: reactionCount(post.id, ReactionType.LIKE),
      reportCount: reactionCount(post.id, ReactionType.REPORT),
      saveCount: reactionCount(post.id, ReactionType.SAVE),
      isSaved: savedPostIds.has(post.id),
      type: presentation.type,
      hasSpoiler: presentation.hasSpoiler,
      rating: presentation.rating,
    }});
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getAllPosts] ${message}`);
    return [];
  }
}

export async function getPostById(postId: string): Promise<CommunityPostDetail | null> {
  try {
    const currentUser = await getCurrentUser();
    const cleanPostId = postId.trim();

    if (!cleanPostId) {
      return null;
    }

    const post = await prisma.post.findFirst({
      where: {
        id: cleanPostId,
        status: {
          not: PostStatus.REMOVED,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        book: {
          select: {
            id: true,
            title: true,
            authorName: true,
            coverPath: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        comments: {
          where: {
            status: PostStatus.PUBLISHED,
          },
          orderBy: {
            createdAt: "asc",
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    const presentation = parsePostPresentation(post.tags);
    const bookTitle = post.book ? getVietnameseBookTitle(post.book.id, post.book.title) : undefined;
    const coherentCopy = makeLegacyPostCoherent({ title: post.title, content: post.content, bookTitle, presentation });
    const [reactionGroups, savedReaction] = await Promise.all([
      prisma.reaction.groupBy({
        by: ["type"],
        where: { postId: post.id },
        _count: { _all: true },
      }),
      currentUser
        ? prisma.reaction.findUnique({
            where: { userId_targetType_targetId_type: { userId: currentUser.id, targetType: TargetType.POST, targetId: post.id, type: ReactionType.SAVE } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    const countReaction = (type: ReactionType) => reactionGroups.find((item) => item.type === type)?._count._all ?? 0;
    const commentById = new Map<string, CommunityComment>();
    for (const comment of post.comments) {
      commentById.set(comment.id, { ...comment, parentId: comment.parentId, replies: [] });
    }
    const rootComments: CommunityComment[] = [];
    for (const comment of commentById.values()) {
      const parent = comment.parentId ? commentById.get(comment.parentId) : null;
      if (parent) parent.replies.push(comment);
      else rootComments.push(comment);
    }

    return {
      id: post.id,
      title: coherentCopy.title,
      content: coherentCopy.content,
      createdAt: post.createdAt,
      author: post.author,
      commentCount: post.commentCount || post.comments.length,
      reactionCount: countReaction(ReactionType.LIKE),
      reportCount: countReaction(ReactionType.REPORT),
      saveCount: countReaction(ReactionType.SAVE),
      isSaved: Boolean(savedReaction),
      type: presentation.type,
      hasSpoiler: presentation.hasSpoiler,
      rating: presentation.rating,
      book: post.book
        ? {
            id: post.book.id,
            title: bookTitle!,
            author: post.book.authorName,
            category: post.book.category.name,
            coverImage: normalizeBookCoverUrl(post.book.coverPath),
          }
        : null,
      comments: rootComments,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getPostById] ${message}`);
    return null;
  }
}

export async function createPost(data: CreatePostInput): Promise<CreatePostResult> {
  try {
    const userId = (await requireAuthenticatedUser()).id;
    const title = data.title.trim();
    const content = data.content.trim();
    const bookId = data.bookId.trim();
    const type: CommunityPostType = ["DISCUSSION", "QUESTION", "REVIEW"].includes(data.type) ? data.type : "DISCUSSION";
    const rating = type === "REVIEW" && Number.isInteger(data.rating) && Number(data.rating) >= 1 && Number(data.rating) <= 5
      ? Number(data.rating)
      : null;

    if (!title || !content || !bookId || (type === "REVIEW" && !rating)) {
      return {
        success: false,
        message: "Vui lòng nhập đầy đủ tiêu đề và nội dung.",
        reason: "VALIDATION_ERROR",
      };
    }

    const book = await prisma.book.findFirst({ where: { id: bookId, ...publicExperienceBookWhere() }, select: { id: true } });
    if (!book) return { success: false, message: "Vui lòng chọn một cuốn sách hợp lệ trong catalog.", reason: "NOT_FOUND" };

    await prisma.post.create({
      data: {
        id: buildPostId(),
        title,
        content,
        authorId: userId,
        bookId,
        tags: ["linked-book-v2", `type:${type}`, ...(data.hasSpoiler ? ["spoiler"] : []), ...(rating ? [`rating:${rating}`] : [])],
        status: PostStatus.PUBLISHED,
      },
    });

    return { success: true, message: "Đã đăng bài viết." };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return handleCommunityPermission(error);
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[createPost] ${message}`);
    return {
      success: false,
      message: "Không thể tạo bài viết. Vui lòng thử lại.",
      reason: "DATABASE_ERROR",
    };
  }
}

export async function createComment(data: CreateCommentInput): Promise<CreatePostResult> {
  try {
    const userId = (await requireAuthenticatedUser()).id;
    const postId = data.postId.trim();
    const content = data.content.trim();
    const parentId = data.parentId?.trim() || null;

    if (!postId || !content) {
      return {
        success: false,
        message: "Vui lòng nhập nội dung bình luận.",
        reason: "VALIDATION_ERROR",
      };
    }

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        bookId: true,
      },
    });

    if (!post) {
      return {
        success: false,
        message: "Không tìm thấy bài viết.",
        reason: "NOT_FOUND",
      };
    }

    if (parentId) {
      const parent = await prisma.comment.findFirst({ where: { id: parentId, postId, status: PostStatus.PUBLISHED }, select: { id: true } });
      if (!parent) return { success: false, message: "Bình luận cần trả lời không còn tồn tại.", reason: "NOT_FOUND" };
    }

    await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorId: userId,
          content,
          parentId,
          status: PostStatus.PUBLISHED,
        },
      }),
      prisma.post.update({
        where: {
          id: postId,
        },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      }),
      ...(post.bookId
        ? [
            prisma.interactionEvent.create({
              data: {
                userId,
                bookId: post.bookId,
                actionType: "COMMUNITY_COMMENT",
                metadata: {
                  postId,
                  source: "community",
                  taxonomyVersion: TAXONOMY_VERSION,
                },
              },
            }),
          ]
        : []),
    ]);

    return {
      success: true,
      message: "Đã gửi bình luận.",
    };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return handleCommunityPermission(error);
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[createComment] ${message}`);
    return {
      success: false,
      message: "Không thể gửi bình luận.",
      reason: "DATABASE_ERROR",
    };
  }
}

export async function reactToPost(
  postId: string,
  type: ReactionType,
): Promise<CreatePostResult> {
  try {
    const userId = (await requireAuthenticatedUser()).id;
    const cleanPostId = postId.trim();

    if (!cleanPostId) {
      return {
        success: false,
        message: "Thiếu mã bài viết.",
        reason: "VALIDATION_ERROR",
      };
    }

    const post = await prisma.post.findUnique({
      where: {
        id: cleanPostId,
      },
      select: {
        id: true,
        bookId: true,
      },
    });

    if (!post) {
      return {
        success: false,
        message: "Không tìm thấy bài viết.",
        reason: "NOT_FOUND",
      };
    }

    const reactionKey = { userId, targetType: TargetType.POST, targetId: cleanPostId, type };
    const existing = await prisma.reaction.findUnique({ where: { userId_targetType_targetId_type: reactionKey }, select: { id: true } });
    if (existing && type === ReactionType.SAVE) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else if (!existing) {
      await prisma.reaction.create({ data: { ...reactionKey, postId: cleanPostId } });
    }

    const [reactionCount, reportCount] = await Promise.all([
      prisma.reaction.count({
        where: {
          postId: cleanPostId,
          type: ReactionType.LIKE,
        },
      }),
      prisma.reaction.count({
        where: {
          postId: cleanPostId,
          type: ReactionType.REPORT,
        },
      }),
    ]);

    await prisma.$transaction([
      prisma.post.update({
        where: {
          id: cleanPostId,
        },
        data: {
          reactionCount,
          reportCount,
        },
      }),
      ...(post.bookId
        ? [
            prisma.interactionEvent.create({
              data: {
                userId,
                bookId: post.bookId,
                actionType: type === ReactionType.REPORT ? "COMMUNITY_REPORT" : "REACTION",
                metadata: {
                  postId: cleanPostId,
                  reactionType: type,
                  source: "community",
                  taxonomyVersion: TAXONOMY_VERSION,
                },
              },
            }),
          ]
        : []),
    ]);

    return {
      success: true,
      message: type === ReactionType.REPORT
        ? "Đã báo cáo bài viết."
        : type === ReactionType.SAVE
          ? existing ? "Đã bỏ lưu bài viết." : "Đã lưu bài viết."
          : "Đã ghi nhận tương tác.",
    };
  } catch (error: unknown) {
    if (error instanceof PermissionError) {
      return handleCommunityPermission(error);
    }

    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[reactToPost] ${message}`);
    return {
      success: false,
      message: "Không thể ghi nhận tương tác.",
      reason: "DATABASE_ERROR",
    };
  }
}
