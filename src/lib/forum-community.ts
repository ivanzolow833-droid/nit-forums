import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { ensureForumDatabase, forumQuery, getForumPool } from "@/lib/forum-db";
import type {
  ForumCaseFile,
  ForumContentReport,
  ForumEvent,
  ForumPoll,
  ForumUser,
  KnowledgeArticle,
  MarketListing,
} from "@/lib/forum-store";

type Row = QueryResultRow & Record<string, unknown>;
const owners = new Set(["owner", "mrproper"]);

export class CommunityFeatureError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

function text(value: unknown) { return typeof value === "string" ? value : String(value ?? ""); }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function iso(value: unknown) { return value ? new Date(value instanceof Date ? value : text(value)).toISOString() : ""; }
function id(prefix: string) { return `${prefix}-${randomUUID()}`; }
function has(user: ForumUser, permission: string) { return owners.has(user.role.id) || user.role.permissions.includes(permission); }
function requirePermission(user: ForumUser, permission: string) { if (!has(user, permission)) throw new CommunityFeatureError("Недостаточно прав для этого действия.", 403); }
function required(value: unknown, label: string, min: number, max: number) {
  const result = text(value).trim();
  if (result.length < min || result.length > max) throw new CommunityFeatureError(`${label}: от ${min} до ${max} символов.`);
  return result;
}
function httpsUrl(value: unknown) {
  const raw = text(value).trim();
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new CommunityFeatureError("Укажите корректную HTTPS-ссылку на доказательство."); }
  if (parsed.protocol !== "https:" || raw.length > 1000 || /[<>"']/u.test(raw)) throw new CommunityFeatureError("Разрешены только безопасные HTTPS-ссылки.");
  return raw;
}

async function transaction<T>(callback: (client: PoolClient) => Promise<T>) {
  await ensureForumDatabase();
  const client = await getForumPool().connect();
  try { await client.query("BEGIN"); const result = await callback(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function nextAvailableStaff(permission: string) {
  const result = await forumQuery<Row>(
    `SELECT u.id
     FROM forum_staff_availability a
     JOIN forum_users u ON u.id=a.user_id
     JOIN forum_roles r ON r.id=u.role_id
     JOIN forum_role_permissions rp ON rp.role_id=r.id AND rp.permission_key=$1
     CROSS JOIN LATERAL (SELECT
       (SELECT COUNT(*) FROM forum_case_files c WHERE c.assigned_to=u.id AND c.status IN ('open','review','waiting'))+
       (SELECT COUNT(*) FROM forum_content_reports cr WHERE cr.assigned_to=u.id AND cr.status IN ('open','review')) AS active_count
     ) workload
     WHERE a.is_available=TRUE AND r.is_enabled=TRUE
       AND workload.active_count < a.max_active_cases
     ORDER BY workload.active_count,a.updated_at
     LIMIT 1`, [permission],
  );
  return result.rows[0] ? text(result.rows[0].id) : null;
}

export async function createCaseForThread(threadId: string, title: string, boardId: string, authorId: string) {
  const monitored = new Set(["player-reports", "staff-reports", "appeals-ban", "support", "donate-help", "helper-apps", "moderator-apps", "leader-apps", "cooperation"]);
  if (!monitored.has(boardId)) return;
  const type = ["player-reports", "staff-reports"].includes(boardId) ? "report" : boardId === "appeals-ban" ? "appeal" : ["helper-apps", "moderator-apps", "leader-apps", "cooperation"].includes(boardId) ? "application" : "support";
  const assignedTo = await nextAvailableStaff("forum.cases.manage");
  await forumQuery(
    `INSERT INTO forum_case_files (id,thread_id,title,case_type,assigned_to,created_by)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (thread_id) DO NOTHING`,
    [id("case"), threadId, title, type, assignedTo, authorId],
  );
}

export async function assessForumContent(user: ForumUser, body: string, targetType: "thread" | "post") {
  const reasons: string[] = [];
  let score = 0;
  if ((body.match(/https?:\/\//gi)?.length ?? 0) >= 4) { score += 30; reasons.push("много ссылок"); }
  if (/(.)\1{14,}/u.test(body)) { score += 30; reasons.push("повторяющиеся символы"); }
  if (body.length > 40 && new Set(body.toLowerCase().replace(/\s/gu, "")).size < 8) { score += 35; reasons.push("однообразный текст"); }
  const duplicate = await forumQuery<Row>(
    targetType === "thread"
      ? "SELECT 1 FROM forum_threads WHERE author_id=$1 AND body=$2 AND created_at>NOW()-INTERVAL '24 hours' LIMIT 1"
      : "SELECT 1 FROM forum_posts WHERE author_id=$1 AND body=$2 AND created_at>NOW()-INTERVAL '24 hours' LIMIT 1",
    [user.id, body],
  );
  if (duplicate.rowCount) { score += 80; reasons.push("точный дубль"); }
  if (score > 0) await forumQuery(
    "INSERT INTO forum_antispam_events (id,user_id,target_type,score,reasons,action) VALUES ($1,$2,$3,$4,$5::jsonb,$6)",
    [id("spam"), user.id, targetType, score, JSON.stringify(reasons), score >= 80 ? "blocked" : "allowed"],
  );
  if (score >= 80) throw new CommunityFeatureError(`Публикация остановлена антиспамом: ${reasons.join(", ")}.`, 429);
}

export async function loadCommunityData(user: ForumUser | null, activeThreadId: string) {
  const viewerId = user?.id ?? "";
  const canReports = Boolean(user && has(user, "forum.reports.manage"));
  const canCases = Boolean(user && has(user, "forum.cases.manage"));
  const canMarket = Boolean(user && has(user, "forum.market.manage"));
  const [reportResult, caseResult, pollResult, articleResult, eventResult, marketResult, preferenceResult, availabilityResult] = await Promise.all([
    canReports ? forumQuery<Row>(
      `SELECT cr.*,ru.username reporter_name,au.username assigned_name,
        FLOOR(EXTRACT(EPOCH FROM (NOW()-cr.created_at))/3600)::int age_hours,
        cr.base_priority+FLOOR(EXTRACT(EPOCH FROM (NOW()-cr.created_at))/3600)::int priority_score
       FROM forum_content_reports cr JOIN forum_users ru ON ru.id=cr.reporter_id LEFT JOIN forum_users au ON au.id=cr.assigned_to
       ORDER BY CASE WHEN cr.status IN ('open','review') THEN 0 ELSE 1 END,priority_score DESC,cr.created_at LIMIT 200`,
    ) : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof forumQuery<Row>>>),
    canCases ? forumQuery<Row>(
      `SELECT c.*,au.username assigned_name,
        c.base_priority+FLOOR(EXTRACT(EPOCH FROM (NOW()-c.created_at))/3600)::int priority_score,
        c.sla_due_at<NOW() AND c.status IN ('open','review','waiting') overdue,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'caseId',e.case_id,'url',e.url,'type',e.evidence_type,'description',e.description,'timecode',e.timecode,'status',e.verification_status,'submittedBy',su.username,'createdAt',e.created_at) ORDER BY e.created_at) FROM forum_case_evidence e JOIN forum_users su ON su.id=e.submitted_by WHERE e.case_id=c.id),'[]'::jsonb) evidence
       FROM forum_case_files c LEFT JOIN forum_users au ON au.id=c.assigned_to
       ORDER BY CASE WHEN c.status IN ('open','review','waiting') THEN 0 ELSE 1 END,overdue DESC,priority_score DESC,c.created_at LIMIT 200`,
    ) : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof forumQuery<Row>>>),
    activeThreadId ? forumQuery<Row>(
      `SELECT p.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'votes',(SELECT COUNT(*) FROM forum_poll_votes v WHERE v.option_id=o.id),'selected',EXISTS(SELECT 1 FROM forum_poll_votes v WHERE v.option_id=o.id AND v.user_id=$2)) ORDER BY o.sort_order) FROM forum_poll_options o WHERE o.poll_id=p.id),'[]'::jsonb) options
       FROM forum_polls p WHERE p.thread_id=$1 ORDER BY p.created_at DESC LIMIT 1`, [activeThreadId, viewerId],
    ) : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof forumQuery<Row>>>),
    forumQuery<Row>("SELECT a.*,u.username author_name FROM forum_knowledge_articles a JOIN forum_users u ON u.id=a.author_id WHERE a.status='published' OR a.author_id=$1 ORDER BY a.updated_at DESC LIMIT 100", [viewerId]),
    forumQuery<Row>(
      `SELECT e.*,COUNT(r.user_id) FILTER (WHERE r.status IN ('registered','attended'))::int registered,
        (SELECT status FROM forum_event_registrations mine WHERE mine.event_id=e.id AND mine.user_id=$1) my_status
       FROM forum_events e LEFT JOIN forum_event_registrations r ON r.event_id=e.id
       WHERE e.status<>'draft' OR e.created_by=$1 GROUP BY e.id ORDER BY e.starts_at LIMIT 100`, [viewerId],
    ),
    forumQuery<Row>(
      `SELECT l.*,u.username seller_name,t.id transaction_id,t.buyer_id,t.status transaction_status
       FROM forum_market_listings l JOIN forum_users u ON u.id=l.seller_id
       LEFT JOIN forum_market_transactions t ON t.listing_id=l.id AND (t.buyer_id=$1 OR l.seller_id=$1 OR $2=TRUE)
       WHERE l.status<>'closed' OR l.seller_id=$1 OR $2=TRUE ORDER BY l.created_at DESC LIMIT 100`, [viewerId, canMarket],
    ),
    user ? forumQuery<Row>("SELECT notification_type,is_enabled FROM forum_notification_preferences WHERE user_id=$1", [user.id]) : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof forumQuery<Row>>>),
    user ? forumQuery<Row>("SELECT is_available,max_active_cases FROM forum_staff_availability WHERE user_id=$1", [user.id]) : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof forumQuery<Row>>>),
  ]);

  const contentReports: ForumContentReport[] = reportResult.rows.map((row) => ({ id: text(row.id), targetType: text(row.target_type) as ForumContentReport["targetType"], targetId: text(row.target_id), reason: text(row.reason), status: text(row.status) as ForumContentReport["status"], priority: number(row.priority_score), ageHours: number(row.age_hours), reporterName: text(row.reporter_name), assignedName: row.assigned_name ? text(row.assigned_name) : null, resolution: text(row.resolution), createdAt: iso(row.created_at) }));
  const caseFiles: ForumCaseFile[] = caseResult.rows.map((row) => ({ id: text(row.id), threadId: row.thread_id ? text(row.thread_id) : null, title: text(row.title), type: text(row.case_type), status: text(row.status) as ForumCaseFile["status"], priority: number(row.priority_score), overdue: Boolean(row.overdue), slaDueAt: iso(row.sla_due_at), assignedName: row.assigned_name ? text(row.assigned_name) : null, resolution: text(row.resolution), evidence: Array.isArray(row.evidence) ? row.evidence as ForumCaseFile["evidence"] : [], createdAt: iso(row.created_at) }));
  const pollRow = pollResult.rows[0];
  const activePoll: ForumPoll | null = pollRow ? { id: text(pollRow.id), threadId: text(pollRow.thread_id), question: text(pollRow.question), multipleChoice: Boolean(pollRow.multiple_choice), closesAt: pollRow.closes_at ? iso(pollRow.closes_at) : null, closed: Boolean(pollRow.is_closed) || Boolean(pollRow.closes_at && new Date(iso(pollRow.closes_at)) <= new Date()), options: Array.isArray(pollRow.options) ? pollRow.options as ForumPoll["options"] : [] } : null;
  const knowledgeArticles: KnowledgeArticle[] = articleResult.rows.map((row) => ({ id: text(row.id), sourceThreadId: row.source_thread_id ? text(row.source_thread_id) : null, title: text(row.title), body: text(row.body), status: text(row.status) as KnowledgeArticle["status"], authorName: text(row.author_name), updatedAt: iso(row.updated_at) }));
  const events: ForumEvent[] = eventResult.rows.map((row) => ({ id: text(row.id), title: text(row.title), description: text(row.description), startsAt: iso(row.starts_at), capacity: number(row.capacity), status: text(row.status), registered: number(row.registered), myStatus: row.my_status ? text(row.my_status) : null }));
  const marketListings: MarketListing[] = marketResult.rows.map((row) => ({ id: text(row.id), sellerId: text(row.seller_id), sellerName: text(row.seller_name), buyerId: row.buyer_id ? text(row.buyer_id) : null, type: text(row.listing_type) as MarketListing["type"], title: text(row.title), description: text(row.description), priceLabel: text(row.price_label), status: text(row.status), transactionId: row.transaction_id ? text(row.transaction_id) : null, transactionStatus: row.transaction_status ? text(row.transaction_status) : null, createdAt: iso(row.created_at) }));
  return {
    contentReports, caseFiles, activePoll, knowledgeArticles, events, marketListings,
    notificationPreferences: Object.fromEntries(preferenceResult.rows.map((row) => [text(row.notification_type), Boolean(row.is_enabled)])),
    staffAvailability: availabilityResult.rows[0] ? { available: Boolean(availabilityResult.rows[0].is_available), maxActiveCases: number(availabilityResult.rows[0].max_active_cases) } : null,
  };
}

export async function reportContent(user: ForumUser, targetType: "thread" | "post" | "user" | "market", targetId: string, reasonValue: unknown) {
  if (!["thread", "post", "user", "market"].includes(targetType)) throw new CommunityFeatureError("Некорректный тип жалобы.");
  const reason = required(reasonValue, "Причина жалобы", 5, 1000);
  const checks: Record<typeof targetType, string> = {
    thread: "SELECT 1 FROM forum_threads WHERE id=$1 AND deleted_at IS NULL",
    post: "SELECT 1 FROM forum_posts WHERE id=$1 AND deleted_at IS NULL",
    user: "SELECT 1 FROM forum_users WHERE id=$1",
    market: "SELECT 1 FROM forum_market_listings WHERE id=$1",
  };
  const exists = await forumQuery<Row>(checks[targetType], [targetId]);
  if (!exists.rowCount) throw new CommunityFeatureError("Объект жалобы не найден.", 404);
  const assignedTo = await nextAvailableStaff("forum.reports.manage");
  try {
    await forumQuery("INSERT INTO forum_content_reports (id,reporter_id,target_type,target_id,reason,assigned_to) VALUES ($1,$2,$3,$4,$5,$6)", [id("report"), user.id, targetType, targetId, reason, assignedTo]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new CommunityFeatureError("Вы уже отправили открытую жалобу на этот объект.", 409);
    throw error;
  }
}

export async function moderateReport(user: ForumUser, reportId: string, status: "review" | "resolved" | "rejected", resolutionValue: unknown) {
  requirePermission(user, "forum.reports.manage");
  const resolution = status === "review" ? text(resolutionValue).trim().slice(0, 1000) : required(resolutionValue, "Решение", 3, 1000);
  const result = await forumQuery("UPDATE forum_content_reports SET status=$1,resolution=$2,assigned_to=COALESCE(assigned_to,$3),updated_at=NOW() WHERE id=$4", [status, resolution, user.id, reportId]);
  if (!result.rowCount) throw new CommunityFeatureError("Жалоба не найдена.", 404);
}

export async function updateCase(user: ForumUser, values: { caseId: string; status?: string; assignedTo?: string | null; resolution?: unknown; basePriority?: number }) {
  requirePermission(user, "forum.cases.manage");
  const status = values.status && ["open", "review", "waiting", "resolved", "rejected"].includes(values.status) ? values.status : null;
  const priority = values.basePriority === undefined ? null : Math.max(0, Math.min(100, Number(values.basePriority)));
  const resolution = values.resolution === undefined ? null : text(values.resolution).trim().slice(0, 2000);
  const result = await forumQuery(
    "UPDATE forum_case_files SET status=COALESCE($1,status),assigned_to=COALESCE($2,assigned_to),resolution=COALESCE($3,resolution),base_priority=COALESCE($4,base_priority),updated_at=NOW() WHERE id=$5",
    [status, values.assignedTo || null, resolution, priority, values.caseId],
  );
  if (!result.rowCount) throw new CommunityFeatureError("Дело не найдено.", 404);
}

export async function claimNextWork(user: ForumUser) {
  requirePermission(user, "forum.cases.manage");
  return transaction(async (client) => {
    const [caseResult, reportResult] = await Promise.all([
      client.query<Row>(`SELECT id,(base_priority+FLOOR(EXTRACT(EPOCH FROM (NOW()-created_at))/3600)+(CASE WHEN sla_due_at<NOW() THEN 10000 ELSE 0 END)) score
        FROM forum_case_files WHERE assigned_to IS NULL AND status IN ('open','review','waiting') ORDER BY score DESC,created_at LIMIT 1 FOR UPDATE SKIP LOCKED`),
      client.query<Row>(`SELECT id,(base_priority+FLOOR(EXTRACT(EPOCH FROM (NOW()-created_at))/3600)) score
        FROM forum_content_reports WHERE assigned_to IS NULL AND status IN ('open','review') ORDER BY score DESC,created_at LIMIT 1 FOR UPDATE SKIP LOCKED`),
    ]);
    const caseItem = caseResult.rows[0]; const reportItem = reportResult.rows[0];
    if (!caseItem && !reportItem) throw new CommunityFeatureError("Свободных обращений в очереди нет.", 404);
    if (caseItem && (!reportItem || number(caseItem.score) >= number(reportItem.score))) {
      await client.query("UPDATE forum_case_files SET assigned_to=$1,status='review',updated_at=NOW() WHERE id=$2", [user.id, caseItem.id]);
      return text(caseItem.id);
    }
    await client.query("UPDATE forum_content_reports SET assigned_to=$1,status='review',updated_at=NOW() WHERE id=$2", [user.id, reportItem.id]);
    return text(reportItem.id);
  });
}

export async function saveStaffAvailability(user: ForumUser, available: boolean, maxActiveCases: number) {
  requirePermission(user, "forum.cases.manage");
  await forumQuery(`INSERT INTO forum_staff_availability (user_id,is_available,max_active_cases) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET is_available=$2,max_active_cases=$3,updated_at=NOW()`, [user.id, available, Math.max(1, Math.min(50, maxActiveCases))]);
}

export async function addEvidence(user: ForumUser, values: { caseId: string; url: unknown; evidenceType: unknown; description: unknown; timecode: unknown }) {
  const access = await forumQuery<Row>("SELECT created_by FROM forum_case_files WHERE id=$1", [values.caseId]);
  if (!access.rows[0]) throw new CommunityFeatureError("Дело не найдено.", 404);
  if (text(access.rows[0].created_by) !== user.id && !has(user, "forum.evidence.manage")) throw new CommunityFeatureError("Добавлять материалы может автор обращения или администрация.", 403);
  await forumQuery("INSERT INTO forum_case_evidence (id,case_id,submitted_by,url,evidence_type,description,timecode) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("evidence"), values.caseId, user.id, httpsUrl(values.url), text(values.evidenceType).trim().slice(0, 30) || "other", text(values.description).trim().slice(0, 1000), text(values.timecode).trim().slice(0, 80)]);
}

export async function verifyEvidence(user: ForumUser, evidenceId: string, status: "verified" | "rejected") {
  requirePermission(user, "forum.evidence.manage");
  await forumQuery("UPDATE forum_case_evidence SET verification_status=$1,checked_by=$2,checked_at=NOW() WHERE id=$3", [status, user.id, evidenceId]);
}

export async function createPoll(user: ForumUser, values: { threadId: string; question: unknown; options: unknown[]; multipleChoice: boolean; closesAt?: string }) {
  const thread = await forumQuery<Row>("SELECT author_id FROM forum_threads WHERE id=$1 AND deleted_at IS NULL", [values.threadId]);
  if (!thread.rows[0]) throw new CommunityFeatureError("Тема не найдена.", 404);
  if (text(thread.rows[0].author_id) !== user.id && !has(user, "forum.polls.manage")) throw new CommunityFeatureError("Опрос создаёт автор темы или администрация.", 403);
  const question = required(values.question, "Вопрос", 5, 300);
  const options = [...new Set(values.options.map((value) => text(value).trim()).filter((value) => value.length >= 1))].slice(0, 12);
  if (options.length < 2) throw new CommunityFeatureError("Добавьте минимум два варианта ответа.");
  await transaction(async (client) => {
    const pollId = id("poll");
    await client.query("INSERT INTO forum_polls (id,thread_id,question,multiple_choice,closes_at,created_by) VALUES ($1,$2,$3,$4,$5,$6)", [pollId, values.threadId, question, values.multipleChoice, values.closesAt ? new Date(values.closesAt) : null, user.id]);
    for (let index = 0; index < options.length; index += 1) await client.query("INSERT INTO forum_poll_options (id,poll_id,label,sort_order) VALUES ($1,$2,$3,$4)", [id("option"), pollId, options[index].slice(0, 160), index]);
  });
}

export async function votePoll(user: ForumUser, pollId: string, optionIds: string[]) {
  const poll = await forumQuery<Row>("SELECT multiple_choice,is_closed,closes_at FROM forum_polls WHERE id=$1", [pollId]);
  if (!poll.rows[0]) throw new CommunityFeatureError("Опрос не найден.", 404);
  if (poll.rows[0].is_closed || (poll.rows[0].closes_at && new Date(iso(poll.rows[0].closes_at)) <= new Date())) throw new CommunityFeatureError("Опрос уже закрыт.", 403);
  const selected = [...new Set(optionIds)].slice(0, poll.rows[0].multiple_choice ? 12 : 1);
  if (!selected.length) throw new CommunityFeatureError("Выберите вариант ответа.");
  await transaction(async (client) => {
    await client.query("DELETE FROM forum_poll_votes WHERE poll_id=$1 AND user_id=$2", [pollId, user.id]);
    for (const optionId of selected) await client.query("INSERT INTO forum_poll_votes (poll_id,option_id,user_id) SELECT $1,id,$2 FROM forum_poll_options WHERE id=$3 AND poll_id=$1", [pollId, user.id, optionId]);
  });
}

export async function closePoll(user: ForumUser, pollId: string) {
  const poll = await forumQuery<Row>("SELECT created_by FROM forum_polls WHERE id=$1", [pollId]);
  if (!poll.rows[0]) throw new CommunityFeatureError("Опрос не найден.", 404);
  if (text(poll.rows[0].created_by) !== user.id && !has(user, "forum.polls.manage")) throw new CommunityFeatureError("Недостаточно прав.", 403);
  await forumQuery("UPDATE forum_polls SET is_closed=TRUE WHERE id=$1", [pollId]);
}

export async function acceptAnswer(user: ForumUser, threadId: string, postId: string) {
  const thread = await forumQuery<Row>("SELECT author_id FROM forum_threads WHERE id=$1", [threadId]);
  if (!thread.rows[0]) throw new CommunityFeatureError("Тема не найдена.", 404);
  if (text(thread.rows[0].author_id) !== user.id && !has(user, "forum.knowledge.manage")) throw new CommunityFeatureError("Ответ отмечает автор темы или администрация.", 403);
  const post = await forumQuery("SELECT 1 FROM forum_posts WHERE id=$1 AND thread_id=$2 AND deleted_at IS NULL AND is_private=FALSE AND is_internal=FALSE", [postId, threadId]);
  if (!post.rowCount) throw new CommunityFeatureError("Этот ответ нельзя принять.");
  await forumQuery("UPDATE forum_threads SET accepted_post_id=$1,status='resolved',updated_at=NOW() WHERE id=$2", [postId, threadId]);
}

export async function publishKnowledge(user: ForumUser, threadId: string, titleValue: unknown, bodyValue: unknown) {
  requirePermission(user, "forum.knowledge.manage");
  const title = required(titleValue, "Заголовок", 5, 160); const body = required(bodyValue, "Статья", 20, 30_000);
  await forumQuery("INSERT INTO forum_knowledge_articles (id,source_thread_id,title,body,status,author_id,approved_by) VALUES ($1,$2,$3,$4,'published',$5,$5)", [id("article"), threadId || null, title, body, user.id]);
}

export async function createEvent(user: ForumUser, values: { title: unknown; description: unknown; startsAt: string; capacity: number }) {
  requirePermission(user, "forum.events.manage");
  const startsAt = new Date(values.startsAt);
  if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) throw new CommunityFeatureError("Укажите будущую дату мероприятия.");
  const eventId = id("event");
  const title = required(values.title, "Название", 3, 120);
  await transaction(async (client) => {
    await client.query("INSERT INTO forum_events (id,title,description,starts_at,capacity,status,created_by) VALUES ($1,$2,$3,$4,$5,'open',$6)", [eventId, title, required(values.description, "Описание", 10, 5000), startsAt, Math.max(0, Math.min(10000, values.capacity)), user.id]);
    await client.query(`INSERT INTO forum_notifications (id,user_id,type,title,body,href)
      SELECT 'notification-'||md5(random()::text||clock_timestamp()::text||u.id),u.id,'event_reminder','Новое мероприятие',$1,'community:events'
      FROM forum_users u WHERE u.id<>$2 AND NOT EXISTS(SELECT 1 FROM forum_notification_preferences p WHERE p.user_id=u.id AND p.notification_type='event_reminder' AND p.is_enabled=FALSE)`, [title, user.id]);
  });
}

export async function registerEvent(user: ForumUser, eventId: string) {
  const event = await forumQuery<Row>("SELECT capacity,status,(SELECT COUNT(*) FROM forum_event_registrations WHERE event_id=$1 AND status='registered') registered FROM forum_events WHERE id=$1", [eventId]);
  if (!event.rows[0] || event.rows[0].status !== "open") throw new CommunityFeatureError("Регистрация закрыта.", 403);
  const status = number(event.rows[0].capacity) > 0 && number(event.rows[0].registered) >= number(event.rows[0].capacity) ? "waitlist" : "registered";
  await forumQuery(`INSERT INTO forum_event_registrations (event_id,user_id,status) VALUES ($1,$2,$3) ON CONFLICT (event_id,user_id) DO UPDATE SET status=CASE WHEN forum_event_registrations.status IN ('registered','waitlist') THEN 'cancelled' ELSE $3 END`, [eventId, user.id, status]);
}

export async function setEventStatus(user: ForumUser, eventId: string, status: string) {
  requirePermission(user, "forum.events.manage");
  if (!["open", "closed", "completed", "cancelled"].includes(status)) throw new CommunityFeatureError("Некорректный статус.");
  await forumQuery("UPDATE forum_events SET status=$1,updated_at=NOW() WHERE id=$2", [status, eventId]);
}

export async function createMarketListing(user: ForumUser, values: { listingType: string; title: unknown; description: unknown; priceLabel: unknown }) {
  if (!["sell", "buy", "service"].includes(values.listingType)) throw new CommunityFeatureError("Некорректный тип объявления.");
  await assessForumContent(user, `${text(values.title)} ${text(values.description)}`, "thread");
  await forumQuery("INSERT INTO forum_market_listings (id,seller_id,listing_type,title,description,price_label) VALUES ($1,$2,$3,$4,$5,$6)", [id("listing"), user.id, values.listingType, required(values.title, "Название", 4, 140), required(values.description, "Описание", 10, 5000), required(values.priceLabel, "Цена", 1, 80)]);
}

export async function reserveMarketListing(user: ForumUser, listingId: string) {
  await transaction(async (client) => {
    const listing = await client.query<Row>("SELECT seller_id,status FROM forum_market_listings WHERE id=$1 FOR UPDATE", [listingId]);
    if (!listing.rows[0] || listing.rows[0].status !== "open") throw new CommunityFeatureError("Объявление уже недоступно.", 409);
    if (text(listing.rows[0].seller_id) === user.id) throw new CommunityFeatureError("Нельзя оформить собственное объявление.");
    await client.query("UPDATE forum_market_listings SET status='reserved',updated_at=NOW() WHERE id=$1", [listingId]);
    const transactionId = id("deal");
    await client.query("INSERT INTO forum_market_transactions (id,listing_id,buyer_id) VALUES ($1,$2,$3)", [transactionId, listingId, user.id]);
    await client.query(`INSERT INTO forum_notifications (id,user_id,type,title,body,href)
      SELECT $1,seller_id,'market','Начата безопасная сделка','Покупатель зарезервировал ваше объявление','community:market'
      FROM forum_market_listings WHERE id=$2 AND NOT EXISTS(SELECT 1 FROM forum_notification_preferences p WHERE p.user_id=seller_id AND p.notification_type='market' AND p.is_enabled=FALSE)`, [id("notification"), listingId]);
  });
}

export async function updateMarketTransaction(user: ForumUser, transactionId: string, status: string) {
  const result = await forumQuery<Row>("SELECT t.*,l.seller_id FROM forum_market_transactions t JOIN forum_market_listings l ON l.id=t.listing_id WHERE t.id=$1", [transactionId]);
  const transactionRow = result.rows[0];
  if (!transactionRow) throw new CommunityFeatureError("Сделка не найдена.", 404);
  const seller = text(transactionRow.seller_id) === user.id; const buyer = text(transactionRow.buyer_id) === user.id;
  if (!seller && !buyer && !has(user, "forum.market.manage")) throw new CommunityFeatureError("Сделка недоступна.", 403);
  if (status === "seller_confirmed" && !seller) throw new CommunityFeatureError("Подтверждение ожидается от продавца.", 403);
  if (status === "completed" && !buyer && !has(user, "forum.market.manage")) throw new CommunityFeatureError("Завершение подтверждает покупатель.", 403);
  if (!["seller_confirmed", "completed", "cancelled", "disputed"].includes(status)) throw new CommunityFeatureError("Некорректный статус сделки.");
  await transaction(async (client) => {
    await client.query("UPDATE forum_market_transactions SET status=$1,updated_at=NOW() WHERE id=$2", [status, transactionId]);
    await client.query("UPDATE forum_market_listings SET status=$1,updated_at=NOW() WHERE id=$2", [status === "seller_confirmed" ? "reserved" : status === "cancelled" ? "open" : status, transactionRow.listing_id]);
    if (status === "disputed") await client.query("INSERT INTO forum_content_reports (id,reporter_id,target_type,target_id,reason,base_priority) VALUES ($1,$2,'market',$3,$4,30) ON CONFLICT DO NOTHING", [id("report"), user.id, transactionRow.listing_id, `Спор по сделке ${transactionId}`]);
    const recipientId = seller ? text(transactionRow.buyer_id) : text(transactionRow.seller_id);
    if (recipientId) await client.query(`INSERT INTO forum_notifications (id,user_id,type,title,body,href)
      SELECT $1,$2,'market','Статус сделки изменён',$3,'community:market'
      WHERE NOT EXISTS(SELECT 1 FROM forum_notification_preferences p WHERE p.user_id=$2 AND p.notification_type='market' AND p.is_enabled=FALSE)`, [id("notification"), recipientId, status === "disputed" ? "По сделке открыт спор" : status === "completed" ? "Сделка завершена" : status === "cancelled" ? "Сделка отменена" : "Продавец подтвердил сделку"]);
  });
}

export async function reviewMarketTransaction(user: ForumUser, transactionId: string, ratingValue: number, bodyValue: unknown) {
  const result = await forumQuery<Row>("SELECT t.status,t.buyer_id,l.seller_id FROM forum_market_transactions t JOIN forum_market_listings l ON l.id=t.listing_id WHERE t.id=$1", [transactionId]);
  const row = result.rows[0];
  if (!row || row.status !== "completed") throw new CommunityFeatureError("Отзыв доступен только после завершённой сделки.");
  const targetId = text(row.buyer_id) === user.id ? text(row.seller_id) : text(row.seller_id) === user.id ? text(row.buyer_id) : "";
  if (!targetId) throw new CommunityFeatureError("Вы не участвуете в этой сделке.", 403);
  await forumQuery("INSERT INTO forum_market_reviews (transaction_id,author_id,target_id,rating,body) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (transaction_id,author_id) DO UPDATE SET rating=$4,body=$5", [transactionId, user.id, targetId, Math.max(1, Math.min(5, ratingValue)), text(bodyValue).trim().slice(0, 1000)]);
}

export async function saveNotificationPreferences(user: ForumUser, preferences: Record<string, boolean>) {
  const allowed = ["private_message", "thread_reply", "mention", "private_content", "reaction", "new_follower", "board_topic", "status_changed", "assigned", "transferred", "role_changed", "case_sla", "event_reminder", "market"];
  await transaction(async (client) => { for (const type of allowed) if (preferences[type] !== undefined) await client.query(`INSERT INTO forum_notification_preferences (user_id,notification_type,is_enabled) VALUES ($1,$2,$3) ON CONFLICT (user_id,notification_type) DO UPDATE SET is_enabled=$3`, [user.id, type, Boolean(preferences[type])]); });
}

export async function mergeThreads(user: ForumUser, sourceThreadId: string, targetThreadId: string) {
  requirePermission(user, "forum.thread.merge");
  if (!sourceThreadId || sourceThreadId === targetThreadId) throw new CommunityFeatureError("Выберите две разные темы.");
  await transaction(async (client) => {
    const threads = await client.query<Row>("SELECT id FROM forum_threads WHERE id=ANY($1::text[]) AND deleted_at IS NULL", [[sourceThreadId, targetThreadId]]);
    if (threads.rowCount !== 2) throw new CommunityFeatureError("Одна из тем не найдена.", 404);
    await client.query("UPDATE forum_posts SET thread_id=$1 WHERE thread_id=$2", [targetThreadId, sourceThreadId]);
    await client.query("INSERT INTO forum_thread_redirects (source_thread_id,target_thread_id,merged_by) VALUES ($1,$2,$3) ON CONFLICT (source_thread_id) DO UPDATE SET target_thread_id=$2,merged_by=$3,created_at=NOW()", [sourceThreadId, targetThreadId, user.id]);
    await client.query("UPDATE forum_threads SET merged_into_id=$1,locked=TRUE,status='closed',updated_at=NOW() WHERE id=$2", [targetThreadId, sourceThreadId]);
    await client.query("UPDATE forum_threads SET updated_at=NOW() WHERE id=$1", [targetThreadId]);
  });
}

export async function splitPost(user: ForumUser, postId: string, boardId: string, titleValue: unknown) {
  requirePermission(user, "forum.thread.merge");
  const post = await forumQuery<Row>("SELECT p.*,t.title source_title FROM forum_posts p JOIN forum_threads t ON t.id=p.thread_id WHERE p.id=$1 AND p.deleted_at IS NULL", [postId]);
  if (!post.rows[0]) throw new CommunityFeatureError("Сообщение не найдено.", 404);
  if (Boolean(post.rows[0].is_private) && !has(user, "forum.private_content.view")) throw new CommunityFeatureError("Сообщение недоступно.", 403);
  const board = await forumQuery("SELECT 1 FROM forum_boards WHERE id=$1 AND deleted_at IS NULL AND is_archived=FALSE", [boardId]);
  if (!board.rowCount) throw new CommunityFeatureError("Целевой раздел недоступен.");
  const threadId = id("t");
  await transaction(async (client) => {
    await client.query("INSERT INTO forum_threads (id,board_id,author_id,title,body,status) VALUES ($1,$2,$3,$4,$5,'open')", [threadId, boardId, post.rows[0].author_id, required(titleValue, "Название", 8, 140), post.rows[0].body]);
    await client.query("UPDATE forum_posts SET deleted_at=NOW() WHERE id=$1", [postId]);
  });
  return threadId;
}
