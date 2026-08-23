import { ForumBoards } from "@/components/forum-boards";
import { ForumSidebar } from "@/components/forum-sidebar";
import { HeroBanner } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";
import { StaffRoles } from "@/components/staff-roles";
import { ThreadBoard } from "@/components/thread-board";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HeroBanner />
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:py-10">
          <div className="space-y-8">
            <ForumBoards />
            <ThreadBoard />
            <StaffRoles />
          </div>
          <ForumSidebar />
        </div>
      </main>
      <footer className="border-t border-border/80 bg-white/70 px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
        CloudWorld — Minecraft-форум. IP: cloudworldmc.ru · демо без регистрации и
        базы данных.
      </footer>
    </>
  );
}
