import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { statusLabels, type ThreadStatus } from "@/lib/forum-data";
import {
  DatabaseNotConfiguredError,
  ensureForumDatabase,
  forumQuery,
} from "@/lib/forum-db";
import type {
  ForumBoard,
  ForumPayload,
  ForumPost,
  ForumSection,
  ForumThread,
  ForumUser,
} from "@/lib/forum-store";
import type { RoleDefinition } from "@/lib/forum-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "cloudworld_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type DbRow = QueryResultRow & Record<string, unknown>;

function stringValue(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return new Date(stringValue(value)).toISOString();
}

function mapRole(row: DbRow, prefix = "role_"): RoleDefinition {
  return {
    id: stringValue(row[`${prefix}id`]),
    label: stringValue(row[`${prefix}label`]),
    shortLabel: stringValue(row[`${prefix}short_label`]),
    description: stringValue(row[`${prefix}description`]),
    color: stringValue(row[`${prefix}color`]),
    rank: numberValue(row[`${prefix}rank`]),
    canModerate: Boolean(row[`${prefix}can_moderate`]),
    canManageForum: Boolean(row[`${prefix}can_manage_forum`]),
    canManageRoles: Boolean(row[`${prefix}can_manage_roles`]),
  };
}

function mapUser(row: DbRow, prefix = "author_"): ForumUser {
  return {
    id: stringValue(row[`${prefix}id`]),
    username: stringValue(row[`${prefix}name`]),
    createdAt: dateValue(row[`${prefix}created_at`]),
    mustChangePassword: Boolean(row[`${prefix}must_change_password`]),
    role: mapRole(row, `${prefix}role_`),
  };
}

function mapThread(row: DbRow): ForumThread {
  return {
    id: stringValue(row.id),
    boardId: stringValue(row.board_id),
    title: stringValue(row.title),
    body: stringValue(row.body),
    status: stringValue(row.status) as ThreadStatus,
    author: mapUser(row),
    createdAt: dateValue(row.created_at),
    updatedAt: dateValue(row.updated_at),
    replyCount: numberValue(row.reply_count),
  };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await forumQuery<DbRow>(
    `SELECT
       u.id AS author_id,
       u.username AS author_name,
       u.created_at AS author_created_at,
       u.must_change_password AS author_must_change_password,
       r.id AS author_role_id,
       r.label AS author_role_label,
       r.short_label AS author_role_short_label,
       r.description AS author_role_description,
       r.color AS author_role_color,
       r.rank AS author_role_rank,
       r.can_moderate AS author_role_can_moderate,
       r.can_manage_forum AS author_role_can_manage_forum,
       r.can_manage_roles AS author_role_can_manage_roles
     FROM forum_sessions s
     JOIN forum_users u ON u.id = s.user_id
     JOIN forum_roles r ON r.id = u.role_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash(token)],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await forumQuery(
    `INSERT INTO forum_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [tokenHash(token), userId],
  );
  return token;
}

function sessionResponse(token: string) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}

function clearSessionResponse() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

async function loadRoles() {
  const result = await forumQuery<DbRow>(
    `SELECT
       id AS role_id,
       label AS role_label,
       short_label AS role_short_label,
       description AS role_description,
       color AS role_color,
       rank AS role_rank,
       can_moderate AS role_can_moderate,
       can_manage_forum AS role_can_manage_forum,
       can_manage_roles AS role_can_manage_roles
     FROM forum_roles ORDER BY rank`,
  );
  return result.rows.map((row) => mapRole(row));
}

async function loadStats() {
  const result = await forumQuery<DbRow>(
    `SELECT
       (SELECT COUNT(*)::INTEGER FROM forum_users) AS members,
       (SELECT COUNT(*)::INTEGER FROM forum_threads) AS threads,
       (SELECT COUNT(*)::INTEGER FROM forum_posts) AS posts`,
  );
  const row = result.rows[0];
  return {
    members: numberValue(row?.members),
    threads: numberValue(row?.threads),
    posts: numberValue(row?.posts),
  };
}

