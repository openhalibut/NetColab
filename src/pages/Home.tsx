import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_ROOMS, ChatRoom } from "@/data/chatRooms";
import { MOCK_USERS } from "@/data/mockData";
import { USER_COLORS } from "@/types/chat";
import { Plus, MessageSquare, Share2, Clock, Users, Search } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const currentUser = MOCK_USERS[0];

  const filtered = MOCK_ROOMS.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleShare = (e: React.MouseEvent, room: ChatRoom) => {
    e.stopPropagation();
    const url = `${window.location.origin}/chat/${room.id}`;
    navigator.clipboard.writeText(url);
    // Could use toast here
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Collab AI</h1>
              <p className="text-xs text-muted-foreground">Multiplayer AI workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-background ${USER_COLORS[currentUser.color]}`}
            >
              {currentUser.avatar}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {/* Top bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Your Workspaces</h2>
            <p className="text-sm text-muted-foreground">
              {MOCK_ROOMS.length} shared conversations
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/chat/room-1")}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workspaces..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Room grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/chat/${room.id}`)}
              className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="text-2xl">{room.emoji}</span>
                <button
                  onClick={(e) => handleShare(e, room)}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  title="Copy invite link"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <h3 className="mb-1 text-sm font-semibold text-foreground">{room.title}</h3>

              <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(room.lastActivity, { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {room.messageCount}
                </span>
              </div>

              {/* Participant avatars */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {room.participants.slice(0, 4).map((user) => (
                    <div
                      key={user.id}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-bold text-background ${USER_COLORS[user.color]}`}
                    >
                      {user.avatar}
                    </div>
                  ))}
                  {room.participants.length > 4 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-medium text-muted-foreground">
                      +{room.participants.length - 4}
                    </div>
                  )}
                </div>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {room.participants.length}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Create new card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: filtered.length * 0.05 }}
            onClick={() => navigate("/chat/room-1")}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            <Plus className="mb-2 h-8 w-8" />
            <span className="text-sm font-medium">Start new workspace</span>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
