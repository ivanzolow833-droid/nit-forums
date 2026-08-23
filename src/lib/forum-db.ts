import "server-only";

import { hash } from "bcryptjs";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { runForumMigrations } from "@/lib/forum-migrations";
import { defaultRolePermissions, permissionDefinitions } from "@/lib/forum-permissions";
import { roleDefinitions } from "@/lib/forum-roles";

const DEFAULT_OWNER = {
  username: "CloudOwner",
  password: "CloudWorldAdmin1",
};

type ForumDbGlobal = typeof globalThis & {
  cloudWorldForumPool?: Pool;
  cloudWorldForumSchema?: Promise<void>;
};

const forumGlobal = globalThis as ForumDbGlobal;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("База данных ещё не подключена. Добавьте Neon Postgres к проекту Vercel и выполните повторный деплой.");
  }
}

export function getForumPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();

  if (!forumGlobal.cloudWorldForumPool) {
    forumGlobal.cloudWorldForumPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return forumGlobal.cloudWorldForumPool;
}

export async function forumQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  await ensureForumDatabase();
  return getForumPool().query<T>(text, values);
}

export async function ensureForumDatabase() {
  if (!forumGlobal.cloudWorldForumSchema) {
    forumGlobal.cloudWorldForumSchema = initializeForumDatabase().catch((error) => {
      forumGlobal.cloudWorldForumSchema = undefined;
      throw error;
    });
  }
  return forumGlobal.cloudWorldForumSchema;
}

