export type UserColor = "cyan" | "pink" | "amber" | "violet" | "green";

export type AIModel = "gemini-2.5-flash" | "gemini-2.5-pro" | "gpt-5" | "gpt-5-mini" | "claude-4";

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: UserColor;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: "user" | "ai" | "queued";
  model?: AIModel;
}

export interface VersionEntry {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  messageId: string;
}

export const MODEL_INFO: Record<AIModel, { label: string; icon: string; color: string }> = {
  "gemini-2.5-flash": { label: "Gemini Flash", icon: "⚡", color: "text-user-cyan" },
  "gemini-2.5-pro": { label: "Gemini Pro", icon: "✦", color: "text-user-cyan" },
  "gpt-5": { label: "GPT-5", icon: "◆", color: "text-user-green" },
  "gpt-5-mini": { label: "GPT-5 Mini", icon: "◇", color: "text-user-green" },
  "claude-4": { label: "Claude 4", icon: "◈", color: "text-user-amber" },
};

export const USER_COLORS: Record<UserColor, string> = {
  cyan: "bg-user-cyan",
  pink: "bg-user-pink",
  amber: "bg-user-amber",
  violet: "bg-user-violet",
  green: "bg-user-green",
};

export const USER_BORDER_COLORS: Record<UserColor, string> = {
  cyan: "border-user-cyan",
  pink: "border-user-pink",
  amber: "border-user-amber",
  violet: "border-user-violet",
  green: "border-user-green",
};

export const USER_TEXT_COLORS: Record<UserColor, string> = {
  cyan: "text-user-cyan",
  pink: "text-user-pink",
  amber: "text-user-amber",
  violet: "text-user-violet",
  green: "text-user-green",
};
