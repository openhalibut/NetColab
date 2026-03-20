import { User, ChatMessage, VersionEntry } from "@/types/chat";

export const MOCK_USERS: User[] = [
  { id: "u1", name: "You", avatar: "A", color: "cyan", isOnline: true },
  { id: "u2", name: "Sarah Chen", avatar: "S", color: "pink", isOnline: true },
  { id: "u3", name: "Marcus Lee", avatar: "M", color: "amber", isOnline: true },
  { id: "u4", name: "Priya Patel", avatar: "P", color: "violet", isOnline: false },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    userId: "u2",
    content: "Let's brainstorm a product launch strategy for our new AI writing tool. What angles should we consider?",
    timestamp: new Date(Date.now() - 3600000),
    type: "user",
    model: "gemini-2.5-flash",
  },
  {
    id: "m2",
    userId: "ai",
    content: "Here are key angles for your AI writing tool launch:\n\n1. **Problem-Solution Framing** — Lead with the pain points writers face (blank page syndrome, editing fatigue)\n2. **Social Proof** — Early beta testimonials and case studies\n3. **Differentiation** — What makes yours unique vs Jasper, Copy.ai?\n4. **Content Marketing** — Use the tool itself to create launch content (meta!)\n5. **Community Building** — Writer-focused Discord/community\n\nWant me to dive deeper into any of these?",
    timestamp: new Date(Date.now() - 3500000),
    type: "ai",
    model: "gemini-2.5-flash",
  },
  {
    id: "m3",
    userId: "u3",
    content: "I like angle #4 — using the tool to market itself. Can we expand on that with a content calendar?",
    timestamp: new Date(Date.now() - 3000000),
    type: "user",
    model: "gpt-5",
  },
  {
    id: "m4",
    userId: "ai",
    content: "Great pick, Marcus! Here's a 4-week content calendar using your AI tool:\n\n**Week 1: Tease**\n- Blog: \"We wrote this post with AI in 10 minutes\"\n- Twitter thread: Behind-the-scenes of the tool\n\n**Week 2: Educate**\n- Video: Side-by-side human vs AI writing\n- Newsletter: \"The future of collaborative writing\"\n\n**Week 3: Engage**\n- Challenge: \"Write a blog post in under 5 min\"\n- User-generated content showcase\n\n**Week 4: Launch**\n- Product Hunt launch\n- Live demo stream\n- Launch discount for early signups\n\nShould I refine any week's strategy?",
    timestamp: new Date(Date.now() - 2800000),
    type: "ai",
    model: "gpt-5",
  },
  {
    id: "m5",
    userId: "u1",
    content: "Love this! @Sarah — what's our budget for Week 3 influencer outreach? Also, can we add a competitive analysis section?",
    timestamp: new Date(Date.now() - 1800000),
    type: "user",
    model: "gemini-2.5-pro",
  },
];

export const MOCK_VERSIONS: VersionEntry[] = [
  { id: "v1", userId: "u2", action: "Started brainstorm thread", timestamp: new Date(Date.now() - 3600000), messageId: "m1" },
  { id: "v2", userId: "u3", action: "Requested content calendar expansion", timestamp: new Date(Date.now() - 3000000), messageId: "m3" },
  { id: "v3", userId: "u1", action: "Added budget & competitive analysis request", timestamp: new Date(Date.now() - 1800000), messageId: "m5" },
];
