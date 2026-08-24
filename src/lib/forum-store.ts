import type { PermissionKey } from "@/lib/forum-permissions";
import type { RoleDefinition } from "@/lib/forum-roles";

export type ForumUserPreferences = {
  theme: "dark" | "light" | "system";
  accent: "red" | "purple" | "blue" | "green" | "orange";
  density: "comfortable" | "compact";
  background: "aurora" | "plain" | "grid";
  sidebarCollapsed: boolean;
  reduceMotion: boolean;
  showSignatures: boolean;
  showOnline: boolean;
  showActivity: boolean;
  editorToolbar: boolean;
  profileBannerUrl: string;
  profileAccent: string;
  profileTitle: string;
  serverLabel: string;
  forumReadAt: string;
};

export type ForumAppearanceSettings = {
  forumName: string;
  forumSubtitle: string;
  announcement: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  logoImageUrl: string;
  serverName: string;
  serverIp: string;
  accentColor: string;
  showHero: boolean;
  showRightSidebar: boolean;
};

export const defaultForumUserPreferences: ForumUserPreferences = {
  theme: "dark",
  accent: "purple",
  density: "comfortable",
  background: "aurora",
  sidebarCollapsed: false,
  reduceMotion: false,
  showSignatures: true,
  showOnline: true,
  showActivity: true,
  editorToolbar: true,
  profileBannerUrl: "",
  profileAccent: "#a855f7",
  profileTitle: "",
  serverLabel: "CloudWorld",
  forumReadAt: "",
};

export const defaultForumAppearance: ForumAppearanceSettings = {
  forumName: "CloudWorld",
  forumSubtitle: "Официальный форум игрового проекта",
  announcement: "Перед публикацией обращения прочитайте правила и приложите доказательства.",
  heroTitle: "Твой мир. Твоя история.",
  heroSubtitle: "Новости CloudWorld, игровые разделы, обращения к администрации, заявки в состав и живое сообщество — всё в одном месте.",
  heroImageUrl: "/images/hero.jpg",
  logoImageUrl: "",
  serverName: "Сервер CloudWorld",
  serverIp: "cloudworldmc.ru",
  accentColor: "#a855f7",
  showHero: true,
  showRightSidebar: true,
};

export type ForumUser = {
  id: string;
  username: string;
  role: RoleDefinition;
  createdAt: string;
  mustChangePassword: boolean;
  avatarUrl: string;
  bio: string;
  points: number;
  reactionsCount: number;
  postsCount: number;
  lastSeenAt: string | null;
  online: boolean;
  achievements: ForumAchievement[];
  preferences: ForumUserPreferences;
};

export type ForumAchievement = {
  id: string;
  label: string;
  description: string;
  icon: string;
  points: number;
  awardedAt: string;
};

export type TopicStatusDefinition = {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
  system: boolean;
};

export type ForumTag = {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
};

export type ForumAssignment = {
  id: string;
  userId: string | null;
  username: string | null;
  roleId: string | null;
  roleLabel: string | null;
  reason: string;
  createdAt: string;
};

export type LatestThread = {
  id: string;
  title: string;
  authorName: string;
  authorRole: RoleDefinition;
  status: string;
  statusDefinition: TopicStatusDefinition;
  updatedAt: string;
};

export type FormFieldType = "text" | "textarea" | "select" | "multi-select" | "checkbox" | "radio" | "date" | "file" | "image" | "url";

export type ForumFormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  placeholder?: string;
};

export type ForumBoard = {
  id: string;
  sectionId: string;
  parentId: string | null;
  title: string;
  description: string;
  icon: string;
  accent: string;
  sortOrder: number;
  postingMinRank: number;
  replyMinRank: number;
  visibilityMinRank: number;
  moderatorRoleIds: string[];
  allowedStatusIds: string[];
  formSchema: ForumFormField[];
  reactionsEnabled: boolean;
  hidden: boolean;
  archived: boolean;
  threadCount: number;
  latestThread: LatestThread | null;
};

export type ForumSection = {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  sortOrder: number;
  isStaffOnly: boolean;
  hidden: boolean;
  archived: boolean;
  boards: ForumBoard[];
};