async function loadSections(viewerRank: number) {
  const [sectionResult, boardResult] = await Promise.all([
    forumQuery<DbRow>(
      `SELECT id, title, description, sort_order, is_staff_only
       FROM forum_sections
       WHERE is_staff_only = FALSE OR $1 >= 20
       ORDER BY sort_order, title`,
      [viewerRank],
    ),
    forumQuery<DbRow>(
      `WITH thread_stats AS (
         SELECT board_id, COUNT(*)::INTEGER AS thread_count
         FROM forum_threads GROUP BY board_id
       ), latest AS (
         SELECT DISTINCT ON (t.board_id)
           t.board_id, t.id, t.title, t.status, t.updated_at,
           u.username AS author_name,
           r.id AS latest_role_id,
           r.label AS latest_role_label,
           r.short_label AS latest_role_short_label,
           r.description AS latest_role_description,
           r.color AS latest_role_color,
           r.rank AS latest_role_rank,
           r.can_moderate AS latest_role_can_moderate,
           r.can_manage_forum AS latest_role_can_manage_forum,
           r.can_manage_roles AS latest_role_can_manage_roles
         FROM forum_threads t
         JOIN forum_users u ON u.id = t.author_id
         JOIN forum_roles r ON r.id = u.role_id
         ORDER BY t.board_id, t.updated_at DESC
       )
       SELECT
         b.id, b.section_id, b.title, b.description, b.icon, b.accent,
         b.sort_order, b.posting_min_rank,
         COALESCE(ts.thread_count, 0) AS thread_count,
         l.id AS latest_id, l.title AS latest_title, l.status AS latest_status,
         l.updated_at AS latest_updated_at, l.author_name AS latest_author_name,
         l.latest_role_id, l.latest_role_label, l.latest_role_short_label,
         l.latest_role_description, l.latest_role_color, l.latest_role_rank,
         l.latest_role_can_moderate, l.latest_role_can_manage_forum,
         l.latest_role_can_manage_roles
       FROM forum_boards b
       JOIN forum_sections s ON s.id = b.section_id
       LEFT JOIN thread_stats ts ON ts.board_id = b.id
       LEFT JOIN latest l ON l.board_id = b.id
       WHERE s.is_staff_only = FALSE OR $1 >= 20
       ORDER BY s.sort_order, b.sort_order, b.title`,
      [viewerRank],
    ),
  ]);

  const boards = boardResult.rows.map<ForumBoard>((row) => ({
    id: stringValue(row.id),
    sectionId: stringValue(row.section_id),
    title: stringValue(row.title),
    description: stringValue(row.description),
    icon: stringValue(row.icon),
    accent: stringValue(row.accent),
    sortOrder: numberValue(row.sort_order),
    postingMinRank: numberValue(row.posting_min_rank),
    threadCount: numberValue(row.thread_count),
    latestThread: row.latest_id
      ? {
          id: stringValue(row.latest_id),
          title: stringValue(row.latest_title),
          authorName: stringValue(row.latest_author_name),
          authorRole: mapRole(row, "latest_role_"),
          status: stringValue(row.latest_status) as ThreadStatus,
          updatedAt: dateValue(row.latest_updated_at),
        }
      : null,
  }));

  return sectionResult.rows.map<ForumSection>((row) => ({
    id: stringValue(row.id),
    title: stringValue(row.title),
    description: stringValue(row.description),
    sortOrder: numberValue(row.sort_order),
    isStaffOnly: Boolean(row.is_staff_only),
    boards: boards.filter((board) => board.sectionId === row.id),
  }));
}

const threadSelect = `
  SELECT
    t.id, t.board_id, t.title, t.body, t.status, t.created_at, t.updated_at,
    u.id AS author_id,
    u.username AS author_name,
    u.created_at AS author_created_at,
    r.id AS author_role_id,
    r.label AS author_role_label,
    r.short_label AS author_role_short_label,
    r.description AS author_role_description,
    r.color AS author_role_color,
    r.rank AS author_role_rank,
    r.can_moderate AS author_role_can_moderate,
    r.can_manage_forum AS author_role_can_manage_forum,
    r.can_manage_roles AS author_role_can_manage_roles,
    (SELECT COUNT(*)::INTEGER FROM forum_posts p WHERE p.thread_id = t.id) AS reply_count
  FROM forum_threads t
  JOIN forum_users u ON u.id = t.author_id
  JOIN forum_roles r ON r.id = u.role_id
  JOIN forum_boards b ON b.id = t.board_id
  JOIN forum_sections s ON s.id = b.section_id
`;

