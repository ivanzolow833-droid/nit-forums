import type { PoolClient } from "pg";

type Migration = {
  version: number;
  name: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    version: 2,
    name: "full_forum_foundation",
    sql: `
      ALTER TABLE forum_roles DROP CONSTRAINT IF EXISTS forum_roles_rank_key;
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS gradient TEXT NOT NULL DEFAULT '';
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '';
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS badge TEXT NOT NULL DEFAULT '';
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS show_in_profile BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS show_near_posts BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE forum_roles ADD COLUMN IF NOT EXISTS show_in_users BOOLEAN NOT NULL DEFAULT TRUE;
      UPDATE forum_roles SET label='Helper',short_label='Helper',description='Помогает игрокам и обрабатывает обращения первой линии.' WHERE id='helper' AND label='Помощник';

      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS reactions_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS posts_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

      ALTER TABLE forum_sessions ADD COLUMN IF NOT EXISTS csrf_hash TEXT;
      ALTER TABLE forum_sessions ADD COLUMN IF NOT EXISTS view_as_role_id TEXT;

      ALTER TABLE forum_sections ADD COLUMN IF NOT EXISTS parent_id TEXT;
      ALTER TABLE forum_sections ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_sections ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_sections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS parent_id TEXT;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS visibility_min_rank INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS reply_min_rank INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS moderator_role_ids TEXT[] NOT NULL DEFAULT '{}'::text[];
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS allowed_status_ids TEXT[] NOT NULL DEFAULT '{}'::text[];
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS form_schema JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS reactions_enabled BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_boards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS form_data JSONB NOT NULL DEFAULT '{}'::jsonb;
      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

      ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
      ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS signature_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

      CREATE TABLE IF NOT EXISTS forum_permissions (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        category TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS forum_role_permissions (
        role_id TEXT NOT NULL REFERENCES forum_roles(id) ON DELETE CASCADE,
        permission_key TEXT NOT NULL REFERENCES forum_permissions(key) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_key)
      );
      CREATE TABLE IF NOT EXISTS forum_user_roles (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES forum_roles(id) ON DELETE CASCADE,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        assigned_by TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, role_id)
      );
      CREATE TABLE IF NOT EXISTS forum_topic_statuses (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_topic_assignments (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        assigned_user_id TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        assigned_role_id TEXT REFERENCES forum_roles(id) ON DELETE SET NULL,
        assigned_by TEXT NOT NULL REFERENCES forum_users(id),
        reason TEXT NOT NULL DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        released_at TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX IF NOT EXISTS forum_topic_assignment_active_idx ON forum_topic_assignments(thread_id) WHERE active = TRUE;
      CREATE TABLE IF NOT EXISTS forum_topic_transfers (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        from_user_id TEXT NOT NULL REFERENCES forum_users(id),
        to_user_id TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        to_role_id TEXT REFERENCES forum_roles(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_templates (
        id TEXT PRIMARY KEY,
        owner_id TEXT REFERENCES forum_users(id) ON DELETE CASCADE,
        role_id TEXT REFERENCES forum_roles(id) ON DELETE CASCADE,
        scope TEXT NOT NULL CHECK (scope IN ('personal','role','global')),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        auto_status_id TEXT REFERENCES forum_topic_statuses(id) ON DELETE SET NULL,
        auto_close BOOLEAN NOT NULL DEFAULT FALSE,
        auto_lock BOOLEAN NOT NULL DEFAULT FALSE,
        transfer_role_id TEXT REFERENCES forum_roles(id) ON DELETE SET NULL,
        internal_note TEXT NOT NULL DEFAULT '',
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_template_variables (
        template_id TEXT NOT NULL REFERENCES forum_templates(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        PRIMARY KEY (template_id, key)
      );
      CREATE TABLE IF NOT EXISTS forum_signatures (
        user_id TEXT PRIMARY KEY REFERENCES forum_users(id) ON DELETE CASCADE,
        text TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#cbd5e1',
        image_url TEXT NOT NULL DEFAULT '',
        slogan TEXT NOT NULL DEFAULT '',
        links JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        href TEXT NOT NULL DEFAULT '',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS forum_notifications_user_idx ON forum_notifications(user_id, is_read, created_at DESC);
      CREATE TABLE IF NOT EXISTS forum_conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        is_group BOOLEAN NOT NULL DEFAULT FALSE,
        created_by TEXT NOT NULL REFERENCES forum_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_conversation_members (
        conversation_id TEXT NOT NULL REFERENCES forum_conversations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        is_unread BOOLEAN NOT NULL DEFAULT FALSE,
        left_at TIMESTAMPTZ,
        last_read_at TIMESTAMPTZ,
        PRIMARY KEY (conversation_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS forum_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES forum_conversations(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES forum_users(id),
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS forum_user_blocks (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        blocked_user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, blocked_user_id)
      );
      CREATE TABLE IF NOT EXISTS forum_user_follows (
        follower_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        followed_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (follower_id, followed_id)
      );
      CREATE TABLE IF NOT EXISTS forum_user_sanctions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        actor_id TEXT NOT NULL REFERENCES forum_users(id),
        type TEXT NOT NULL CHECK (type IN ('warn','mute','ban')),
        reason TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_bookmarks (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, thread_id)
      );
      CREATE TABLE IF NOT EXISTS forum_subscriptions (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK (target_type IN ('thread','board')),
        target_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, target_type, target_id)
      );
      CREATE TABLE IF NOT EXISTS forum_reaction_types (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        emoji TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS forum_reactions (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        reaction_id TEXT NOT NULL REFERENCES forum_reaction_types(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, post_id)
      );
      CREATE TABLE IF NOT EXISTS forum_audit_log (
        id TEXT PRIMARY KEY,
        actor_id TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id TEXT NOT NULL,
        old_value JSONB,
        new_value JSONB,
        ip_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS forum_audit_created_idx ON forum_audit_log(created_at DESC);
      CREATE TABLE IF NOT EXISTS forum_trash (
        id TEXT PRIMARY KEY,
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        deleted_by TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        purge_after TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
        UNIQUE (item_type, item_id)
      );
      CREATE TABLE IF NOT EXISTS forum_drafts (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        draft_key TEXT NOT NULL,
        body JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, draft_key)
      );
      CREATE TABLE IF NOT EXISTS forum_post_revisions (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        old_body TEXT NOT NULL,
        new_body TEXT NOT NULL,
        edited_by TEXT NOT NULL REFERENCES forum_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_tags (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS forum_topic_tags (
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (thread_id, tag_id)
      );
      CREATE TABLE IF NOT EXISTS forum_achievements (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS forum_user_achievements (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES forum_achievements(id) ON DELETE CASCADE,
        awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, achievement_id)
      );
      CREATE TABLE IF NOT EXISTS forum_rate_limits (
        key TEXT PRIMARY KEY,
        window_started_at TIMESTAMPTZ NOT NULL,
        hits INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS forum_integrations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        webhook_url TEXT NOT NULL DEFAULT '',
        secret_env_key TEXT NOT NULL DEFAULT '',
        event_types TEXT[] NOT NULL DEFAULT '{}'::text[],
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS forum_assignments_user_idx ON forum_topic_assignments(assigned_user_id, active);
      CREATE INDEX IF NOT EXISTS forum_transfers_thread_idx ON forum_topic_transfers(thread_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS forum_templates_owner_idx ON forum_templates(owner_id, scope, sort_order);
      CREATE INDEX IF NOT EXISTS forum_messages_conversation_idx ON forum_messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS forum_bookmarks_user_idx ON forum_bookmarks(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS forum_revisions_post_idx ON forum_post_revisions(post_id, created_at DESC);
    `,
  },
  {
    version: 3,
    name: "community_workflows_and_safe_content",
    sql: `
      ALTER TABLE forum_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
      ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS accepted_post_id TEXT;
      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS merged_into_id TEXT;

      CREATE TABLE IF NOT EXISTS forum_content_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK (target_type IN ('thread','post','user','market')),
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','review','resolved','rejected')),
        base_priority INTEGER NOT NULL DEFAULT 10,
        assigned_to TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        resolution TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (reporter_id,target_type,target_id,status)
      );
      CREATE INDEX IF NOT EXISTS forum_content_reports_queue_idx ON forum_content_reports(status,created_at);

      CREATE TABLE IF NOT EXISTS forum_case_files (
        id TEXT PRIMARY KEY,
        thread_id TEXT UNIQUE REFERENCES forum_threads(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        case_type TEXT NOT NULL DEFAULT 'request',
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','review','waiting','resolved','rejected')),
        base_priority INTEGER NOT NULL DEFAULT 10,
        sla_due_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
        assigned_to TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        created_by TEXT NOT NULL REFERENCES forum_users(id),
        resolution TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS forum_case_queue_idx ON forum_case_files(status,sla_due_at,created_at);

      CREATE TABLE IF NOT EXISTS forum_case_evidence (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL REFERENCES forum_case_files(id) ON DELETE CASCADE,
        submitted_by TEXT NOT NULL REFERENCES forum_users(id),
        url TEXT NOT NULL,
        evidence_type TEXT NOT NULL DEFAULT 'other',
        description TEXT NOT NULL DEFAULT '',
        timecode TEXT NOT NULL DEFAULT '',
        verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
        checked_by TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        checked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS forum_staff_availability (
        user_id TEXT PRIMARY KEY REFERENCES forum_users(id) ON DELETE CASCADE,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        max_active_cases INTEGER NOT NULL DEFAULT 5,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS forum_polls (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        multiple_choice BOOLEAN NOT NULL DEFAULT FALSE,
        closes_at TIMESTAMPTZ,
        created_by TEXT NOT NULL REFERENCES forum_users(id),
        is_closed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_poll_options (
        id TEXT PRIMARY KEY,
        poll_id TEXT NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS forum_poll_votes (
        poll_id TEXT NOT NULL REFERENCES forum_polls(id) ON DELETE CASCADE,
        option_id TEXT NOT NULL REFERENCES forum_poll_options(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (poll_id,option_id,user_id)
      );

      CREATE TABLE IF NOT EXISTS forum_knowledge_articles (
        id TEXT PRIMARY KEY,
        source_thread_id TEXT REFERENCES forum_threads(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        author_id TEXT NOT NULL REFERENCES forum_users(id),
        approved_by TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS forum_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed','completed','cancelled')),
        created_by TEXT NOT NULL REFERENCES forum_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_event_registrations (
        event_id TEXT NOT NULL REFERENCES forum_events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','waitlist','attended','cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (event_id,user_id)
      );

      CREATE TABLE IF NOT EXISTS forum_market_listings (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL REFERENCES forum_users(id),
        listing_type TEXT NOT NULL CHECK (listing_type IN ('sell','buy','service')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price_label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reserved','completed','closed','disputed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_market_transactions (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL REFERENCES forum_market_listings(id) ON DELETE CASCADE,
        buyer_id TEXT NOT NULL REFERENCES forum_users(id),
        status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','seller_confirmed','completed','cancelled','disputed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (listing_id,buyer_id)
      );
      CREATE TABLE IF NOT EXISTS forum_market_reviews (
        transaction_id TEXT NOT NULL REFERENCES forum_market_transactions(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES forum_users(id),
        target_id TEXT NOT NULL REFERENCES forum_users(id),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        body TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (transaction_id,author_id)
      );

      CREATE TABLE IF NOT EXISTS forum_notification_preferences (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        notification_type TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (user_id,notification_type)
      );
      CREATE TABLE IF NOT EXISTS forum_antispam_events (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES forum_users(id) ON DELETE SET NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL DEFAULT '',
        score INTEGER NOT NULL,
        reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
        action TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS forum_thread_redirects (
        source_thread_id TEXT PRIMARY KEY,
        target_thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        merged_by TEXT NOT NULL REFERENCES forum_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO forum_case_files (id,thread_id,title,case_type,status,base_priority,sla_due_at,created_by,created_at,updated_at)
      SELECT 'case-'||t.id,t.id,t.title,
        CASE WHEN t.board_id IN ('player-reports','staff-reports') THEN 'report'
             WHEN t.board_id='appeals-ban' THEN 'appeal'
             WHEN t.board_id IN ('helper-apps','moderator-apps','leader-apps') THEN 'application'
             ELSE 'support' END,
        CASE WHEN t.status IN ('closed','resolved','rejected','punished','unpunished') THEN 'resolved' ELSE 'open' END,
        10,t.created_at + INTERVAL '24 hours',t.author_id,t.created_at,t.updated_at
      FROM forum_threads t
      WHERE t.deleted_at IS NULL AND t.board_id IN ('player-reports','staff-reports','appeals-ban','support','donate-help','helper-apps','moderator-apps','leader-apps')
      ON CONFLICT (thread_id) DO NOTHING;

      UPDATE forum_boards SET is_hidden=TRUE,is_archived=TRUE WHERE id='builder-apps';
    `,
  },
  {
    version: 4,
    name: "forum_read_tracking_and_views",
    sql: `
      ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS forum_thread_reads (
        user_id TEXT NOT NULL REFERENCES forum_users(id) ON DELETE CASCADE,
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, thread_id)
      );
      CREATE INDEX IF NOT EXISTS forum_thread_reads_user_idx
        ON forum_thread_reads(user_id, last_read_at DESC);

      CREATE TABLE IF NOT EXISTS forum_thread_viewers (
        thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        viewer_key TEXT NOT NULL,
        viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (thread_id, viewer_key)
      );
      CREATE INDEX IF NOT EXISTS forum_thread_viewers_viewed_idx
        ON forum_thread_viewers(viewed_at);
    `,
  },
];

export async function runForumMigrations(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const applied = await client.query("SELECT 1 FROM forum_schema_migrations WHERE version = $1", [migration.version]);
    if (applied.rowCount) continue;
    await client.query(migration.sql);
    await client.query(
      "INSERT INTO forum_schema_migrations (version, name) VALUES ($1, $2)",
      [migration.version, migration.name],
    );
  }
}
