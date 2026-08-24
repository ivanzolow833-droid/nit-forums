import type { MetadataRoute } from "next";
import { getForumSiteUrl, loadPublicSitemapEntries } from "@/lib/forum-seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getForumSiteUrl();
  const root: MetadataRoute.Sitemap = [{ url: siteUrl, changeFrequency: "daily", priority: 1 }];
  try {
    const { boards, threads } = await loadPublicSitemapEntries();
    return [
      ...root,
      ...boards.map((board) => ({
        url: `${siteUrl}/forums/${encodeURIComponent(board.id)}`,
        lastModified: board.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...threads.map((thread) => ({
        url: `${siteUrl}/threads/${encodeURIComponent(thread.id)}`,
        lastModified: thread.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return root;
  }
}
