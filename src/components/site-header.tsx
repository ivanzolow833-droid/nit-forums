"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/forum-data";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [copied, setCopied] = useState(false);

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(site.ip);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="mc-block flex size-10 items-center justify-center rounded-lg bg-grass text-lg font-black text-white">
            CW
          </span>
          <span>
            <span className="block font-heading text-xl leading-none font-extrabold tracking-tight text-ink">
              {site.name}
            </span>
            <span className="text-xs text-muted-foreground">{site.tagline}</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="#boards" className="rounded-lg px-3 py-2 hover:bg-secondary">
            Разделы
          </Link>
          <Link href="#threads" className="rounded-lg px-3 py-2 hover:bg-secondary">
            Темы
          </Link>
          <Link href="#roles" className="rounded-lg px-3 py-2 hover:bg-secondary">
            Администрация
          </Link>
          <Link href="#links" className="rounded-lg px-3 py-2 hover:bg-secondary">
            Ссылки
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={copyIp}
            className="rounded-xl border-grass/30 bg-white font-mono text-sm"
          >
            IP: {site.ip}
            <span className="ml-2 text-grass">{copied ? "✓" : "копировать"}</span>
          </Button>
          <a
            href="https://cloudeworld.trademc.org/"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ size: "default" }),
              "rounded-xl bg-grass hover:bg-[#2f6d2f]",
            )}
          >
            Донат
          </a>
        </div>
      </div>
    </header>
  );
}
