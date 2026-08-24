import { cache } from "react";
import { ensureForumDatabase, forumQuery } from "@/lib/forum-db";

const FALLBACK_SITE_URL = "https://nit-forums.vercel.app";

export type PublicThreadSeo = {
  id: string;
  boardId: string;
  boardTitle: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  viewCount: number;
};

export type PublicBoardSeo = {
  id: string;
  title: string;
  description: string;
  updatedAt: string | null;
};

function safeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    return parsed.protocol === "https:" || parsed.hostname === "127.0.0.1" ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function getForumSiteUrl() {
  return safeOrigin(process.env.NEXT_PUBLIC_SITE_URL?.trim())
    ?? safeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim())
    ?? FALLBACK_SITE_URL;
}

export function forumPlainText(value: string, maxLength: number | null = 300) {
  const text = value
    .replace(/\[(?:\/?(?:b|i|u|s|center|quote|code|spoiler|list)|\*|color(?:=[^\]]+)?|url(?:=[^\]]+)?|img)\]/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLength === null || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export const loadPublicThreadSeo = cache(async (threadId: string): Promise<PublicThreadSeo | null> => {
  if (!threadId || threadId.length > 200) return null;
  await ensureForumDatabase();
  const result = await forumQuery<{
    id: string; board_id: string; board_title: string; title: string; body: string; author: string;
    created_at: Date | string; updated_at: Date | string; reply_count: number | string; view_count: number | string;
  }>(
    `SELECT t.id,t.board_id,b.title AS board_title,t.title,t.body,u.username AS author,t.created_at,t.updated_at,t.view_count,
       (SELECT COUNT(*)::INTEGER FROM forum_posts p WHERE p.thread_id=t.id AND p.deleted_at IS NULL AND p.is_internal=FALSE AND p.is_private=FALSE) AS reply_count
     FROM forum_threads t
     JOIN forum_users u ON u.id=t.author_id
     JOIN forum_boards b ON b.id=t.board_id
     JOIN forum_sections s ON s.id=b.section_id
     WHERE t.id=$1 AND t.deleted_at IS NULL AND b.deleted_at IS NULL AND s.deleted_at IS NULL
       AND b.is_hidden=FALSE AND b.is_archived=FALSE AND b.visibility_min_rank<=0
       AND s.is_hidden=FALSE AND s.is_archived=FALSE AND s.is_staff_only=FALSE
     LIMIT 1`,
    [threadId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    boardId: row.board_id,
    boardTitle: row.board_title,
    title: row.title,
    body: row.body,
    author: row.author,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    replyCount: Number(row.reply_count) || 0,
    viewCount: Number(row.view_count) || 0,
  };
});

export const loadPublicBoardSeo = cache(async (boardId: string): Promise<PublicBoardSeo | null> => {
  if (!boardId || boardId.length > 200) return null;
  await ensureForumDatabase();
  const result = await forumQuery<{ id: string; title: string; description: string; updated_at: Date | string | null }>(
    `SELECT b.id,b.title,b.description,MAX(t.updated_at) AS updated_at
     FROM forum_boards b
     JOIN forum_sections s ON s.id=b.section_id
     LEFT JOIN forum_threads t ON t.board_id=b.id AND t.deleted_at IS NULL
     WHERE b.id=$1 AND b.deleted_at IS NULL AND s.deleted_at IS NULL
       AND b.is_hidden=FALSE AND b.is_archived=FALSE AND b.visibility_min_rank<=0
       AND s.is_hidden=FALSE AND s.is_archived=FALSE AND s.is_staff_only=FALSE
     GROUP BY b.id
     LIMIT 1`,
    [boardId],
  );
  const row = result.rows[0];
  return row ? { id: row.id, title: row.title, description: row.description, updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null } : null;
});

export async function loadPublicSitemapEntries() {
  await ensureForumDatabase();
  const [boards, threads] = await Promise.all([
    forumQuery<{ id: string; updated_at: Date | string | null }>(
      `SELECT b.id,MAX(t.updated_at) AS updated_at FROM forum_boards b
       JOIN forum_sections s ON s.id=b.section_id
       LEFT JOIN forum_threads t ON t.board_id=b.id AND t.deleted_at IS NULL
       WHERE b.deleted_at IS NULL AND s.deleted_at IS NULL AND b.is_hidden=FALSE AND b.is_archived=FALSE
         AND b.visibility_min_rank<=0 AND s.is_hidden=FALSE AND s.is_archived=FALSE AND s.is_staff_only=FALSE
       GROUP BY b.id ORDER BY b.id LIMIT 5000`,
    ),
    forumQuery<{ id: string; updated_at: Date | string }>(
      `SELECT t.id,t.updated_at FROM forum_threads t
       JOIN forum_boards b ON b.id=t.board_id JOIN forum_sections s ON s.id=b.section_id
       WHERE t.deleted_at IS NULL AND b.deleted_at IS NULL AND s.deleted_at IS NULL
         AND b.is_hidden=FALSE AND b.is_archived=FALSE AND b.visibility_min_rank<=0
         AND s.is_hidden=FALSE AND s.is_archived=FALSE AND s.is_staff_only=FALSE
       ORDER BY t.updated_at DESC LIMIT 44000`,
    ),
  ]);
  return {
    boards: boards.rows.map((row) => ({ id: row.id, updatedAt: row.updated_at ? new Date(row.updated_at) : undefined })),
    threads: threads.rows.map((row) => ({ id: row.id, updatedAt: new Date(row.updated_at) })),
  };
}
