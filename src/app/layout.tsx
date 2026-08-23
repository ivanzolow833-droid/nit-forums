import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "CloudWorld — Minecraft-форум сервера",
  description:
    "Форум CloudWorld: новости, жалобы, ивенты, донат и привязка аккаунта. IP cloudworldmc.ru",
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
