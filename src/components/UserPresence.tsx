import { User, USER_COLORS, USER_TEXT_COLORS } from "@/types/chat";
import { motion } from "framer-motion";

interface UserPresenceProps {
  users: User[];
}

export function UserPresence({ users }: UserPresenceProps) {
  const online = users.filter((u) => u.isOnline);
  const offline = users.filter((u) => !u.isOnline);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Online — {online.length}
      </h3>
      <div className="flex flex-col gap-2">
        {online.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2.5"
          >
            <div className="relative">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-background ${USER_COLORS[user.color]}`}
              >
                {user.avatar}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
            </div>
            <span className={`text-sm font-medium ${USER_TEXT_COLORS[user.color]}`}>
              {user.name}
            </span>
          </motion.div>
        ))}
      </div>
      {offline.length > 0 && (
        <>
          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Offline — {offline.length}
          </h3>
          <div className="flex flex-col gap-2">
            {offline.map((user) => (
              <div key={user.id} className="flex items-center gap-2.5 opacity-40">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-background ${USER_COLORS[user.color]}`}
                >
                  {user.avatar}
                </div>
                <span className="text-sm text-muted-foreground">{user.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