async function loadRecentThreads(viewerRank: number) {
  const result = await forumQuery<DbRow>(
    `${threadSelect}
     WHERE s.is_staff_only = FALSE OR $1 >= 20
     ORDER BY t.updated_at DESC LIMIT 12`,
    [viewerRank],
  );
  return result.rows.map(mapThread);
}

async function loadBoardThreads(boardId: string, viewerRank: number) {
  const result = await forumQuery<DbRow>(
    `${threadSelect}
     WHERE t.board_id = $1 AND (s.is_staff_only = FALSE OR $2 >= 20)
     ORDER BY CASE WHEN t.status = 'important' THEN 0 ELSE 1 END, t.updated_at DESC
     LIMIT 100`,
    [boardId, viewerRank],
  );
  return result.rows.map(mapThread);
}

async function loadThread(threadId: string, viewerRank: number) {
  const result = await forumQuery<DbRow>(
    `${threadSelect}
     WHERE t.id = $1 AND (s.is_staff_only = FALSE OR $2 >= 20)
     LIMIT 1`,
    [threadId, viewerRank],
  );
  return result.rows[0] ? mapThread(result.rows[0]) : null;
}

async function loadPosts(threadId: string) {
  const result = await forumQuery<DbRow>(
    `SELECT
       p.id, p.thread_id, p.body, p.created_at,
       u.id AS author_id,
       u.username AS author_name,
       u.created_at AS author_created_at,
       r.id AS author_role_id,
       r.label AS author_role_label,
       r.short_label AS author_role_short_label,
       r.description AS author_role_description,
       r.color AS author_role_color,
       r.rank AS author_role_rank,
       r.can_moderate AS author_role_can_moderate,
       r.can_manage_forum AS author_role_can_manage_forum,
       r.can_manage_roles AS author_role_can_manage_roles
     FROM forum_posts p
     JOIN forum_users u ON u.id = p.author_id
     JOIN forum_roles r ON r.id = u.role_id
     WHERE p.thread_id = $1
     ORDER BY p.created_at ASC LIMIT 300`,
    [threadId],
  );

  return result.rows.map<ForumPost>((row) => ({
    id: stringValue(row.id),
    threadId: stringValue(row.thread_id),
    body: stringValue(row.body),
    author: mapUser(row),
    createdAt: dateValue(row.created_at),
  }));
}

async function loadUsers() {
  const result = await forumQuery<DbRow>(
    `SELECT
       u.id AS author_id,
       u.username AS author_name,
       u.created_at AS author_created_at,
       r.id AS author_role_id,
       r.label AS author_role_label,
       r.short_label AS author_role_short_label,
       r.description AS author_role_description,
       r.color AS author_role_color,
       r.rank AS author_role_rank,
       r.can_moderate AS author_role_can_moderate,
       r.can_manage_forum AS author_role_can_manage_forum,
       r.can_manage_roles AS author_role_can_manage_roles
     FROM forum_users u JOIN forum_roles r ON r.id = u.role_id
     ORDER BY r.rank DESC, u.username ASC LIMIT 500`,
  );
  return result.rows.map((row) => mapUser(row));
}

