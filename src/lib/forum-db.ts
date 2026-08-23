import "server-only";

import { hash } from "bcryptjs";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
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
    await seedRoles(client);
    await seedOwner(client);
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
        (id, label, short_label, description, color, rank, can_moderate, can_manage_forum, can_manage_roles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         short_label = EXCLUDED.short_label,
         description = EXCLUDED.description,
         color = EXCLUDED.color,
         rank = EXCLUDED.rank,
         can_moderate = EXCLUDED.can_moderate,
         can_manage_forum = EXCLUDED.can_manage_forum,
         can_manage_roles = EXCLUDED.can_manage_roles`,
      [role.id, role.label, role.shortLabel, role.description, role.color, role.rank, role.canModerate, role.canManageForum, role.canManageRoles],
    );
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
