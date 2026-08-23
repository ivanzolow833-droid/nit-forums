"use client";

import Image from "next/image";
import { ArrowRight, Copy, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/forum-data";

export function HeroBanner({
  members,
  threads,
  onBoards,
}: {
  members: number;
  threads: number;
  onBoards: () => void;
}) {
  async function copyIp() {
    await navigator.clipboard.writeText(site.ip);
  }

  return (
    <section className="hero-shell">
      <Image
        src="/images/hero.jpg"
        alt="Игровой мир CloudWorld"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="hero-overlay" />
      <div className="hero-grid" />
      <div className="relative z-10 mx-auto flex min-h-[340px] w-full max-w-[1380px] flex-col justify-center px-4 py-14 sm:px-6 lg:min-h-[410px]">
        <div className="hero-kicker"><span /> Официальный форум проекта</div>
        <h1 className="mt-4 max-w-4xl font-heading text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
          Твой мир.<br /><span>Твоя история.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
          Новости CloudWorld, игровые разделы, обращения к администрации, заявки в состав и живое сообщество — всё в одном месте.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button type="button" size="lg" className="h-11 rounded-md bg-red-600 px-5 font-bold uppercase hover:bg-red-500" onClick={onBoards}>
            Открыть разделы <ArrowRight />
          </Button>
          <Button type="button" size="lg" variant="outline" className="h-11 rounded-md border-white/20 bg-black/30 px-5 font-bold text-white hover:bg-white/10 hover:text-white" onClick={copyIp}>
            <Copy /> {site.ip}
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-5 text-xs font-semibold uppercase tracking-wider text-white/60">
          <span className="inline-flex items-center gap-2"><UsersRound className="size-4 text-red-400" /> {members} участников</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-red-400" /> {threads} активных тем</span>
        </div>
      </div>
    </section>
  );
}
