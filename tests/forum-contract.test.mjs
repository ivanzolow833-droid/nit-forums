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
