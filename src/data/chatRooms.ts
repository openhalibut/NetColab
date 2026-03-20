import { MOCK_USERS, MOCK_MESSAGES, MOCK_VERSIONS } from "./mockData";
import { ChatMessage, VersionEntry, User } from "@/types/chat";

export interface ChatRoom {
  id: string;
  title: string;
  emoji: string;
  lastActivity: Date;
  createdBy: string;
  participants: User[];
  messageCount: number;
  messages: ChatMessage[];
  versions: VersionEntry[];
}

export const MOCK_ROOMS: ChatRoom[] = [
  {
    id: "room-1",
    title: "Product Launch Brainstorm",
    emoji: "🚀",
    lastActivity: new Date(Date.now() - 1800000),
    createdBy: "u2",
    participants: MOCK_USERS,
    messageCount: MOCK_MESSAGES.length,
    messages: MOCK_MESSAGES,
    versions: MOCK_VERSIONS,
  },
  {
    id: "room-2",
    title: "Q3 Marketing Strategy",
    emoji: "📊",
    lastActivity: new Date(Date.now() - 86400000),
    createdBy: "u1",
    participants: [MOCK_USERS[0], MOCK_USERS[1]],
    messageCount: 12,
    messages: [],
    versions: [],
  },
  {
    id: "room-3",
    title: "Brand Voice Guidelines",
    emoji: "✍️",
    lastActivity: new Date(Date.now() - 172800000),
    createdBy: "u3",
    participants: [MOCK_USERS[0], MOCK_USERS[2], MOCK_USERS[3]],
    messageCount: 8,
    messages: [],
    versions: [],
  },
  {
    id: "room-4",
    title: "Competitor Analysis Deep Dive",
    emoji: "🔍",
    lastActivity: new Date(Date.now() - 604800000),
    createdBy: "u1",
    participants: MOCK_USERS.slice(0, 3),
    messageCount: 23,
    messages: [],
    versions: [],
  },
];
