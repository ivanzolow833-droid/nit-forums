import { RoleBadge, StatusBadge } from "@/components/role-badge";
import {
  forumSections,
  statusLabel,
  type ForumBoard,
} from "@/lib/forum-data";

function BoardRow({ board }: { board: ForumBoard }) {
  return (
    <article className="panel flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(28,36,48,0.1)] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <div
        className="mc-block flex size-14 shrink-0 items-center justify-center rounded-full text-2xl text-white"
        style={{ backgroundColor: board.tone }}
        aria-hidden
      >
        {board.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg font-bold text-ink">{board.title}</h3>
          {board.latest.status === "new" ? (
            <StatusBadge label="Новое" tone="new" />
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Подфорумы: {board.subforums.join(" · ")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground sm:w-24 sm:flex-col sm:items-end">
        <span className="font-semibold text-ink">{board.threadsCount}</span>
        <span>тем</span>
      </div>

      <div className="min-w-0 sm:w-64">
        <div className="flex flex-wrap items-center gap-2">
          {board.latest.status ? (
            <StatusBadge
              label={statusLabel[board.latest.status]}
              tone={board.latest.status}
            />
          ) : null}
          <p className="truncate text-sm font-medium text-ink">
            {board.latest.title}
          </p>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{board.latest.when}</span>
          <span>·</span>
          <span className="font-semibold text-ink">{board.latest.author}</span>
          {board.latest.role ? <RoleBadge role={board.latest.role} /> : null}
        </p>
      </div>
    </article>
  );
}

export function ForumBoards() {
  return (
    <section id="boards" className="space-y-8">
      {forumSections.map((section) => (
        <div key={section.id}>
          <h2 className="mb-3 font-heading text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            {section.title}
          </h2>
          <div className="space-y-3">
            {section.boards.map((board) => (
              <BoardRow key={board.id} board={board} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
