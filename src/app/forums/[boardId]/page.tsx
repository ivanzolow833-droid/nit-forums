import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForumApp } from "@/components/forum-app";
import { ForumJsonLd } from "@/components/forum-json-ld";
import { forumPlainText, getForumSiteUrl, loadPublicBoardSeo } from "@/lib/forum-seo";

export const dynamic = "force-dynamic";

type BoardPageProps = {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function positivePage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ params, searchParams }: BoardPageProps): Promise<Metadata> {
  const [{ boardId }, query] = await Promise.all([params, searchParams]);
  const board = await loadPublicBoardSeo(boardId);
  if (!board) return { title: "Раздел не найден — CloudWorld", robots: { index: false, follow: false } };
  const description = forumPlainText(board.description, 180) || `Темы и обсуждения раздела «${board.title}» на официальном форуме CloudWorld.`;
  const page = positivePage(query.page);
  const canonical = `/forums/${encodeURIComponent(board.id)}${page > 1 ? `?page=${page}` : ""}`;
  return {
    title: `${board.title} — форум CloudWorld`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "ru_RU", siteName: "CloudWorld Forum", title: board.title, description, url: canonical, images: [] },
    twitter: { card: "summary", title: board.title, description, images: [] },
  };
}

export default async function BoardPage({ params, searchParams }: BoardPageProps) {
  const [{ boardId }, query] = await Promise.all([params, searchParams]);
  const board = await loadPublicBoardSeo(boardId);
  if (!board) notFound();
  const page = positivePage(query.page);
  const description = forumPlainText(board.description, 220) || `Темы и обсуждения раздела «${board.title}» на официальном форуме CloudWorld.`;
  const url = `${getForumSiteUrl()}/forums/${encodeURIComponent(board.id)}`;

  return <div className="flex min-h-full flex-col">
    <ForumJsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: board.title, description, url, isPartOf: { "@type": "WebSite", name: "CloudWorld Forum", url: getForumSiteUrl() } }} />
    <ForumApp
      initialView={{ name: "board", boardId: board.id, page }}
      initialSeo={{ title: board.title, description, meta: "Публичный раздел официального форума CloudWorld" }}
    />
  </div>;
}