export type ForumThread = {
  id: string;
  boardId: string;
  title: string;
  body: string;
  status: string;
  statusDefinition: TopicStatusDefinition;
  author: ForumUser;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  viewCount: number;
  unread: boolean;
  locked: boolean;
  pinned: boolean;
  formData: Record<string, unknown>;
  assignment: ForumAssignment | null;
  tags: ForumTag[];
  bookmarked: boolean;
  subscribed: boolean;
  acceptedPostId: string | null;
  mergedIntoId: string | null;
};

export type ReactionSummary = {
  id: string;
  label: string;
  emoji: string;
  count: number;
  selected: boolean;
};

export type ReactionTypeDefinition = {
  id: string;
  label: string;
  emoji: string;
  sortOrder: number;
  enabled: boolean;
};

export type ForumSignature = {
  text: string;
  color: string;
  imageUrl: string;
  slogan: string;
  links: { label: string; url: string }[];
  autoAppend: boolean;
};

export type ForumPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ForumPost = {
  id: string;
  threadId: string;
  body: string;
  author: ForumUser;
  createdAt: string;
  editedAt: string | null;
  internal: boolean;
  privateContent: boolean;
  signature: ForumSignature | null;
  reactions: ReactionSummary[];
  revisions: { id: string; oldBody: string; newBody: string; editor: string; createdAt: string }[];
};

export type ForumContentReport = {
  id: string; targetType: "thread" | "post" | "user" | "market"; targetId: string; reason: string;
  status: "open" | "review" | "resolved" | "rejected"; priority: number; ageHours: number;
  reporterName: string; assignedName: string | null; resolution: string; createdAt: string;
};

export type ForumEvidence = {
  id: string; caseId: string; url: string; type: string; description: string; timecode: string;
  status: "pending" | "verified" | "rejected"; submittedBy: string; createdAt: string;
};

export type ForumCaseFile = {
  id: string; threadId: string | null; title: string; type: string;
  status: "open" | "review" | "waiting" | "resolved" | "rejected";
  priority: number; overdue: boolean; slaDueAt: string; assignedName: string | null;
  resolution: string; evidence: ForumEvidence[]; createdAt: string;
};

export type ForumPoll = {
  id: string; threadId: string; question: string; multipleChoice: boolean; closesAt: string | null; closed: boolean;
  options: { id: string; label: string; votes: number; selected: boolean }[];
};

export type KnowledgeArticle = { id: string; sourceThreadId: string | null; title: string; body: string; status: "draft" | "published" | "archived"; authorName: string; updatedAt: string };
export type ForumEvent = { id: string; title: string; description: string; startsAt: string; capacity: number; status: string; registered: number; myStatus: string | null };
export type MarketListing = { id: string; sellerId: string; sellerName: string; buyerId: string | null; type: "sell" | "buy" | "service"; title: string; description: string; priceLabel: string; status: string; transactionId: string | null; transactionStatus: string | null; createdAt: string };
export type MinecraftServerStatus = { online: boolean; playersOnline: number; playersMax: number; latencyMs: number | null; version: string; checkedAt: string };

export type ForumTemplate = {
  id: string;
  scope: "personal" | "role" | "global";
  ownerId: string | null;
  roleId: string | null;
  title: string;
  body: string;
  favorite: boolean;
  sortOrder: number;
  autoStatusId: string | null;
  autoClose: boolean;
  autoLock: boolean;
  transferRoleId: string | null;
  internalNote: string;
  enabled: boolean;
  variables: string[];
};

export type ForumNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  group: boolean;
  participants: string[];
  lastMessage: string;
  updatedAt: string;
  unread: boolean;
  archived: boolean;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  body: string;
  author: Pick<ForumUser, "id" | "username" | "avatarUrl">;
  createdAt: string;
};

export type ModerationStats = {
  newReports: number;
  assignedToMe: number;
  transferredToMe: number;
  resolvedToday: number;
  resolvedWeek: number;
  averageResponseMinutes: number;
};

export type AuditEntry = {
  id: string;
  actorName: string;
  action: string;
  objectType: string;
  objectId: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  ipHash: string;
};