export async function GET(request: NextRequest) {
  try {
    await ensureForumDatabase();
    const currentUser = await getCurrentUser(request);
    const viewerRank = currentUser?.role.rank ?? 0;
    const boardId = request.nextUrl.searchParams.get("board")?.trim() ?? "";
    const threadId = request.nextUrl.searchParams.get("thread")?.trim() ?? "";

    const [roles, stats, sections, recentThreads, boardThreads, activeThread, users] = await Promise.all([
      loadRoles(),
      loadStats(),
      loadSections(viewerRank),
      loadRecentThreads(viewerRank),
      boardId ? loadBoardThreads(boardId, viewerRank) : Promise.resolve([]),
      threadId ? loadThread(threadId, viewerRank) : Promise.resolve(null),
      currentUser?.role.canManageRoles ? loadUsers() : Promise.resolve([]),
    ]);
    const posts = activeThread ? await loadPosts(activeThread.id) : [];

    const payload: ForumPayload = {
      currentUser,
      roles,
      stats,
      sections,
      recentThreads,
      boardThreads,
      activeThread,
      posts,
      users,
    };
    return NextResponse.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await ensureForumDatabase();
    const body = (await request.json()) as Record<string, unknown>;
    const action = stringValue(body.action);

    if (action === "register") return register(body);
    if (action === "login") return login(body);
    if (action === "logout") return logout(request);

    const currentUser = await requireUser(request);
    if (action === "change_password") return changePassword(currentUser, request, body);
    if (currentUser.mustChangePassword) {
      throw new ApiError("Сначала смените стандартный пароль владельца.", 403);
    }
    if (action === "create_thread") return createThread(currentUser, body);
    if (action === "create_post") return createPost(currentUser, body);
    if (action === "set_thread_status") return setThreadStatus(currentUser, body);
    if (action === "set_user_role") return setUserRole(currentUser, body);
    if (action === "save_section") return saveSection(currentUser, body);
    if (action === "delete_section") return deleteSection(currentUser, body);
    if (action === "save_board") return saveBoard(currentUser, body);
    if (action === "delete_board") return deleteBoard(currentUser, body);

    throw new ApiError("Неизвестное действие.");
  } catch (error) {
    return errorResponse(error);
  }
}

function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    throw new ApiError("Запрос отклонён системой безопасности.", 403);
  }
}

async function requireUser(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) throw new ApiError("Сначала войдите в аккаунт.", 401);
  return user;
}

function requireForumManager(user: ForumUser) {
  if (!user.role.canManageForum) throw new ApiError("Недостаточно прав для управления форумом.", 403);
}

async function register(body: Record<string, unknown>) {
  const username = stringValue(body.username).trim();
  const password = stringValue(body.password);
  if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)) {
    throw new ApiError("Ник: 3–24 символа, только буквы, цифры, _ и -.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new ApiError("Пароль должен содержать от 8 до 128 символов.");
  }

  const passwordHash = await hash(password, 12);
  const id = `u-${randomUUID()}`;
  try {
    await forumQuery(
      `INSERT INTO forum_users (id, username, username_normalized, password_hash, role_id, must_change_password)
       VALUES ($1,$2,$3,$4,'member',FALSE)`,
      [id, username, username.toLowerCase(), passwordHash],
    );
  } catch (error) {
    if (isPgUniqueViolation(error)) throw new ApiError("Такой ник уже зарегистрирован.", 409);
    throw error;
  }
  return sessionResponse(await createSession(id));
}

async function login(body: Record<string, unknown>) {
  const username = stringValue(body.username).trim().toLowerCase();
  const password = stringValue(body.password);
  const result = await forumQuery<DbRow>(
    "SELECT id, password_hash FROM forum_users WHERE username_normalized = $1 LIMIT 1",
    [username],
  );
  const user = result.rows[0];
  if (!user || !(await compare(password, stringValue(user.password_hash)))) {
    throw new ApiError("Неверный ник или пароль.", 401);
  }
  return sessionResponse(await createSession(stringValue(user.id)));
}

async function logout(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await forumQuery("DELETE FROM forum_sessions WHERE token_hash = $1", [tokenHash(token)]);
  return clearSessionResponse();
}

async function changePassword(user: ForumUser, request: NextRequest, body: Record<string, unknown>) {
  const currentPassword = stringValue(body.currentPassword);
  const newPassword = stringValue(body.newPassword);
  if (newPassword.length < 10 || newPassword.length > 128) {
    throw new ApiError("Новый пароль должен содержать от 10 до 128 символов.");
  }
  if (currentPassword === newPassword) throw new ApiError("Новый пароль должен отличаться от текущего.");
  const result = await forumQuery<DbRow>("SELECT password_hash FROM forum_users WHERE id = $1 LIMIT 1", [user.id]);
  if (!result.rows[0] || !(await compare(currentPassword, stringValue(result.rows[0].password_hash)))) {
    throw new ApiError("Текущий пароль указан неверно.", 401);
  }
  await forumQuery(
    "UPDATE forum_users SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
    [await hash(newPassword, 12), user.id],
  );
  const currentToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (currentToken) {
    await forumQuery("DELETE FROM forum_sessions WHERE user_id = $1 AND token_hash <> $2", [user.id, tokenHash(currentToken)]);
  }
  return NextResponse.json({ ok: true });
}

