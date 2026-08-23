"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import {
  initialThreads,
  roleForAuthor,
  statusLabel,
  type Thread,
} from "@/lib/forum-data";

export function ThreadBoard() {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  const [openId, setOpenId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const openThread = threads.find((thread) => thread.id === openId) ?? null;

  function createThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedAuthor = author.trim() || "Гость";
    const role = roleForAuthor(trimmedAuthor);

    if (trimmedTitle.length < 8) {
      setError("Заголовок слишком короткий.");
      return;
    }
    if (trimmedBody.length < 20) {
      setError("Добавь больше контекста — так модерации и игрокам проще ответить.");
      return;
    }

    const next: Thread = {
      id: `t-${Date.now()}`,
      title: trimmedTitle,
      author: trimmedAuthor,
      role,
      status: "new",
      preview: trimmedBody,
      createdAt: "только что",
      replies: [],
    };

    setThreads((current) => [next, ...current]);
    setOpenId(next.id);
    setTitle("");
    setBody("");
    setAuthor("");
    setError(null);
    setStatus("Тема опубликована в ленте обсуждений.");
  }

  function addReply(threadId: string) {
    const draft = (replyDrafts[threadId] ?? "").trim();
    if (draft.length < 4) return;

    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              replies: [
                ...thread.replies,
                {
                  id: `r-${Date.now()}`,
                  author: "Гость",
                  body: draft,
                  createdAt: "только что",
                },
              ],
            }
          : thread,
      ),
    );
    setReplyDrafts((current) => ({ ...current, [threadId]: "" }));
  }

  return (
    <section id="threads" className="panel scroll-mt-24 p-4 sm:p-6">
      <h2 className="font-heading text-2xl font-extrabold text-ink">Живые темы</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Демо без базы: темы живут только в этой вкладке браузера.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ul className="divide-y divide-border border-y border-border">
          {threads.map((thread) => {
            const isOpen = thread.id === openId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(thread.id)}
                  className={`w-full py-4 text-left transition ${
                    isOpen ? "bg-grass/8" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.status ? (
                      <StatusBadge
                        label={statusLabel[thread.status]}
                        tone={thread.status}
                      />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {thread.createdAt}
                    </span>
                  </div>
                  <p className="mt-2 font-heading text-lg font-bold text-ink">
                    {thread.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {thread.preview}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span>{thread.author}</span>
                    {thread.role ? <RoleBadge role={thread.role} /> : null}
                    <span className="text-muted-foreground">
                      · {thread.replies.length} отв.
                    </span>
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5">
            {openThread ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {openThread.status ? (
                    <StatusBadge
                      label={statusLabel[openThread.status]}
                      tone={openThread.status}
                    />
                  ) : null}
                </div>
                <h3 className="mt-2 font-heading text-xl font-bold text-ink sm:text-2xl">
                  {openThread.title}
                </h3>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{openThread.author}</span>
                  {openThread.role ? <RoleBadge role={openThread.role} /> : null}
                  <span>· {openThread.createdAt}</span>
                </p>
                <p className="mt-4 text-sm leading-relaxed sm:text-base">
                  {openThread.preview}
                </p>

                <Separator className="my-5" />

                <h4 className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Ответы
                </h4>
                {openThread.replies.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Пока тихо — напиши первый ответ.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {openThread.replies.map((reply) => (
                      <li
                        key={reply.id}
                        className="rounded-xl border border-border/70 bg-white px-3 py-3"
                      >
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          <span>{reply.author}</span>
                          {reply.role ? <RoleBadge role={reply.role} /> : null}
                          <span className="font-normal text-muted-foreground">
                            {reply.createdAt}
                          </span>
                        </p>
                        <p className="mt-1 text-sm leading-relaxed">{reply.body}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 space-y-3">
                  <Textarea
                    value={replyDrafts[openThread.id] ?? ""}
                    onChange={(event) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [openThread.id]: event.target.value,
                      }))
                    }
                    placeholder="Ответ игрока…"
                    rows={3}
                    className="bg-white"
                  />
                  <Button
                    type="button"
                    onClick={() => addReply(openThread.id)}
                    className="rounded-xl bg-grass hover:bg-[#2f6d2f]"
                  >
                    Ответить
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Выбери тему слева.</p>
            )}
          </div>

          <form id="new-topic" onSubmit={createThread} className="space-y-3">
            <h3 className="font-heading text-xl font-bold text-ink">Новая тема</h3>
            <Input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Ник (CloudOwner даст роль главного админа)"
              className="bg-white"
            />
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Заголовок темы"
              className="bg-white"
              required
            />
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Суть: что случилось, доказательство, чего хочешь"
              rows={4}
              className="bg-white"
              required
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {status ? (
              <p className="text-sm text-grass" role="status">
                {status}
              </p>
            ) : null}
            <Button type="submit" className="rounded-xl bg-grass hover:bg-[#2f6d2f]">
              Опубликовать
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
