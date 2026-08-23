import type { ThreadStatus } from "@/lib/forum-data";
import type { RoleDefinition } from "@/lib/forum-roles";

export type ForumUser = {
  id: string;
  username: string;
  role: RoleDefinition;
  createdAt: string;
  mustChangePassword: boolean;
};

export type LatestThread = {
  id: string;
  title: string;
  authorName: string;
  authorRole: RoleDefinition;
  status: ThreadStatus;
  updatedAt: string;
};

export type ForumBoard = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  sortOrder: number;
  postingMinRank: number;
  threadCount: number;
  latestThread: LatestThread | null;
};

export type ForumSection = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  isStaffOnly: boolean;
  boards: ForumBoard[];
};

export type ForumThread = {
  id: string;
  boardId: string;
  title: string;
  body: string;
  status: ThreadStatus;
  author: ForumUser;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
};

export type ForumPost = {
  id: string;
  threadId: string;
  body: string;
  author: ForumUser;
  createdAt: string;
};

export type ForumPayload = {
  currentUser: ForumUser | null;
  roles: RoleDefinition[];
  stats: { members: number; threads: number; posts: number };
  sections: ForumSection[];
  recentThreads: ForumThread[];
  boardThreads: ForumThread[];
  activeThread: ForumThread | null;
  posts: ForumPost[];
  users: ForumUser[];
};

export type ForumAction =
  | { action: "register"; username: string; password: string }
  | { action: "login"; username: string; password: string }
  | { action: "logout" }
  | { action: "change_password"; currentPassword: string; newPassword: string }
  | { action: "create_thread"; boardId: string; title: string; body: string }
  | { action: "create_post"; threadId: string; body: string }
  | { action: "set_thread_status"; threadId: string; status: ThreadStatus }
  | { action: "set_user_role"; userId: string; roleId: string }
  | { action: "save_section"; id?: string; title: string; description: string; sortOrder: number; isStaffOnly: boolean }
  | { action: "delete_section"; id: string }
  | { action: "save_board"; id?: string; sectionId: string; title: string; description: string; icon: string; accent: string; sortOrder: number; postingMinRank: number }
  | { action: "delete_board"; id: string };

export class ForumRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function loadForum(params?: { boardId?: string; threadId?: string }) {
  const search = new URLSearchParams();
  if (params?.boardId) search.set("board", params.boardId);
  if (params?.threadId) search.set("thread", params.threadId);
  const suffix = search.size ? `?${search.toString()}` : "";
  const response = await fetch(`/api/forum${suffix}`, { cache: "no-store" });
  const data = (await response.json()) as ForumPayload & { error?: string };
  if (!response.ok) {
    throw new ForumRequestError(data.error ?? "Не удалось загрузить форум.", response.status);
  }
  return data;
}

export async function runForumAction(action: ForumAction) {
  const response = await fetch("/api/forum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const data = (await response.json()) as { ok?: boolean; error?: string; id?: string };
  if (!response.ok) {
    throw new ForumRequestError(data.error ?? "Действие не выполнено.", response.status);
  }
  return data;
}