async function createThread(user: ForumUser, body: Record<string, unknown>) {
  const boardId = stringValue(body.boardId).trim();
  const title = stringValue(body.title).trim();
  const text = stringValue(body.body).trim();
  if (title.length < 8 || title.length > 140) throw new ApiError("Заголовок должен содержать от 8 до 140 символов.");
  if (text.length < 20 || text.length > 20_000) throw new ApiError("Текст темы должен содержать от 20 до 20 000 символов.");

  const board = await forumQuery<DbRow>(
    `SELECT b.posting_min_rank, s.is_staff_only
     FROM forum_boards b JOIN forum_sections s ON s.id = b.section_id
     WHERE b.id = $1 LIMIT 1`,
    [boardId],
  );
  if (!board.rows[0]) throw new ApiError("Раздел не найден.", 404);
  if (Boolean(board.rows[0].is_staff_only) && user.role.rank < 20) throw new ApiError("Этот раздел доступен только составу.", 403);
  if (user.role.rank < numberValue(board.rows[0].posting_min_rank)) throw new ApiError("В этом разделе темы создаёт только администрация.", 403);

  const id = `t-${randomUUID()}`;
  await forumQuery(
    `INSERT INTO forum_threads (id, board_id, author_id, title, body)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, boardId, user.id, title, text],
  );
  return NextResponse.json({ ok: true, id });
}

async function createPost(user: ForumUser, body: Record<string, unknown>) {
  const threadId = stringValue(body.threadId).trim();
  const text = stringValue(body.body).trim();
  if (text.length < 2 || text.length > 10_000) throw new ApiError("Ответ должен содержать от 2 до 10 000 символов.");
  const thread = await forumQuery<DbRow>("SELECT status FROM forum_threads WHERE id = $1 LIMIT 1", [threadId]);
  if (!thread.rows[0]) throw new ApiError("Тема не найдена.", 404);
  if (thread.rows[0].status === "closed" && !user.role.canModerate) throw new ApiError("Тема закрыта для новых ответов.", 403);

  await forumQuery(
    `INSERT INTO forum_posts (id, thread_id, author_id, body) VALUES ($1,$2,$3,$4)`,
    [`p-${randomUUID()}`, threadId, user.id, text],
  );
  await forumQuery("UPDATE forum_threads SET updated_at = NOW() WHERE id = $1", [threadId]);
  return NextResponse.json({ ok: true });
}

async function setThreadStatus(user: ForumUser, body: Record<string, unknown>) {
  if (!user.role.canModerate) throw new ApiError("Нужны права модератора.", 403);
  const threadId = stringValue(body.threadId).trim();
  const status = stringValue(body.status) as ThreadStatus;
  if (!(status in statusLabels)) throw new ApiError("Неизвестный статус темы.");
  await forumQuery("UPDATE forum_threads SET status = $1, updated_at = NOW() WHERE id = $2", [status, threadId]);
  return NextResponse.json({ ok: true });
}

async function setUserRole(user: ForumUser, body: Record<string, unknown>) {
  if (!user.role.canManageRoles) throw new ApiError("Недостаточно прав для выдачи ролей.", 403);
  const userId = stringValue(body.userId).trim();
  const roleId = stringValue(body.roleId).trim();
  const targetResult = await forumQuery<DbRow>(
    `SELECT u.role_id, r.rank FROM forum_users u JOIN forum_roles r ON r.id = u.role_id WHERE u.id = $1 LIMIT 1`,
    [userId],
  );
  const roleResult = await forumQuery<DbRow>("SELECT id, rank FROM forum_roles WHERE id = $1 LIMIT 1", [roleId]);
  const target = targetResult.rows[0];
  const desired = roleResult.rows[0];
  if (!target || !desired) throw new ApiError("Пользователь или роль не найдены.", 404);
  if (target.role_id === "owner") throw new ApiError("Роль владельца CloudOwner защищена.", 403);
  if (roleId === "owner") throw new ApiError("Владелец назначается только системно.", 403);
  if (numberValue(target.rank) >= user.role.rank || numberValue(desired.rank) >= user.role.rank) {
    throw new ApiError("Нельзя управлять равной или более высокой ролью.", 403);
  }
  await forumQuery("UPDATE forum_users SET role_id = $1 WHERE id = $2", [roleId, userId]);
  return NextResponse.json({ ok: true });
}

async function saveSection(user: ForumUser, body: Record<string, unknown>) {
  requireForumManager(user);
  const id = stringValue(body.id).trim();
  const title = stringValue(body.title).trim();
  const description = stringValue(body.description).trim();
  const sortOrder = Math.max(0, Math.min(999, numberValue(body.sortOrder)));
  const isStaffOnly = Boolean(body.isStaffOnly);
  if (title.length < 3 || title.length > 80) throw new ApiError("Название раздела: от 3 до 80 символов.");
  if (description.length > 240) throw new ApiError("Описание раздела слишком длинное.");

  const sectionId = id || `section-${randomUUID()}`;
  if (id) {
    await forumQuery(
      "UPDATE forum_sections SET title=$1, description=$2, sort_order=$3, is_staff_only=$4 WHERE id=$5",
      [title, description, sortOrder, isStaffOnly, id],
    );
  } else {
    await forumQuery(
      "INSERT INTO forum_sections (id,title,description,sort_order,is_staff_only) VALUES ($1,$2,$3,$4,$5)",
      [sectionId, title, description, sortOrder, isStaffOnly],
    );
  }
  return NextResponse.json({ ok: true, id: sectionId });
}

async function deleteSection(user: ForumUser, body: Record<string, unknown>) {
  requireForumManager(user);
  await forumQuery("DELETE FROM forum_sections WHERE id = $1", [stringValue(body.id)]);
  return NextResponse.json({ ok: true });
}

async function saveBoard(user: ForumUser, body: Record<string, unknown>) {
  requireForumManager(user);
  const id = stringValue(body.id).trim();
  const sectionId = stringValue(body.sectionId).trim();
  const title = stringValue(body.title).trim();
  const description = stringValue(body.description).trim();
  const icon = stringValue(body.icon).trim().slice(0, 4) || "◆";
  const accent = stringValue(body.accent).trim();
  const sortOrder = Math.max(0, Math.min(999, numberValue(body.sortOrder)));
  const postingMinRank = Math.max(0, Math.min(100, numberValue(body.postingMinRank)));
  if (title.length < 3 || title.length > 100) throw new ApiError("Название подраздела: от 3 до 100 символов.");
  if (description.length > 300) throw new ApiError("Описание подраздела слишком длинное.");
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new ApiError("Цвет должен быть в формате #ff2d3f.");

  const boardId = id || `board-${randomUUID()}`;
  if (id) {
    await forumQuery(
      `UPDATE forum_boards SET section_id=$1,title=$2,description=$3,icon=$4,accent=$5,sort_order=$6,posting_min_rank=$7 WHERE id=$8`,
      [sectionId, title, description, icon, accent, sortOrder, postingMinRank, id],
    );
  } else {
    await forumQuery(
      `INSERT INTO forum_boards (id,section_id,title,description,icon,accent,sort_order,posting_min_rank)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [boardId, sectionId, title, description, icon, accent, sortOrder, postingMinRank],
    );
  }
  return NextResponse.json({ ok: true, id: boardId });
}

async function deleteBoard(user: ForumUser, body: Record<string, unknown>) {
  requireForumManager(user);
  await forumQuery("DELETE FROM forum_boards WHERE id = $1", [stringValue(body.id)]);
  return NextResponse.json({ ok: true });
}

function isPgUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

function errorResponse(error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: error.message, code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("CloudWorld forum API error", error);
  return NextResponse.json({ error: "Внутренняя ошибка форума. Повторите попытку позже." }, { status: 500 });
}
