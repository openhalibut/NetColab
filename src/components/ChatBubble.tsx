import { ChatMessage, User, MODEL_INFO, USER_COLORS, USER_BORDER_COLORS, USER_TEXT_COLORS } from "@/types/chat";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot } from "lucide-react";

interface ChatBubbleProps {
  message: ChatMessage;
  user?: User;
  isCurrentUser?: boolean;
}

export function ChatBubble({ message, user, isCurrentUser }: ChatBubbleProps) {
  const isAI = message.type === "ai";
  const modelInfo = message.model ? MODEL_INFO[message.model] : null;
  const isQueued = message.type === "queued";

  if (isAI) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 py-3"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">AI</span>
            {modelInfo && (
              <span className={`text-xs font-mono ${modelInfo.color}`}>
                {modelInfo.icon} {modelInfo.label}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="rounded-xl rounded-tl-sm bg-secondary p-3 text-sm leading-relaxed text-secondary-foreground">
            <ReactMarkdown
              components={{
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                li: ({ children }) => <li className="ml-4 list-disc text-secondary-foreground">{children}</li>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!user) return null;

  // Right-aligned for current user
  if (isCurrentUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-row-reverse gap-3 py-3"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background ${USER_COLORS[user.color]}`}
        >
          {user.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-row-reverse items-center gap-2">
            <span className={`text-xs font-semibold ${USER_TEXT_COLORS[user.color]}`}>You</span>
            {modelInfo && (
              <span className={`text-xs font-mono ${modelInfo.color}`}>
                {modelInfo.icon} {modelInfo.label}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isQueued && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                Queued
              </span>
            )}
          </div>
          <div
            className={`rounded-xl rounded-tr-sm border-r-2 p-3 text-sm leading-relaxed text-foreground ${
              isQueued ? "border-dashed bg-secondary/60" : "bg-secondary"
            } ${USER_BORDER_COLORS[user.color]}`}
          >
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // Left-aligned for other users
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-3"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background ${USER_COLORS[user.color]}`}
      >
        {user.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`text-xs font-semibold ${USER_TEXT_COLORS[user.color]}`}>{user.name}</span>
          {modelInfo && (
            <span className={`text-xs font-mono ${modelInfo.color}`}>
              {modelInfo.icon} {modelInfo.label}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isQueued && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
              Queued
            </span>
          )}
        </div>
        <div
          className={`rounded-xl rounded-tl-sm border-l-2 p-3 text-sm leading-relaxed text-foreground ${
            isQueued ? "border-dashed bg-secondary/60" : "bg-secondary"
          } ${USER_BORDER_COLORS[user.color]}`}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
