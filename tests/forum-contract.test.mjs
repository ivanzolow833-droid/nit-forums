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
  assert.match(database, /owner_credentials_v3/);
  assert.match(database, /must_change_password=TRUE/);
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
  const editor = await source("src/components/forum-rich-editor.tsx");
  assert.match(editor, /function undo\(\)/);
  assert.match(editor, /function redo\(\)/);
  assert.match(editor, /historyIndex\.current -= 1/);
  assert.match(editor, /historyIndex\.current \+= 1/);
  assert.match(editor, /Ctrl\+Z/);
  assert.match(editor, /Предпросмотр/);
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
    "builder-application",
    "leader-application",
  ]) assert.match(data, new RegExp(`id: "${templateId}"`), `missing ${templateId}`);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /document\.execCommand\("copy"\)/);
  assert.match(app, /Заполнить тему/);
  assert.match(app, /PlayerTemplateLibrary/);
});
