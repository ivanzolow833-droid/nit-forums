import type { Metadata, Viewport } from "next";
import { Manrope, Rubik } from "next/font/google";
import { ForumJsonLd } from "@/components/forum-json-ld";
import { getForumSiteUrl } from "@/lib/forum-seo";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const rubik = Rubik({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800", "900"],
});

const siteUrl = getForumSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "CloudWorld Forum",
  title: "CloudWorld — официальный форум проекта",
  description:
    "Официальный форум CloudWorld: новости, игровые разделы, жалобы, заявки, роли и сообщество проекта.",
  alternates: { canonical: "/" },
  keywords: ["CloudWorld", "форум CloudWorld", "Minecraft", "Minecraft сервер", "игровой форум"],
  category: "games",
  creator: "CloudWorld",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "CloudWorld Forum",
    url: "/",
    title: "CloudWorld — официальный форум проекта",
    description: "Новости, игровые разделы, обращения, заявки и сообщество CloudWorld.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "CloudWorld — официальный форум проекта" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudWorld — официальный форум проекта",
    description: "Новости, игровые разделы, обращения, заявки и сообщество CloudWorld.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090b0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebSite", name: "CloudWorld Forum", alternateName: "Форум CloudWorld", url: siteUrl, inLanguage: "ru-RU" },
    { "@context": "https://schema.org", "@type": "Organization", name: "CloudWorld", url: siteUrl, logo: `${siteUrl}/og.png` },
  ];
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans"><ForumJsonLd data={jsonLd} />{children}</body>
    </html>
  );
}
