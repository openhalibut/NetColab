import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Clock3, Layers3, Plus, Search, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ROOM_CARDS = [
  {
    id: "room-1",
    title: "Spring Campaign Poster",
    summary: "Sarah and Marcus are drafting a shared prompt for a campus event poster.",
    updatedAt: "Edited 2 min ago",
    members: "3 people",
  },
  {
    id: "room-2",
    title: "Product Launch Messaging",
    summary: "The team is collecting copy angles before sending one combined request to AI.",
    updatedAt: "Edited 19 min ago",
    members: "5 people",
  },
  {
    id: "room-3",
    title: "Research Notes Synthesis",
    summary: "A shared room for turning scattered notes into one structured summary prompt.",
    updatedAt: "Edited 1 hr ago",
    members: "4 people",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = ROOM_CARDS.filter((room) =>
    room.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[20px] border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">NetColab</h1>
              <p className="text-sm text-muted-foreground">Shared AI rooms</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rooms"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => navigate("/chat/room-1")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New room
            </button>
            <button
              className="inline-flex items-center gap-3 rounded-xl border border-border bg-background px-2.5 py-1.5 text-left transition hover:border-primary/30"
              aria-label="Account profile"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                ZJ
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[140px] truncate text-sm font-medium text-foreground">Jiayi Zhang</p>
                <p className="max-w-[140px] truncate text-xs text-muted-foreground">jiayi@netcolab.ai</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-[20px] border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">Recent rooms</h2>
              <p className="mt-1 text-sm text-muted-foreground">Open a room and keep prompting together in the same thread.</p>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((room, index) => (
                <motion.button
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/chat/${room.id}`)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-muted/45"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-medium text-foreground">{room.title}</h3>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        Active
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{room.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {room.updatedAt}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {room.members}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Shared workflow
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-muted/55 p-4">
                  <p className="text-sm font-medium text-foreground">Live presence</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    See who is in the room and where they are working.
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/55 p-4">
                  <p className="text-sm font-medium text-foreground">Pending queue</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Collect multiple prompts before sending one combined request.
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/55 p-4">
                  <p className="text-sm font-medium text-foreground">Shared history</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Track who added prompts, flushed the queue, and reviewed the result.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-border bg-card p-5">
              <p className="text-sm font-medium text-foreground">Today</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                8 rooms active, 23 prompts added, 6 batches sent to AI.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
