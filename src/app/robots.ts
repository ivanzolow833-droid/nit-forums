import type { MetadataRoute } from "next";
import { getForumSiteUrl } from "@/lib/forum-seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getForumSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/*?view=admin*",
        "/*?view=staff*",
        "/*?view=messages*",
        "/*?view=account*",
        "/*?view=auth*",
        "/*?view=search*",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
