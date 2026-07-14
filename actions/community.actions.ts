"use server";

import { PostStatus, ReactionType, TargetType } from "@prisma/client";
import { TAXONOMY_VERSION } from "@/lib/interaction-taxonomy";
import { PermissionError, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export interface CommunityPostAuthor {
  id: string;
  name: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: CommunityPostAuthor;
  commentCount: number;
  reactionCount: number;
  reportCount: number;
}

export interface CreatePostInput {
  title: string;
  content: string;
}

export interface CommunityComment {
  id: string;
  content: string;
  createdAt: Date;
  author: CommunityPostAuthor;
}

export interface CommunityPostDetail extends CommunityPost {
  book: {
    id: string;
    title: string;
  } | null;
  comments: CommunityComment[];
}

export interface CreateCommentInput {
  postId: string;
  content: string;
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

export async function getAllPosts(): Promise<CommunityPost[]> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      author: post.author,
      commentCount: post._count.comments,
      reactionCount: post.reactionCount || post._count.reactions,
      reportCount: post.reportCount,
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[getAllPosts] ${message}`);
    return [];
  }
}

export async function getPostById(postId: string): Promise<CommunityPostDetail | null> {
  try {
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

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      author: post.author,
      commentCount: post.commentCount || post.comments.length,
      reactionCount: post.reactionCount,
      reportCount: post.reportCount,
      book: post.book,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: comment.author,
      })),
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

    if (!title || !content) {
      return {
        success: false,
        message: "Vui lòng nhập đầy đủ tiêu đề và nội dung.",
        reason: "VALIDATION_ERROR",
      };
    }

    await prisma.post.create({
      data: {
        id: buildPostId(),
        title,
        content,
        authorId: userId,
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

    await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorId: userId,
          content,
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

    await prisma.reaction.upsert({
      where: {
        userId_targetType_targetId_type: {
          userId,
          targetType: TargetType.POST,
          targetId: cleanPostId,
          type,
        },
      },
      update: {},
      create: {
        userId,
        targetType: TargetType.POST,
        targetId: cleanPostId,
        postId: cleanPostId,
        type,
      },
    });

    const [reactionCount, reportCount] = await Promise.all([
      prisma.reaction.count({
        where: {
          postId: cleanPostId,
          type: {
            not: ReactionType.REPORT,
          },
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
      message: type === ReactionType.REPORT ? "Đã báo cáo bài viết." : "Đã ghi nhận tương tác.",
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
