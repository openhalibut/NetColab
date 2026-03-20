import { useState, useRef, useEffect } from "react";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { UserPresence } from "@/components/UserPresence";
import { VersionHistory } from "@/components/VersionHistory";
import { MOCK_USERS, MOCK_MESSAGES, MOCK_VERSIONS } from "@/data/mockData";
import { ChatMessage, VersionEntry, AIModel, MODEL_INFO } from "@/types/chat";
import { Users, History, MessageSquare, PanelRightOpen, PanelRightClose, ArrowLeft, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SIMULATED_RESPONSES: Record<string, string> = {
  default:
    "That's a great addition to the discussion! Based on the team's collective input, I'd suggest we also consider **A/B testing** the messaging angles before committing to a full campaign. This way we can leverage data-driven decisions alongside the creative strategy.\n\nWould anyone like to propose specific metrics we should track?",
};

export default function Index() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [versions, setVersions] = useState<VersionEntry[]>(MOCK_VERSIONS);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"people" | "history">("people");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const currentUser = MOCK_USERS[0];

  const queuedMessages = messages.filter((m) => m.type === "queued");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (content: string, model: AIModel) => {
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      userId: currentUser.id,
      content,
      timestamp: new Date(),
      type: "user",
      model,
    };

    const newVersion: VersionEntry = {
      id: `v${Date.now()}`,
      userId: currentUser.id,
      action: `Prompted with ${MODEL_INFO[model].label}`,
      timestamp: new Date(),
      messageId: newMsg.id,
    };

    setMessages((prev) => [...prev, newMsg]);
    setVersions((prev) => [...prev, newVersion]);
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `m${Date.now() + 1}`,
        userId: "ai",
        content: SIMULATED_RESPONSES.default,
        timestamp: new Date(),
        type: "ai",
        model,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleQueue = (content: string, model: AIModel) => {
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      userId: currentUser.id,
      content,
      timestamp: new Date(),
      type: "queued",
      model,
    };

    const newVersion: VersionEntry = {
      id: `v${Date.now()}`,
      userId: currentUser.id,
      action: `Queued prompt for batch`,
      timestamp: new Date(),
      messageId: newMsg.id,
    };

    setMessages((prev) => [...prev, newMsg]);
    setVersions((prev) => [...prev, newVersion]);
  };

  const handleFlush = () => {
    // Convert all queued messages to user messages and send to AI
    setMessages((prev) =>
      prev.map((m) => (m.type === "queued" ? { ...m, type: "user" as const } : m))
    );

    const version: VersionEntry = {
      id: `v${Date.now()}`,
      userId: currentUser.id,
      action: `Sent ${queuedMessages.length} queued prompts to AI`,
      timestamp: new Date(),
      messageId: queuedMessages[0]?.id || "",
    };
    setVersions((prev) => [...prev, version]);
    setIsTyping(true);

    const combinedContext = queuedMessages.map((m) => m.content).join("\n\n");

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `m${Date.now() + 1}`,
        userId: "ai",
        content: `Based on all ${queuedMessages.length} prompts from the team, here's a synthesized response:\n\n${SIMULATED_RESPONSES.default}`,
        timestamp: new Date(),
        type: "ai",
        model: queuedMessages[0]?.model || "gemini-2.5-flash",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 2000 + Math.random() * 1000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const getUser = (id: string) => MOCK_USERS.find((u) => u.id === id);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Product Launch Brainstorm</h1>
              <p className="text-xs text-muted-foreground">{MOCK_USERS.filter((u) => u.isOnline).length} collaborators online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            {/* Stacked avatars */}
            <div className="flex -space-x-2">
              {MOCK_USERS.filter((u) => u.isOnline).map((user) => (
                <div
                  key={user.id}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-background ${
                    user.color === "cyan" ? "bg-user-cyan" :
                    user.color === "pink" ? "bg-user-pink" :
                    user.color === "amber" ? "bg-user-amber" :
                    user.color === "violet" ? "bg-user-violet" : "bg-user-green"
                  }`}
                >
                  {user.avatar}
                </div>
              ))}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8">
          <div className="mx-auto max-w-3xl py-4">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                user={getUser(msg.userId)}
                isCurrentUser={msg.userId === currentUser.id}
              />
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 py-3 text-xs text-muted-foreground"
              >
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" style={{ animationDelay: "0.4s" }} />
                </div>
                AI is thinking...
              </motion.div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            onSend={handleSend}
            onQueue={handleQueue}
            onFlush={handleFlush}
            disabled={isTyping}
            queueCount={queuedMessages.length}
          />
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col overflow-hidden border-l border-border bg-card"
          >
            <div className="flex border-b border-border">
              <button
                onClick={() => setSidebarTab("people")}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                  sidebarTab === "people" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                People
              </button>
              <button
                onClick={() => setSidebarTab("history")}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                  sidebarTab === "history" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "people" ? (
                <UserPresence users={MOCK_USERS} />
              ) : (
                <VersionHistory entries={versions} users={MOCK_USERS} />
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
