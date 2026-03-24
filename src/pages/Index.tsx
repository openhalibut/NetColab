import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Bot,
  Clock3,
  Copy,
  History,
  Link2,
  Mail,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Share2,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type SidebarTab = "history" | "people";
type MessageKind = "user" | "ai";
type AssistantModel = "@Gemini" | "@Claude" | "@GPT-5";
type ComposerTarget = "chat" | AssistantModel;
type RoomId = "room-1" | "room-2" | "room-3";

interface Participant {
  id: string;
  name: string;
  shortName: string;
  role: string;
  color: string;
  ring: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  time: string;
  kind: MessageKind;
  content: string;
  model?: string;
  asset?: "poster";
}

interface HistoryEntry {
  id: string;
  userId: string;
  time: string;
  action: string;
}

interface RoomScenario {
  title: string;
  summary: string;
  participants: Participant[];
  defaultModel: AssistantModel;
  script: {
    promptA: string;
    responseA: string;
    promptB: string;
    responseB: string;
    showPosterAsset?: boolean;
  };
  initialHistory: HistoryEntry[];
}

const ASSISTANT_MODELS: AssistantModel[] = ["@Gemini", "@Claude", "@GPT-5"];

const ROOM_SCENARIOS: Record<RoomId, RoomScenario> = {
  "room-1": {
    title: "Spring Campaign Poster",
    summary:
      "Everyone in this room continues the same AI conversation.",
    defaultModel: "@Gemini",
    participants: [
      { id: "u1", name: "You", shortName: "Y", role: "Campaign lead", color: "bg-user-cyan", ring: "ring-user-cyan/20" },
      { id: "u2", name: "Sarah", shortName: "S", role: "Brand strategist", color: "bg-user-pink", ring: "ring-user-pink/20" },
      { id: "u3", name: "Marcus", shortName: "M", role: "Designer", color: "bg-user-amber", ring: "ring-user-amber/20" },
    ],
    initialHistory: [
      { id: "h1", userId: "u1", time: "2:05 PM", action: "Opened the shared room" },
      { id: "h2", userId: "u2", time: "2:05 PM", action: "Joined the conversation" },
    ],
    script: {
      promptA:
        "@Gemini create a poster for Campus Sustainability Week. Use a bold headline, optimistic tone, student-friendly visuals, and a clear CTA for April 18 at the Main Quad.",
      responseA:
        "Here is a first poster direction:\n\n**Headline**\nBuild Tomorrow Together\n\n**Visual direction**\nA warm editorial poster showing students planting trees, carrying tools, and gathering on campus. Use layered paper textures, bold typography, and a hopeful spring color story.\n\n**Layout**\n- Large headline at the top\n- Main illustration in the center\n- Event details anchored at the bottom\n- CTA button style treatment for the date and location\n\n**CTA**\nJoin the Build Day · April 18 · Main Quad",
      promptB:
        "@Gemini refine this with a cleaner Swiss-style layout, more whitespace, brighter green accents, and make the volunteers feel more modern and editorial.",
      responseB:
        "Refined version:\n\n**Updated style**\nShift toward a cleaner grid with generous whitespace, tighter alignment, and fewer decorative textures. Keep the energy, but make it feel more premium and contemporary.\n\n**Revised palette**\n- Leaf green\n- Off-white paper\n- Charcoal text\n- Small orange highlight for emphasis\n\n**Poster adjustments**\n- Headline stays bold but sits inside a structured left-aligned grid\n- Volunteers become smaller, sharper editorial figures instead of a large illustrated scene\n- Event details move into a crisp information block\n- CTA becomes: **Join the Build Day** with the date and location underneath",
      showPosterAsset: true,
    },
  },
  "room-2": {
    title: "Product Launch Messaging",
    summary:
      "This thread is focused on launch copy. Team members can iterate on one voice by continuing the same assistant thread.",
    defaultModel: "@Claude",
    participants: [
      { id: "u1", name: "You", shortName: "Y", role: "Product marketing", color: "bg-user-cyan", ring: "ring-user-cyan/20" },
      { id: "u2", name: "Sarah", shortName: "S", role: "Brand lead", color: "bg-user-pink", ring: "ring-user-pink/20" },
      { id: "u3", name: "Leo", shortName: "L", role: "Sales", color: "bg-user-green", ring: "ring-user-green/20" },
    ],
    initialHistory: [
      { id: "h1", userId: "u1", time: "11:18 AM", action: "Opened launch messaging room" },
      { id: "h2", userId: "u3", time: "11:19 AM", action: "Joined to add sales framing" },
    ],
    script: {
      promptA:
        "@Claude draft hero copy for a collaborative AI workspace launch page. Keep it clear, confident, and focused on team productivity.",
      responseA:
        "Here are three launch-ready hero options:\n\n1. **Bring your team into one AI conversation.**\n2. **From scattered prompts to shared outcomes.**\n3. **Work with AI together, not one-by-one.**\n\nEach option can be paired with a short subline emphasizing shared context and faster decision-making.",
      promptB:
        "@Claude refine option 1 for B2B buyers. Make it more specific about cross-functional teams and speed.",
      responseB:
        "Refined B2B version:\n\n**Bring product, design, and marketing into one AI conversation.**\n\nSubline: *NetColab keeps prompts, revisions, and decisions in one shared thread so teams move from ideas to execution faster.*",
    },
  },
  "room-3": {
    title: "Research Notes Synthesis",
    summary:
      "This room combines scattered research into one decision-ready summary while preserving who contributed each angle.",
    defaultModel: "@GPT-5",
    participants: [
      { id: "u1", name: "You", shortName: "Y", role: "Research ops", color: "bg-user-cyan", ring: "ring-user-cyan/20" },
      { id: "u2", name: "Sarah", shortName: "S", role: "UX researcher", color: "bg-user-pink", ring: "ring-user-pink/20" },
      { id: "u3", name: "Ivy", shortName: "I", role: "PM", color: "bg-user-violet", ring: "ring-user-violet/20" },
    ],
    initialHistory: [
      { id: "h1", userId: "u2", time: "9:42 AM", action: "Created synthesis room" },
      { id: "h2", userId: "u3", time: "9:44 AM", action: "Added interview highlights" },
    ],
    script: {
      promptA:
        "@GPT-5 summarize these interview notes into 5 key user pain points for onboarding and prioritize by frequency.",
      responseA:
        "Top onboarding pain points:\n\n1. Unclear first-step guidance\n2. Too many setup decisions up front\n3. Inconsistent terminology across screens\n4. Missing progress visibility\n5. No collaborative handoff cues\n\nPriority is based on repeated mentions across all interview transcripts.",
      promptB:
        "@GPT-5 refine this into a one-page briefing with recommendations and measurable next steps.",
      responseB:
        "One-page briefing generated:\n\n**Objective**\nReduce onboarding drop-off in the first 10 minutes.\n\n**Recommendations**\n- Add guided first-run checklist\n- Delay non-critical settings\n- Standardize wording across onboarding screens\n- Add progress milestone indicators\n\n**Success metrics**\n- First-session completion rate\n- Time-to-first-value\n- Week-1 retention",
    },
  },
};