async function initializeForumDatabase() {
  const client = await getForumPool().connect();
  try {
    await client.query("BEGIN");
    await createSchema(client);
    await runForumMigrations(client);
    await seedRoles(client);
    await seedPermissions(client);
    await seedTopicStatuses(client);
    await seedReactionTypes(client);
    await seedTagsAndAchievements(client);
    await seedIntegrations(client);
    await seedSettings(client);
    await seedOwner(client);
    await syncPrimaryUserRoles(client);
    await purgeExpiredTrash(client);
    await seedForumStructure(client);
    await seedForumThreads(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createSchema(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_roles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      short_label TEXT NOT NULL,
      description TEXT NOT NULL,
      color TEXT NOT NULL,
      rank INTEGER NOT NULL UNIQUE,
      can_moderate BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_forum BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_roles BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      username_normalized TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES forum_roles(id),
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE");
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_sections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_staff_only BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_boards (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL REFERENCES forum_sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '◆',
      accent TEXT NOT NULL DEFAULT '#ff2d3f',
      sort_order INTEGER NOT NULL DEFAULT 0,
      posting_min_rank INTEGER NOT NULL DEFAULT 0
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_threads (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES forum_boards(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES forum_users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES forum_users(id),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS forum_sessions_user_idx ON forum_sessions(user_id)");
  await client.query("CREATE INDEX IF NOT EXISTS forum_sessions_expiry_idx ON forum_sessions(expires_at)");
  await client.query("CREATE INDEX IF NOT EXISTS forum_boards_section_idx ON forum_boards(section_id, sort_order)");
  await client.query("CREATE INDEX IF NOT EXISTS forum_threads_board_idx ON forum_threads(board_id, updated_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS forum_posts_thread_idx ON forum_posts(thread_id, created_at)");
}

async function seedRoles(client: PoolClient) {
  for (const role of roleDefinitions) {
    await client.query(
      `INSERT INTO forum_roles
        (id, label, short_label, description, color, gradient, icon, badge, rank,
         is_enabled, show_in_profile, show_near_posts, show_in_users,
         can_moderate, can_manage_forum, can_manage_roles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO NOTHING`,
      [
        role.id, role.label, role.shortLabel, role.description, role.color,
        role.gradient, role.icon, role.badge, role.rank, role.enabled,
        role.showInProfile, role.showNearPosts, role.showInUsers,
        role.canModerate, role.canManageForum, role.canManageRoles,
      ],
    );
  }
}

async function seedPermissions(client: PoolClient) {
  for (const [key, label, category] of permissionDefinitions) {
    await client.query(
      `INSERT INTO forum_permissions (key, label, category)
       VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, category = EXCLUDED.category`,
      [key, label, category],
    );
  }

  for (const [roleId, permissions] of Object.entries(defaultRolePermissions)) {
    const roleExists = await client.query("SELECT 1 FROM forum_roles WHERE id=$1", [roleId]);
    if (!roleExists.rowCount) continue;
    const markerKey = `permission_seed:${roleId}`;
    const marker = await client.query("SELECT 1 FROM forum_settings WHERE key=$1", [markerKey]);
    if (marker.rowCount) continue;
    const existing = await client.query("SELECT 1 FROM forum_role_permissions WHERE role_id=$1 LIMIT 1", [roleId]);
    if (existing.rowCount) {
      await client.query("INSERT INTO forum_settings (key,value) VALUES ($1,'{\"seeded\":true}'::jsonb) ON CONFLICT (key) DO NOTHING", [markerKey]);
      continue;
    }
    for (const permission of permissions) {
      await client.query(
        `INSERT INTO forum_role_permissions (role_id, permission_key)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [roleId, permission],
      );
    }
    await client.query("INSERT INTO forum_settings (key,value) VALUES ($1,'{\"seeded\":true}'::jsonb) ON CONFLICT (key) DO NOTHING", [markerKey]);
  }
}

async function seedTopicStatuses(client: PoolClient) {
  const statuses = [
    ["open", "Открыто", "#60a5fa", 10, true],
    ["review", "На рассмотрении", "#fbbf24", 20, true],
    ["resolved", "Рассмотрено", "#4ade80", 30, true],
    ["punished", "Наказание выдано", "#ef4444", 40, true],
    ["unpunished", "Наказание снято", "#38bdf8", 50, true],
    ["evidence", "Требуются доказательства", "#fb923c", 60, true],
    ["transferred", "Передано", "#a78bfa", 70, true],
    ["rejected", "Отказано", "#fb7185", 80, true],
    ["closed", "Закрыто", "#64748b", 90, true],
    ["important", "Важно", "#ff6978", 5, true],
  ] as const;
  for (const status of statuses) {
    await client.query(
      `INSERT INTO forum_topic_statuses (id,label,color,sort_order,is_system)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [...status],
    );
  }
}

async function seedReactionTypes(client: PoolClient) {
  const reactions = [
    ["like", "Нравится", "👍", 10],
    ["love", "Любовь", "❤️", 20],
    ["laugh", "Смешно", "😂", 30],
    ["dislike", "Не нравится", "👎", 40],
    ["star", "Полезно", "⭐", 50],
  ] as const;
  for (const reaction of reactions) {
    await client.query(
      `INSERT INTO forum_reaction_types (id,label,emoji,sort_order)
       VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [...reaction],
    );
  }
}

async function seedTagsAndAchievements(client: PoolClient) {
  const tags = [
    ["cheats", "Читы", "#ef4444", 10],
    ["fraud", "Обман", "#f97316", 20],
    ["bug", "Баг", "#eab308", 30],
    ["donate", "Донат", "#22c55e", 40],
    ["appeal", "Апелляция", "#3b82f6", 50],
    ["report", "Жалоба", "#e11d48", 60],
    ["technical", "Техническая проблема", "#64748b", 70],
    ["suggestion", "Предложение", "#a855f7", 80],
  ] as const;
  for (const tag of tags) {
    await client.query(
      `INSERT INTO forum_tags (id,label,color,sort_order)
       VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [...tag],
    );
  }

  const achievements = [
    ["veteran", "Старожил", "Участник проекта больше года.", "◆", 100],
    ["active", "Активный участник", "Опубликовал 100 сообщений.", "⚡", 75],
    ["helpful", "Полезный пользователь", "Получил 50 положительных реакций.", "★", 100],
    ["community_helper", "Помощник сообщества", "Регулярно помогает другим игрокам.", "♥", 125],
  ] as const;
  for (const achievement of achievements) {
    await client.query(
      `INSERT INTO forum_achievements (id,label,description,icon,points)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [...achievement],
    );
  }
}

async function seedIntegrations(client: PoolClient) {
  const providers = ["discord", "telegram", "minecraft", "luckperms"];
  for (const provider of providers) {
    await client.query(
      `INSERT INTO forum_integrations (id,provider,event_types,is_enabled)
       VALUES ($1,$1,ARRAY['new_report','topic_transfer','punishment'],FALSE)
       ON CONFLICT (id) DO NOTHING`,
      [provider],
    );
  }
}

async function seedSettings(client: PoolClient) {
  const settings = [
    ["trash_retention", { days: 30 }],
    ["antispam", { postCooldownSeconds: 3, topicsPerHour: 5, maxLinks: 6, maxMentions: 10 }],
  ] as const;
  for (const [key, value] of settings) {
    await client.query("INSERT INTO forum_settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO NOTHING", [key, JSON.stringify(value)]);
  }
}

async function seedOwner(client: PoolClient) {
  const passwordHash = await hash(DEFAULT_OWNER.password, 12);
  await client.query(
    `INSERT INTO forum_users (id, username, username_normalized, password_hash, role_id, must_change_password, created_at)
     VALUES ('u-owner', $1, $2, $3, 'owner', TRUE, NOW())
     ON CONFLICT (username_normalized) DO UPDATE SET role_id = 'owner'`,
    [DEFAULT_OWNER.username, DEFAULT_OWNER.username.toLowerCase(), passwordHash],
  );
}

async function syncPrimaryUserRoles(client: PoolClient) {
  await client.query(`
    INSERT INTO forum_user_roles (user_id, role_id, is_primary)
    SELECT id, role_id, TRUE FROM forum_users
    ON CONFLICT (user_id, role_id) DO UPDATE SET is_primary = TRUE
  `);
}

async function purgeExpiredTrash(client: PoolClient) {
  const expired = await client.query<{ id: string; item_type: string; item_id: string }>(
    "SELECT id,item_type,item_id FROM forum_trash WHERE purge_after<=NOW() LIMIT 200",
  );
  for (const item of expired.rows) {
    if (item.item_type === "post") await client.query("DELETE FROM forum_posts WHERE id=$1", [item.item_id]);
    else if (item.item_type === "thread") await client.query("DELETE FROM forum_threads WHERE id=$1", [item.item_id]);
    else if (item.item_type === "board") await client.query("DELETE FROM forum_boards WHERE id=$1", [item.item_id]);
    else if (item.item_type === "section") await client.query("DELETE FROM forum_sections WHERE id=$1", [item.item_id]);
    await client.query("DELETE FROM forum_trash WHERE id=$1", [item.id]);
  }
}

const sections = [
  ["official", "Официальная информация", "Всё важное о проекте CloudWorld", 10, false],
  ["game", "Игровой мир", "Общение, экономика, гайды и события", 20, false],
  ["appeals", "Обращения к администрации", "Жалобы, обжалования и техническая помощь", 30, false],
  ["applications", "Заявления и наборы", "Набор в команду проекта и игровые составы", 40, false],
  ["community", "Сообщество", "Кланы, города, творчество и свободное общение", 50, false],
  ["staff", "Раздел администрации", "Закрытая рабочая зона состава", 90, true],
] as const;

const boards = [
  ["news", "official", "Новости проекта", "Обновления, вайпы, технические работы и официальные анонсы.", "N", "#ff2d3f", 10, 60],
  ["rules", "official", "Правила проекта", "Общие правила сервера, форума, чата, экономики и наказаний.", "R", "#ef4444", 20, 60],
  ["start", "official", "Как начать играть", "IP сервера, версии, привязка аккаунта и ответы новичкам.", "?", "#f59e0b", 30, 0],
  ["changelog", "official", "История обновлений", "Подробные списки изменений игрового сервера и форума.", "↻", "#8b5cf6", 40, 60],
  ["general", "game", "Общение игроков", "Обсуждение игры, знакомства и поиск напарников.", "C", "#38bdf8", 10, 0],
  ["market", "game", "Торговая площадка", "Покупка, продажа и обмен игровых ресурсов и услуг.", "$", "#22c55e", 20, 0],
  ["guides", "game", "Гайды и полезные материалы", "Инструкции, механики, схемы ферм и советы опытных игроков.", "G", "#14b8a6", 30, 0],
  ["events", "game", "Мероприятия и конкурсы", "Официальные и пользовательские события CloudWorld.", "★", "#f59e0b", 40, 0],
  ["suggestions", "game", "Идеи и предложения", "Предлагайте новые функции, режимы, плагины и улучшения.", "+", "#a855f7", 50, 0],
  ["support", "appeals", "Техническая поддержка", "Проблемы со входом, баги, лаги и вопросы по донату.", "T", "#64748b", 10, 0],
  ["player-reports", "appeals", "Жалобы на игроков", "Нарушения игроков с обязательными доказательствами.", "!", "#ef4444", 20, 0],
  ["staff-reports", "appeals", "Жалобы на администрацию", "Обращения по действиям сотрудников проекта.", "A", "#e11d48", 30, 0],
  ["appeals-ban", "appeals", "Обжалование наказаний", "Апелляции банов, мутов и других наказаний.", "§", "#f97316", 40, 0],
  ["donate-help", "appeals", "Проблемы с покупками", "Оплата прошла, но привилегия или товар не были выданы.", "D", "#eab308", 50, 0],
  ["helper-apps", "applications", "Набор в помощники", "Требования, форма заявления и результаты отбора.", "H", "#22c55e", 10, 0],
  ["moderator-apps", "applications", "Набор в модераторы", "Заявления на должность модератора форума и сервера.", "M", "#3b82f6", 20, 0],
  ["builder-apps", "applications", "Набор в строители", "Портфолио и заявления в строительную команду CloudWorld.", "B", "#f97316", 30, 0],
  ["leader-apps", "applications", "Заявки на лидерство", "Заявления на управление кланами, городами и игровыми проектами.", "L", "#a855f7", 40, 0],
  ["clans", "community", "Кланы и гильдии", "Создание кланов, набор участников и дипломатия.", "K", "#ec4899", 10, 0],
  ["towns", "community", "Города и поселения", "Презентации поселений, законы и набор жителей.", "⌂", "#06b6d4", 20, 0],
  ["media", "community", "Творчество и медиа", "Скриншоты, видео, постройки, арты и конкурсы контента.", "▶", "#8b5cf6", 30, 0],
  ["offtopic", "community", "Свободное общение", "Оффтоп и разговоры вне игрового процесса.", "#", "#64748b", 40, 0],
  ["staff-info", "staff", "Информация для состава", "Регламенты, объявления и рабочие инструкции.", "S", "#ff2d3f", 10, 20],
  ["staff-work", "staff", "Рабочие отчёты", "Отчётность модерации и администрации.", "W", "#d946ef", 20, 20],
] as const;

async function seedForumStructure(client: PoolClient) {
  for (const section of sections) {
    await client.query(
      `INSERT INTO forum_sections (id, title, description, sort_order, is_staff_only)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [...section],
    );
  }
  for (const board of boards) {
    await client.query(
      `INSERT INTO forum_boards
        (id, section_id, title, description, icon, accent, sort_order, posting_min_rank)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [...board],
    );
  }
}

async function seedForumThreads(client: PoolClient) {
  const seedThreads = [
    ["t-welcome", "start", "Добро пожаловать на официальный форум CloudWorld", "Это единое место для новостей, общения, обращений и заявлений. Перед публикацией обязательно прочитайте правила проекта.", "important", "6 hours"],
    ["t-rules", "rules", "Правила проекта CloudWorld", "Уважайте участников, не используйте запрещённые модификации, не обманывайте при сделках и прикладывайте доказательства к жалобам.", "important", "5 hours"],
    ["t-update", "news", "Большое обновление игрового мира", "Мы обновили серверную основу, игровые системы и подготовили новые мероприятия. Подробности будут публиковаться в этой теме.", "important", "2 hours"],
    ["t-guide", "guides", "Полезные команды для новичков", "Собираем в одной теме команды, подсказки по экономике и первые шаги после входа на сервер.", "open", "1 hour"],
    ["t-event", "events", "Ивент выходного дня", "Предлагайте формат следующего события. Лучший вариант получит отдельную награду и будет проведён администрацией.", "open", "20 minutes"],
  ] as const;

  for (const thread of seedThreads) {
    await client.query(
      `INSERT INTO forum_threads (id, board_id, author_id, title, body, status, created_at, updated_at)
       VALUES ($1,$2,'u-owner',$3,$4,$5,NOW() - $6::interval,NOW() - $6::interval)
       ON CONFLICT (id) DO NOTHING`,
      [...thread],
    );
  }

  await client.query(
    `INSERT INTO forum_posts (id, thread_id, author_id, body, created_at)
     VALUES ('p-welcome', 't-welcome', 'u-owner', 'Владелец проекта и администрация будут публиковать здесь подтверждённую информацию. Не передавайте никому пароль от аккаунта.', NOW() - INTERVAL '5 hours')
     ON CONFLICT (id) DO NOTHING`,
  );
}

export const bootstrapOwner = DEFAULT_OWNER;
