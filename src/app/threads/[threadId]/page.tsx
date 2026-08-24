import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForumApp } from "@/components/forum-app";
import { ForumJsonLd } from "@/components/forum-json-ld";
import { forumPlainText, getForumSiteUrl, loadPublicThreadSeo } from "@/lib/forum-seo";

export const dynamic = "force-dynamic";

type ThreadPageProps = {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function positivePage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ params, searchParams }: ThreadPageProps): Promise<Metadata> {
  const [{ threadId }, query] = await Promise.all([params, searchParams]);
  const thread = await loadPublicThreadSeo(threadId);
  if (!thread) return { title: "Тема не найдена — CloudWorld", robots: { index: false, follow: false } };
  const description = forumPlainText(thread.body, 180) || `Обсуждение «${thread.title}» на официальном форуме CloudWorld.`;
  const page = positivePage(query.page);
  const canonical = `/threads/${encodeURIComponent(thread.id)}${page > 1 ? `?page=${page}` : ""}`;
  return {
    title: `${thread.title} — форум CloudWorld`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "ru_RU",
      siteName: "CloudWorld Forum",
      title: thread.title,
      description,
      url: canonical,
      publishedTime: thread.createdAt,
      modifiedTime: thread.updatedAt,
      authors: [thread.author],
      images: [],
    },
    twitter: { card: "summary", title: thread.title, description, images: [] },
  };
}

export default async function ThreadPage({ params, searchParams }: ThreadPageProps) {
  const [{ threadId }, query] = await Promise.all([params, searchParams]);
  const thread = await loadPublicThreadSeo(threadId);
  if (!thread) notFound();
  const page = positivePage(query.page);
  const description = forumPlainText(thread.body, 180) || `Обсуждение «${thread.title}» на официальном форуме CloudWorld.`;
  const url = `${getForumSiteUrl()}/threads/${encodeURIComponent(thread.id)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    text: forumPlainText(thread.body, null),
    url,
    datePublished: thread.createdAt,
    dateModified: thread.updatedAt,
    author: { "@type": "Person", name: thread.author },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/ReplyAction", userInteractionCount: thread.replyCount },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/ViewAction", userInteractionCount: thread.viewCount },
    ],
    isPartOf: { "@type": "CollectionPage", name: thread.boardTitle, url: `${getForumSiteUrl()}/forums/${encodeURIComponent(thread.boardId)}` },
  };

  return <div className="flex min-h-full flex-col">
    <ForumJsonLd data={jsonLd} />
    <ForumApp
      initialView={{ name: "thread", threadId: thread.id, page }}
      initialSeo={{
        title: thread.title,
        description,
        body: forumPlainText(thread.body, 1600),
        meta: `Автор: ${thread.author} · Ответов: ${thread.replyCount.toLocaleString("ru-RU")} · Просмотров: ${thread.viewCount.toLocaleString("ru-RU")}`,
      }}
    />
  </div>;
}