function getRoomId(rawRoomId?: string): RoomId {
  if (rawRoomId === "room-2" || rawRoomId === "room-3") {
    return rawRoomId;
  }

  return "room-1";
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderPromptMentions(content: string) {
  const parts = content.split(/(@[A-Za-z0-9.-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={`${part}-${index}`} className="font-semibold text-primary">
          {part}
        </span>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function getMentionedModel(content: string): AssistantModel | null {
  const lowered = content.toLowerCase();
  if (lowered.includes("@gemini")) return "@Gemini";
  if (lowered.includes("@claude")) return "@Claude";
  if (lowered.includes("@gpt-5") || lowered.includes("@gpt5")) return "@GPT-5";
  return null;
}

function generateAiReply(roomId: RoomId, selectedModel: AssistantModel, prompt: string) {
  if (roomId === "room-1") {
    return `${selectedModel} response:\n\nGreat update. I can turn this into a tighter poster variation with:\n- stronger visual hierarchy\n- cleaner spacing\n- clearer CTA lockup\n\nPrompt understood: "${prompt.slice(0, 110)}${prompt.length > 110 ? "..." : ""}"`;
  }

  if (roomId === "room-2") {
    return `${selectedModel} response:\n\nHere is a sharper launch copy pass:\n\n**Headline**\nWork with AI as one team.\n\n**Subline**\nKeep prompts, edits, and decisions in one shared thread so teams ship faster.`;
  }

  return `${selectedModel} response:\n\nResearch summary updated. I grouped your input into:\n- top pain points\n- recommended fixes\n- measurable success metrics\n\nI can also export this as a one-page stakeholder brief if needed.`;
}

export default function Index() {
  const navigate = useNavigate();
  const params = useParams();
  const roomId = getRoomId(params.roomId);
  const scenario = useMemo(() => ROOM_SCENARIOS[roomId], [roomId]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("history");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(scenario.initialHistory);
  const [sarahTyping, setSarahTyping] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("sarah@netcolab.ai");
  const [selectedModel, setSelectedModel] = useState<AssistantModel>(scenario.defaultModel);
  const [composerTarget, setComposerTarget] = useState<ComposerTarget>("chat");
  const [composerText, setComposerText] = useState("");

  useEffect(() => {
    setMessages([]);
    setHistory(scenario.initialHistory);
    setSarahTyping(false);
    setSelectedModel(scenario.defaultModel);
    setComposerTarget("chat");
    setComposerText("");
    setInviteEmail("sarah@netcolab.ai");
  }, [scenario]);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        if (roomId !== "room-1") {
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: `${roomId}-chat-a`,
            userId: "u1",
            time: "2:05 PM",
            kind: "user",
            content: "Before we prompt, should we keep this poster direction clean and modern?",
          },
        ]);
        setHistory((current) => [
          ...current,
          {
            id: `${roomId}-h-pre-a`,
            userId: "u1",
            time: "2:05 PM",
            action: "Shared direction with Sarah before prompting AI",
          },
        ]);
      }, 350),
      window.setTimeout(() => {
        if (roomId !== "room-1") {
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: `${roomId}-chat-b`,
            userId: "u2",
            time: "2:06 PM",
            kind: "user",
            content: "Yes. Let's keep it editorial with more whitespace, then ask for a first pass.",
          },
        ]);
      }, 700),
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            id: `${roomId}-m1`,
            userId: "u1",
            time: "2:06 PM",
            kind: "user",
            content: scenario.script.promptA,
          },
        ]);
        setHistory((current) => [
          ...current,
          {
            id: `${roomId}-h3`,
            userId: "u1",
            time: "2:06 PM",
            action: `Prompted ${scenario.defaultModel} in shared thread`,
          },
        ]);
      }, 900),
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            id: `${roomId}-m2`,
            userId: "ai",
            time: "2:07 PM",
            kind: "ai",
            model: scenario.defaultModel.replace("@", "") + " 2.5 Pro",
            content: scenario.script.responseA,
          },
        ]);
      }, 2200),
      window.setTimeout(() => {
        setSarahTyping(true);
      }, 3000),
      window.setTimeout(() => {
        setSarahTyping(false);
        setMessages((current) => [
          ...current,
          {
            id: `${roomId}-m3`,
            userId: "u2",
            time: "2:08 PM",
            kind: "user",
            content: scenario.script.promptB,
          },
        ]);
        setHistory((current) => [
          ...current,
          {
            id: `${roomId}-h4`,
            userId: "u2",
            time: "2:08 PM",
            action: "Added refinement request with new requirements",
          },
        ]);
      }, 4200),
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            id: `${roomId}-m4`,
            userId: "ai",
            time: "2:09 PM",
            kind: "ai",
            model: scenario.defaultModel.replace("@", "") + " 2.5 Pro",
            content: scenario.script.responseB,
            asset: scenario.script.showPosterAsset ? "poster" : undefined,
          },
        ]);
        setHistory((current) => [
          ...current,
          {
            id: `${roomId}-h5`,
            userId: "u2",
            time: "2:09 PM",
            action: "Received refined response in the same shared chat",
          },
        ]);
      }, 5600),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [roomId, scenario]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      return;
    }

    setHistory((current) => [
      ...current,
      {
        id: `h${Date.now()}`,
        userId: "u1",
        time: nowTime(),
        action: `Invited ${inviteEmail.trim()} to the shared room`,
      },
    ]);
    setInviteEmail("");
    setShareOpen(false);
  };

  const handleSendMessage = () => {
    const trimmed = composerText.trim();
    if (!trimmed) {
      return;
    }

    const content = trimmed;
    const mentionedModel = getMentionedModel(content);
    const aiTarget = mentionedModel ?? (composerTarget === "chat" ? null : composerTarget);

    setMessages((current) => [
      ...current,
      {
        id: `m-user-${Date.now()}`,
        userId: "u1",
        time: nowTime(),
        kind: "user",
        content,
      },
    ]);

    setHistory((current) => [
      ...current,
      {
        id: `h${Date.now()}-send`,
        userId: "u1",
        time: nowTime(),
        action: aiTarget
          ? `Sent a prompt to ${aiTarget}`
          : "Sent a teammate chat message",
      },
    ]);

    setComposerText("");

    if (!aiTarget) {
      return;
    }

    setSelectedModel(aiTarget);
    setComposerTarget(aiTarget);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `m-ai-${Date.now()}`,
          userId: "ai",
          time: nowTime(),
          kind: "ai",
          model: aiTarget.replace("@", "") + " 2.5 Pro",
          content: generateAiReply(roomId, aiTarget, content),
        },
      ]);
    }, 900);
  };

  const getParticipant = (userId: string) =>
    scenario.participants.find((participant) => participant.id === userId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-4 rounded-[20px] border border-border bg-card px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[30px]">
                  {scenario.title}
                </h1>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  Shared chat
                </span>
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">{scenario.summary}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex -space-x-2">
              {scenario.participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-card text-xs font-bold text-slate-900 ${participant.color}`}
                  title={participant.name}
                >
                  {participant.shortName}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              onClick={() => setSidebarOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_auto]">
          <section className="flex min-h-[760px] flex-col overflow-hidden rounded-[20px] border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-3 py-1">{selectedModel} in thread</span>
                <span className="rounded-full bg-muted px-3 py-1">{scenario.participants.length} people viewing</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message) => {
                  const participant = getParticipant(message.userId);
                  const hasLargeAsset = message.asset === "poster";

                  if (message.kind === "ai") {
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className={`min-w-0 space-y-2 ${hasLargeAsset ? "flex-1" : "max-w-[80%]"}`}>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold text-foreground">{message.model?.split(" ")[0] || "AI"}</span>
                            {message.model && (
                              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                {message.model}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{message.time}</span>
                          </div>
                          <div className={`rounded-2xl border border-border bg-background px-4 py-4 ${hasLargeAsset ? "" : "inline-block"}`}>
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-3 text-sm leading-7 text-foreground last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                li: ({ children }) => <li className="ml-5 list-disc text-sm leading-7 text-foreground">{children}</li>,
                                ul: ({ children }) => <ul className="space-y-1">{children}</ul>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>

                            {message.asset === "poster" && (
                              <div className="mt-5 overflow-hidden rounded-[24px] border border-border bg-white shadow-sm">
                                <div className="relative min-h-[520px] overflow-hidden bg-[linear-gradient(180deg,#f5f0e6_0%,#efe7d7_100%)] px-8 py-8 text-slate-900">
                                  <div className="absolute left-0 top-0 h-48 w-48 rounded-br-[120px] bg-[#86d76d]" />
                                  <div className="absolute right-[-30px] top-24 h-40 w-40 rounded-full bg-[#ff9f6e] opacity-90" />
                                  <div className="absolute bottom-0 right-0 h-64 w-64 rounded-tl-[160px] bg-[#20352a]" />

                                  <div className="relative z-10 flex h-full flex-col justify-between">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#23553c]">
                                          Campus Sustainability Week
                                        </p>
                                        <h3 className="mt-5 max-w-md text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl">
                                          Build Tomorrow Together
                                        </h3>
                                      </div>
                                      <div className="rounded-full border border-slate-900/10 bg-white/70 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600 backdrop-blur">
                                        Gemini poster concept
                                      </div>
                                    </div>

                                    <div className="relative mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                                      <div className="rounded-[28px] bg-white/70 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] backdrop-blur">
                                        <div className="mb-4 flex items-end gap-3">
                                          <div className="h-24 w-20 rounded-[24px] bg-[#20352a]" />
                                          <div className="h-28 w-24 rounded-[28px] bg-[#86d76d]" />
                                          <div className="h-20 w-16 rounded-[20px] bg-[#ff9f6e]" />
                                          <div className="h-24 w-20 rounded-[24px] bg-[#d2e4c0]" />
                                        </div>
                                        <p className="text-sm leading-7 text-slate-700">
                                          Modern editorial volunteers, cleaner Swiss-style spacing, and brighter green accents for a more polished campus campaign feel.
                                        </p>
                                      </div>

                                      <div className="flex flex-col justify-between rounded-[28px] bg-[#20352a] p-6 text-[#f9f4ea] shadow-[0_20px_50px_rgba(32,53,42,0.2)]">
                                        <div>
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b8f19e]">
                                            Join the Build Day
                                          </p>
                                          <p className="mt-4 text-3xl font-semibold leading-tight">
                                            April 18
                                            <br />
                                            Main Quad
                                          </p>
                                        </div>
                                        <div className="space-y-3 text-sm text-[#e8dcc7]">
                                          <p>Student volunteers</p>
                                          <p>Editorial grid layout</p>
                                          <p>Fresh spring palette</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  if (!participant) {
                    return null;
                  }

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${participant.id === "u1" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-900 ${participant.color}`}
                      >
                        {participant.shortName}
                      </div>
                      <div
                        className={`min-w-0 max-w-[80%] space-y-2 ${
                          participant.id === "u1" ? "text-right" : ""
                        }`}
                      >
                        <div className={`flex flex-wrap items-center gap-2 text-sm ${participant.id === "u1" ? "justify-end" : ""}`}>
                          <span className="font-semibold text-foreground">{participant.name}</span>
                          <span className="text-xs text-muted-foreground">{message.time}</span>
                        </div>
                        <div
                          className={`rounded-2xl border px-4 py-4 text-sm leading-7 text-foreground ${
                            participant.id === "u1"
                              ? "border-primary/30 bg-primary/10"
                              : "border-border bg-muted/25"
                          } inline-block text-left`}
                        >
                          {renderPromptMentions(message.content)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                <AnimatePresence>
                  {sarahTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-user-pink text-xs font-bold text-slate-900">
                        S
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
                        Sarah is typing a refinement for {selectedModel}...
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="border-t border-border bg-card px-5 py-4">
              <div className="mx-auto max-w-3xl rounded-[18px] border border-border bg-background p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <button
                    onClick={() => setComposerTarget("chat")}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      composerTarget === "chat"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Chat
                  </button>
                  {ASSISTANT_MODELS.map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        setComposerTarget(model);
                      }}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        composerTarget === model
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span />
                  <button
                    onClick={handleSendMessage}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </section>

          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ opacity: 0, x: 24, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 320 }}
                exit={{ opacity: 0, x: 24, width: 0 }}
                transition={{ duration: 0.24 }}
                className="hidden overflow-hidden rounded-[20px] border border-border bg-card xl:flex xl:flex-col"
              >
                <div className="flex border-b border-border p-2">
                  <button
                    onClick={() => setSidebarTab("history")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${
                      sidebarTab === "history"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <History className="h-4 w-4" />
                    History
                  </button>
                  <button
                    onClick={() => setSidebarTab("people")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${
                      sidebarTab === "people"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    People
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {sidebarTab === "history" ? (
                    <div className="space-y-3">
                      <div className="rounded-[16px] border border-border bg-muted/30 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          History
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">
                          Room activity
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Prompts and refinements stay attached to the same shared chat.
                        </p>
                      </div>

                      <div className="relative pl-5">
                        <div className="absolute bottom-2 left-[10px] top-2 w-px bg-border" />
                        {history.map((entry) => {
                          const participant = getParticipant(entry.userId);
                          if (!participant) {
                            return null;
                          }

                          return (
                            <div key={entry.id} className="relative mb-4">
                              <div className={`absolute left-[-15px] top-2 h-3 w-3 rounded-full border-2 border-card ${participant.color}`} />
                              <div className="rounded-[16px] border border-border bg-muted/20 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{participant.name}</p>
                                    <p className="mt-1 text-sm leading-6 text-foreground">{entry.action}</p>
                                  </div>
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {entry.time}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-[16px] border border-border bg-muted/30 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Presence
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">
                          People in room
                        </h3>
                      </div>

                      {scenario.participants.map((participant) => (
                        <div key={participant.id} className="rounded-[16px] border border-border bg-muted/20 p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-slate-900 ring-4 ${participant.color} ${participant.ring}`}>
                              {participant.shortName}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{participant.name}</p>
                              <p className="text-sm text-muted-foreground">{participant.role}</p>
                            </div>
                          </div>
                          <div className="mt-3 rounded-2xl border border-border bg-white px-3 py-2 text-sm text-foreground">
                            Active in this thread
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {shareOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/18 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                className="w-full max-w-xl rounded-[24px] border border-border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
              >
                <div className="flex items-start justify-between border-b border-border px-6 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Share "{scenario.title}"</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invite people directly or copy the room link.
                    </p>
                  </div>
                  <button
                    onClick={() => setShareOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-5 px-6 py-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Invite people</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          placeholder="name@example.com"
                          className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleInvite}
                        className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                      >
                        Send invite
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">People with access</p>
                        <p className="text-sm text-muted-foreground">Anyone invited can continue the same shared AI thread.</p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Editor</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {scenario.participants.map((participant) => (
                        <span
                          key={participant.id}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm text-foreground"
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${participant.color}`} />
                          {participant.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">General access</label>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                      Anyone with the link can view and join the conversation.
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Link</label>
                    <div className="flex gap-3">
                      <div className="flex flex-1 items-center rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                        <Link2 className="mr-2 h-4 w-4" />
                        {window.location.href}
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/40"
                      >
                        <Copy className="h-4 w-4" />
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
