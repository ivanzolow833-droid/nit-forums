import { ForumApp } from "@/components/forum-app";
import { permanentRedirect } from "next/navigation";

type HomeProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

function pageSuffix(value: string | string[] | undefined) {
  const parsed = Number(first(value));
  return Number.isSafeInteger(parsed) && parsed > 1 ? `?page=${parsed}` : "";
}

export default async function Home({ searchParams }: HomeProps) {
  const query = await searchParams;
  const boardId = first(query.board);
  if (boardId) permanentRedirect(`/forums/${encodeURIComponent(boardId)}${pageSuffix(query.page)}`);
  const threadId = first(query.thread);
  if (threadId) permanentRedirect(`/threads/${encodeURIComponent(threadId)}${pageSuffix(query.page)}`);
  return (
    <div className="flex min-h-full flex-col">
      <ForumApp />
    </div>
  );
}
