import { VersionEntry, User, USER_COLORS, USER_TEXT_COLORS } from "@/types/chat";
import { motion } from "framer-motion";
import { History } from "lucide-react";

interface VersionHistoryProps {
  entries: VersionEntry[];
  users: User[];
}

export function VersionHistory({ entries, users }: VersionHistoryProps) {
  const getUser = (id: string) => users.find((u) => u.id === id);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Version History
        </h3>
      </div>
      <div className="relative flex flex-col gap-0">
        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
        {entries.map((entry, i) => {
          const user = getUser(entry.userId);
          if (!user) return null;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-3 py-2.5"
            >
              <div
                className={`relative z-10 flex h-[10px] w-[10px] mt-1.5 shrink-0 rounded-full ${USER_COLORS[user.color]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-secondary-foreground">
                  <span className={`font-semibold ${USER_TEXT_COLORS[user.color]}`}>{user.name}</span>{" "}
                  {entry.action}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
