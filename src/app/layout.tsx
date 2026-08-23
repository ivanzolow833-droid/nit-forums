import type { Metadata, Viewport } from "next";
import { Manrope, Rubik } from "next/font/google";
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

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(productionHost ? `https://${productionHost}` : "http://127.0.0.1:3847"),
  title: "CloudWorld — официальный форум проекта",
  description:
    "Официальный форум CloudWorld: новости, игровые разделы, жалобы, заявки, роли и сообщество проекта.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "CloudWorld Forum",
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
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