export type TrashItem = {
  id: string;
  itemType: string;
  itemId: string;
  title: string;
  deletedAt: string;
  purgeAfter: string;
};

export type ForumIntegration = {
  id: string;
  provider: "discord" | "telegram" | "minecraft" | "luckperms";
  webhookUrl: string;
  secretEnvKey: string;
  eventTypes: string[];
  enabled: boolean;
};

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  category: string;
};

export type SearchResult = {
  type: "thread" | "post" | "user";
  id: string;
  title: string;
  excerpt: string;
  meta: string;
};

export type ForumAiSuggestion = {
  title: string;
  body: string;
  why: string;
  ruleReference: string;
  recommendedStatusId: string;
  closeTopic: boolean;
};

export type ForumPayload = {
  currentUser: ForumUser | null;
  viewingAsRole: RoleDefinition | null;
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
  topicStatuses: TopicStatusDefinition[];
  tags: ForumTag[];
  reactionTypes: ReactionTypeDefinition[];
  stats: { members: number; threads: number; posts: number };
  sections: ForumSection[];
  recentThreads: ForumThread[];
  boardThreads: ForumThread[];
  boardPagination: ForumPagination;
  activeThread: ForumThread | null;
  posts: ForumPost[];
  postPagination: ForumPagination;
  users: ForumUser[];
  staffUsers: ForumUser[];
  templates: ForumTemplate[];
  signature: ForumSignature | null;
  notifications: ForumNotification[];
  unreadNotifications: number;
  conversations: ConversationSummary[];
  conversationMessages: ConversationMessage[];
  unreadMessages: number;
  moderation: ModerationStats | null;
  audit: AuditEntry[];
  trash: TrashItem[];
  bookmarks: string[];
  subscriptions: string[];
  searchResults: SearchResult[];
  drafts: Record<string, unknown>;
  followers: ForumUser[];
  following: ForumUser[];
  blockedUsers: ForumUser[];
  integrations: ForumIntegration[];
  forumSettings: { trashRetentionDays: number; appearance: ForumAppearanceSettings };
  aiReplyAssistantEnabled: boolean;
  contentReports: ForumContentReport[];
  caseFiles: ForumCaseFile[];
  activePoll: ForumPoll | null;
  knowledgeArticles: KnowledgeArticle[];
  events: ForumEvent[];
  marketListings: MarketListing[];
  notificationPreferences: Record<string, boolean>;
  staffAvailability: { available: boolean; maxActiveCases: number } | null;
  serverStatus: MinecraftServerStatus;
};

export type ForumAiTriage = {
  summary: string;
  category: "report" | "appeal" | "support" | "application" | "other";
  priority: number;
  missingEvidence: string[];
  suggestedNextStep: string;
  duplicateThreadIds: string[];
  confidence: number;
};

