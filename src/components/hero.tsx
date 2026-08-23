import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/forum-data";
import { cn } from "@/lib/utils";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <div className="relative min-h-[280px] sm:min-h-[340px]">
        <Image
          src="/images/hero.jpg"
          alt="Атмосфера игрового мира CloudWorld"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0b1d12]/88% via-[#123221]/55% to-[#1b3a55]/35%"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex min-h-[280px] w-full max-w-7xl flex-col justify-end px-4 py-10 sm:min-h-[340px] sm:px-6 sm:py-12">
          <p className="animate-rise font-heading text-4xl font-black tracking-tight text-white sm:text-5xl">
            {site.name}
          </p>
          <h1 className="animate-rise delay-1 mt-3 max-w-2xl font-heading text-2xl leading-tight text-white sm:text-3xl">
            Форум Minecraft-сервера в духе большого RP-проекта
          </h1>
          <p className="animate-rise delay-2 mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            Новости, жалобы, ивенты и общение. IP{" "}
            <span className="font-mono font-semibold text-white">{site.ip}</span>
            . Привязка аккаунта — через {site.bot}.
          </p>
          <div className="animate-rise delay-2 mt-6 flex flex-wrap gap-3">
            <Link
              href="#boards"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-xl bg-grass px-5 hover:bg-[#2f6d2f]",
              )}
            >
              К разделам
            </Link>
            <a
              href={site.botUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "rounded-xl border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
              )}
            >
              Привязать аккаунт
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
