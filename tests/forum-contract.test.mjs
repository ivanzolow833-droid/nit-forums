import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("granular permissions are unique and cover every required group", async () => {
  const text = await source("src/lib/forum-permissions.ts");
  const keys = [...text.matchAll(/\["(forum\.[a-z_.]+)",/g)].map((match) => match[1]);
  assert.equal(new Set(keys).size, keys.length);
  for (const required of [
    "forum.topic.create",
    "forum.topic.assign",
    "forum.topic.transfer",
    "forum.templates.global",
    "forum.audit.view",
    "forum.roles.manage",
    "forum.settings.manage",
  ]) assert.ok(keys.includes(required), `missing ${required}`);
});

test("migration contains every persistent forum subsystem", async () => {
  const text = await source("src/lib/forum-migrations.ts");
  for (const table of [
    "forum_role_permissions",
    "forum_topic_statuses",
    "forum_topic_assignments",
    "forum_topic_transfers",
    "forum_templates",
    "forum_signatures",
    "forum_notifications",
    "forum_conversations",
    "forum_messages",
    "forum_bookmarks",
    "forum_subscriptions",
    "forum_reactions",
    "forum_audit_log",
    "forum_trash",
    "forum_drafts",
    "forum_post_revisions",
    "forum_tags",
    "forum_topic_tags",
  ]) assert.match(text, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`), `missing ${table}`);
});

test("security controls remain enabled", async () => {
  const [route, config] = await Promise.all([
    source("src/app/api/forum/route.ts"),
    source("next.config.ts"),
  ]);
  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /assertCsrf\(request, session\)/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /bcryptjs/);
  assert.doesNotMatch(route, /dangerouslySetInnerHTML/);
  assert.match(config, /Content-Security-Policy/);
  assert.doesNotMatch(config, /output\s*:\s*["']export["']/);
});

test("authentication failures stay inside the API error boundary", async () => {
  const [route, database] = await Promise.all([
    source("src/app/api/forum/route.ts"),
    source("src/lib/forum-db.ts"),
  ]);
  assert.match(route, /action === "register"\) return await register/);
  assert.match(route, /action === "login"\) return await login/);
  assert.match(route, /action === "logout"\) return await logout/);
  assert.match(database, /process\.env\.FORUM_OWNER_PASSWORD/);
  assert.match(database, /password\.length < 12/);
  assert.doesNotMatch(database, /const DEFAULT_OWNER\s*=\s*\{[^}]*password:/s);
});

test("staff reply templates are seeded once without overwriting later edits", async () => {
  const database = await source("src/lib/forum-db.ts");
  for (const templateId of [
    "base-review",
    "base-punished",
    "base-evidence",
    "base-no-violation",
    "base-transfer",
    "base-rejected",
    "base-unpunished",
    "base-appeal-approved",
    "base-appeal-rejected",
    "base-clarification",
    "base-tech-resolved",
    "base-closed",
  ]) assert.match(database, new RegExp(`id: "${templateId}"`), `missing ${templateId}`);
  assert.match(database, /default_staff_templates_v1/);
  assert.match(database, /if \(marker\.rowCount\) return/);
});

test("AI suggestions use server-side Groq structured output and never auto-post", async () => {
  const route = await source("src/app/api/forum/route.ts");
  const start = route.indexOf("async function suggestAiReplies");
  const end = route.indexOf("function validateHttpsUrl", start);
  const handler = route.slice(start, end);
  assert.match(handler, /process\.env\.GROQ_API_KEY/);
  assert.match(handler, /https:\/\/api\.groq\.com\/openai\/v1\/responses/);
  assert.match(handler, /store: false/);
  assert.match(handler, /json_schema/);
  assert.match(handler, /ровно три готовых варианта/);
  assert.doesNotMatch(handler, /INSERT INTO forum_posts/);
});

test("personal appearance and owner branding are persistent server actions", async () => {
  const [route, store, database] = await Promise.all([
    source("src/app/api/forum/route.ts"),
    source("src/lib/forum-store.ts"),
    source("src/lib/forum-db.ts"),
  ]);
  assert.match(store, /action: "save_preferences"/);
  assert.match(store, /action: "save_forum_settings"; trashRetentionDays: number; appearance: ForumAppearanceSettings/);
  assert.match(route, /async function savePreferences/);
  assert.match(route, /async function saveForumSettings/);
  assert.match(route, /UPDATE forum_users SET settings=\$1::jsonb/);
  assert.match(database, /pinned_content_v1/);
  assert.match(database, /UPDATE forum_threads SET pinned=TRUE/);
});

test("rich editor exposes real undo, redo and preview controls", async () => {
  const [editor, app, styles] = await Promise.all([
    source("src/components/forum-rich-editor.tsx"),
    source("src/components/forum-app.tsx"),
    source("src/app/globals.css"),
  ]);
  assert.match(editor, /function undo\(\)/);
  assert.match(editor, /function redo\(\)/);
  assert.match(editor, /historyIndex\.current -= 1/);
  assert.match(editor, /historyIndex\.current \+= 1/);
  assert.match(editor, /Ctrl\+Z/);
  assert.match(editor, /Предпросмотр/);
  assert.match(editor, /\[center\]/);
  assert.match(editor, /formatted-center/);
  assert.match(editor, /forum-media-line/);
  assert.match(app, /className="author-role-badge" prominent/);
  assert.match(styles, /\.author-role-badge \{ width: 100%/);
  assert.match(styles, /\.post-signature \.signature-image-shell img \{ width: 100%/);
});

test("players receive safe copyable topic templates for core boards", async () => {
  const [data, app] = await Promise.all([
    source("src/lib/forum-data.ts"),
    source("src/components/forum-app.tsx"),
  ]);
  for (const templateId of [
    "player-report",
    "staff-report",
    "punishment-appeal",
    "technical-support",
    "purchase-problem",
    "helper-application",
    "moderator-application",
    "cooperation-request",
    "leader-application",
  ]) assert.match(data, new RegExp(`id: "${templateId}"`), `missing ${templateId}`);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /Заполнить тему/);
  assert.match(app, /PlayerTemplateLibrary/);
  assert.match(app, /player-template-visible-form/);
  assert.doesNotMatch(app, /<details className="player-template/);
});

test("AI case triage excludes confidential content and never changes a case", async () => {
  const route = await source("src/app/api/forum/route.ts");
  assert.match(route, /ai_triage_case/);
  assert.match(route, /p\.is_private=FALSE AND p\.is_internal=FALSE/);
  assert.match(route, /Окончательное решение всегда принимает сотрудник/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, triage \}\)/);
});

test("community workflows are persistent and permission checked", async () => {
  const [migration, community, route, permissions] = await Promise.all([
    source("src/lib/forum-migrations.ts"),
    source("src/lib/forum-community.ts"),
    source("src/app/api/forum/route.ts"),
    source("src/lib/forum-permissions.ts"),
  ]);
  for (const table of ["forum_content_reports", "forum_case_files", "forum_case_evidence", "forum_polls", "forum_knowledge_articles", "forum_events", "forum_market_transactions", "forum_notification_preferences", "forum_antispam_events", "forum_thread_redirects"]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  for (const permission of ["forum.reports.manage", "forum.cases.manage", "forum.evidence.manage", "forum.thread.merge", "forum.private_content.view"]) assert.match(permissions, new RegExp(permission.replaceAll(".", "\\.")));
  assert.match(community, /requirePermission\(user, "forum\.reports\.manage"\)/);
  assert.match(community, /requirePermission\(user, "forum\.cases\.manage"\)/);
  assert.match(route, /p\.is_private=FALSE/);
  assert.match(route, /p\.author_id=\$2 OR \$4=TRUE/);
});

test("Minecraft status is read directly without an extra cloud service", async () => {
  const status = await source("src/lib/minecraft-status.ts");
  assert.match(status, /from "node:net"/);
  assert.match(status, /connect\(\{ host: connectAddress, port \}\)/);
  assert.match(status, /isPrivateAddress/);
  assert.doesNotMatch(status, /fetch\(/);
});

test("recent thread query has no untyped parameter gap", async () => {
  const route = await source("src/app/api/forum/route.ts");
  const start = route.indexOf('async function loadThreads');
  const end = route.indexOf('async function loadPosts', start);
  const handler = route.slice(start, end);
  assert.match(handler, /const values: unknown\[\] = \[viewerId, role\.rank\]/);
  assert.match(handler, /values\.push\(manageHidden\)/);
  assert.doesNotMatch(handler, /\[viewerId, role\.rank, value, manageHidden\]/);
});

test("signature save has a stable JSON contract and resilient client parsing", async () => {
  const [route, store, signature, staff, image] = await Promise.all([
    source("src/app/api/forum/route.ts"),
    source("src/lib/forum-store.ts"),
    source("src/lib/forum-signature.ts"),
    source("src/components/forum-staff.tsx"),
    source("src/components/signature-image.tsx"),
  ]);
  assert.match(route, /NextResponse\.json\(\{ success: true, signature \}\)/);
  assert.match(route, /errorResponse\(error, action === "save_signature"\)/);
  assert.match(route, /signatureAction \? \{ success: false, error: message/);
  assert.match(route, /signature\.autoAppend/);
  assert.match(store, /if \(!response\.ok\)/);
  assert.match(store, /await response\.text\(\)/);
  assert.match(store, /Сервер вернул пустой ответ/);
  assert.doesNotMatch(store, /await response\.json\(\)/);
  assert.match(signature, /parsed\.protocol !== "https:"/);
  assert.match(signature, /SUPPORTED_IMAGE_PATH\.test\(parsed\.pathname\)/);
  assert.match(signature, /Укажите прямую ссылку на изображение, а не страницу сайта/);
  assert.match(staff, /saveForumSignature/);
  assert.match(staff, /maxLength=\{1000\}/);
  assert.match(image, /onError=\{\(\) => setState\("error"\)\}/);
  assert.match(image, /Изображение подписи не загрузилось/);
});

test("role cards stay distinct and author names open public profiles", async () => {
  const [app, badge, styles] = await Promise.all([
    source("src/components/forum-app.tsx"),
    source("src/components/role-badge.tsx"),
    source("src/app/globals.css"),
  ]);
  assert.match(app, /name: "profile"; userId: string/);
  assert.match(app, /function PublicProfileView/);
  assert.match(app, /className="author-profile-link"/);
  assert.match(app, /onProfile=\{\(userId\) => navigate\(\{ name: "profile", userId \}\)\}/);
  assert.match(badge, /--role-color/);
  assert.match(badge, /data-role=\{role\.id\}/);
  assert.match(styles, /role-badge-shine/);
  assert.match(styles, /public-profile-card/);
  assert.match(styles, /--cw-accent: #a855f7/);
});