export type ForumAction =
  | { action: "register"; username: string; password: string }
  | { action: "login"; username: string; password: string }
  | { action: "logout" }
  | { action: "change_password"; currentPassword: string; newPassword: string }
  | { action: "create_thread"; boardId: string; title: string; body: string; tagIds?: string[]; formData?: Record<string, unknown> }
  | { action: "create_post"; threadId: string; body: string; internal?: boolean; privateContent?: boolean }
  | { action: "edit_thread"; threadId: string; title: string; body: string }
  | { action: "delete_thread"; threadId: string }
  | { action: "move_thread"; threadId: string; boardId: string }
  | { action: "set_thread_pin"; threadId: string; pinned: boolean }
  | { action: "edit_post"; postId: string; body: string }
  | { action: "delete_post"; postId: string }
  | { action: "set_thread_status"; threadId: string; status: string }
  | { action: "set_thread_lock"; threadId: string; locked: boolean }
  | { action: "assign_thread"; threadId: string; userId?: string; roleId?: string; reason?: string }
  | { action: "release_thread"; threadId: string }
  | { action: "transfer_thread"; threadId: string; userId?: string; roleId?: string; reason: string }
  | { action: "set_user_role"; userId: string; roleId: string }
  | { action: "save_role"; role: Partial<RoleDefinition> & { id?: string; label: string; shortLabel: string; color: string; rank: number; permissions: string[] } }
  | { action: "clone_role"; roleId: string }
  | { action: "delete_role"; roleId: string; moveToRoleId: string }
  | { action: "toggle_role"; roleId: string; enabled: boolean }
  | { action: "save_status"; status: Partial<TopicStatusDefinition> & { label: string; color: string; sortOrder: number } }
  | { action: "delete_status"; statusId: string; moveToStatusId: string }
  | { action: "save_section"; id?: string; parentId?: string | null; title: string; description: string; sortOrder: number; isStaffOnly: boolean; hidden?: boolean; archived?: boolean }
  | { action: "delete_section"; id: string; mode: "move" | "trash"; moveToBoardId?: string }
  | { action: "save_board"; id?: string; sectionId: string; parentId?: string | null; title: string; description: string; icon: string; accent: string; sortOrder: number; postingMinRank: number; replyMinRank?: number; visibilityMinRank?: number; moderatorRoleIds?: string[]; allowedStatusIds?: string[]; formSchema?: ForumFormField[]; reactionsEnabled?: boolean; hidden?: boolean; archived?: boolean }
  | { action: "delete_board"; id: string; mode: "move" | "trash"; moveToBoardId?: string }
  | { action: "restore_trash"; id: string }
  | { action: "purge_trash"; id: string }
  | { action: "save_template"; template: Partial<ForumTemplate> & { title: string; body: string; scope: ForumTemplate["scope"] } }
  | { action: "duplicate_template"; templateId: string }
  | { action: "delete_template"; templateId: string }
  | { action: "use_template"; templateId: string; threadId: string; variables: Record<string, string> }
  | { action: "ai_suggest_reply"; threadId: string; guidance: string; tone: "neutral" | "strict" | "short" }
  | { action: "ai_triage_case"; caseId: string }
  | { action: "save_signature"; signature: ForumSignature }
  | { action: "mark_notifications_read" }
  | { action: "toggle_bookmark"; threadId: string }
  | { action: "toggle_subscription"; targetType: "thread" | "board"; targetId: string }
  | { action: "toggle_reaction"; postId: string; reactionId: string }
  | { action: "save_reaction_type"; reaction: ReactionTypeDefinition }
  | { action: "delete_reaction_type"; reactionId: string }
  | { action: "create_conversation"; title: string; participantIds: string[]; body: string }
  | { action: "send_message"; conversationId: string; body: string }
  | { action: "conversation_state"; conversationId: string; archived?: boolean; unread?: boolean; leave?: boolean }
  | { action: "block_user"; userId: string; blocked: boolean }
  | { action: "toggle_follow"; userId: string }
  | { action: "moderate_user"; userId: string; type: "warn" | "mute" | "ban"; reason: string; durationHours?: number }
  | { action: "save_profile"; avatarUrl: string; bio: string; profileBannerUrl: string; profileAccent: string; profileTitle: string; serverLabel: string }
  | { action: "save_preferences"; preferences: Partial<ForumUserPreferences> }
  | { action: "mark_forum_read" }
  | { action: "save_draft"; key: string; body: Record<string, unknown> }
  | { action: "delete_draft"; key: string }
  | { action: "set_view_as_role"; roleId: string | null }
  | { action: "save_tag"; tag: Partial<ForumTag> & { label: string; color: string; sortOrder: number } }
  | { action: "delete_tag"; tagId: string }
  | { action: "save_integration"; integration: ForumIntegration }
  | { action: "save_forum_settings"; trashRetentionDays: number; appearance: ForumAppearanceSettings }
  | { action: "report_content"; targetType: "thread" | "post" | "user" | "market"; targetId: string; reason: string }
  | { action: "moderate_report"; reportId: string; status: "review" | "resolved" | "rejected"; resolution?: string }
  | { action: "update_case"; caseId: string; status?: "open" | "review" | "waiting" | "resolved" | "rejected"; assignedTo?: string | null; resolution?: string; basePriority?: number }
  | { action: "claim_next_work" }
  | { action: "save_staff_availability"; available: boolean; maxActiveCases: number }
  | { action: "add_evidence"; caseId: string; url: string; evidenceType: string; description: string; timecode: string }
  | { action: "verify_evidence"; evidenceId: string; status: "verified" | "rejected" }
  | { action: "create_poll"; threadId: string; question: string; options: string[]; multipleChoice: boolean; closesAt?: string }
  | { action: "vote_poll"; pollId: string; optionIds: string[] }
  | { action: "close_poll"; pollId: string }
  | { action: "accept_answer"; threadId: string; postId: string }
  | { action: "publish_knowledge"; threadId: string; title: string; body: string }
  | { action: "create_event"; title: string; description: string; startsAt: string; capacity: number }
  | { action: "register_event"; eventId: string }
  | { action: "set_event_status"; eventId: string; status: "open" | "closed" | "completed" | "cancelled" }
  | { action: "create_market_listing"; listingType: "sell" | "buy" | "service"; title: string; description: string; priceLabel: string }
  | { action: "reserve_market_listing"; listingId: string }
  | { action: "update_market_transaction"; transactionId: string; status: "seller_confirmed" | "completed" | "cancelled" | "disputed" }
  | { action: "review_market_transaction"; transactionId: string; rating: number; body: string }
  | { action: "save_notification_preferences"; preferences: Record<string, boolean> }
  | { action: "merge_threads"; sourceThreadId: string; targetThreadId: string }
  | { action: "split_post"; postId: string; boardId: string; title: string };

export class ForumRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function csrfToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )cloudworld_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function loadForum(params?: { boardId?: string; threadId?: string; boardPage?: number; postPage?: number; conversationId?: string; search?: string; status?: string; tag?: string; role?: string; dateFrom?: string }) {
  const search = new URLSearchParams();
  if (params?.boardId) search.set("board", params.boardId);
  if (params?.threadId) search.set("thread", params.threadId);
  if (params?.boardPage && params.boardPage > 1) search.set("boardPage", String(params.boardPage));
  if (params?.postPage && params.postPage > 1) search.set("postPage", String(params.postPage));
  if (params?.conversationId) search.set("conversation", params.conversationId);
  if (params?.search) search.set("search", params.search);
  if (params?.status) search.set("status", params.status);
  if (params?.tag) search.set("tag", params.tag);
  if (params?.role) search.set("role", params.role);
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  const suffix = search.size ? `?${search.toString()}` : "";
  const response = await fetch(`/api/forum${suffix}`, { cache: "no-store" });
  if (!response.ok) {
    const data = await readForumResponse<ForumPayload & { error?: string }>(response, "Не удалось загрузить форум.");
    throw new ForumRequestError(data.error ?? "Не удалось загрузить форум.", response.status);
  }
  return readForumResponse<ForumPayload & { error?: string }>(response, "Не удалось загрузить форум.");
}

async function readForumResponse<T extends { error?: string }>(response: Response, fallbackError: string): Promise<T> {
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    throw new ForumRequestError(
      response.ok ? "Сервер вернул пустой ответ. Повторите попытку." : `${fallbackError} Сервер вернул пустой ответ.`,
      response.status,
    );
  }
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new ForumRequestError(
      response.ok ? "Сервер вернул некорректный ответ. Повторите попытку." : `${fallbackError} Ответ сервера имеет неверный формат.`,
      response.status,
    );
  }
}

export async function runForumAction(action: ForumAction) {
  const response = await fetch("/api/forum", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
    body: JSON.stringify(action),
  });
  type ActionResponse = { ok?: boolean; success?: boolean; error?: string; id?: string; signature?: ForumSignature; missingVariables?: string[]; suggestions?: ForumAiSuggestion[]; triage?: ForumAiTriage };
  if (!response.ok) {
    const data = await readForumResponse<ActionResponse>(response, "Действие не выполнено.");
    throw new ForumRequestError(data.error ?? "Действие не выполнено.", response.status);
  }
  const data = await readForumResponse<ActionResponse>(response, "Действие не выполнено.");
  if (data.success === false) throw new ForumRequestError(data.error ?? "Действие не выполнено.", response.status);
  return data;
}

export async function saveForumSignature(signature: ForumSignature) {
  const data = await runForumAction({ action: "save_signature", signature });
  if (!data.success || !data.signature) throw new ForumRequestError(data.error ?? "Подпись не была сохранена.");
  return data.signature;
}
