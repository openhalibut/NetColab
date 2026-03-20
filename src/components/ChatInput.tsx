import { useState } from "react";
import { AIModel } from "@/types/chat";
import { ModelSelector } from "./ModelSelector";
import { Send, ListPlus, Play } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (content: string, model: AIModel) => void;
  onQueue: (content: string, model: AIModel) => void;
  onFlush: () => void;
  disabled?: boolean;
  queueCount: number;
}

export function ChatInput({ onSend, onQueue, onFlush, disabled, queueCount }: ChatInputProps) {
  const [text, setText] = useState("");
  const [model, setModel] = useState<AIModel>("gemini-2.5-flash");

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), model);
    setText("");
  };

  const handleQueue = () => {
    if (!text.trim()) return;
    onQueue(text.trim(), model);
    setText("");
  };

  return (
    <div className="border-t border-border bg-card p-4">
      {/* Queue banner */}
      {queueCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2">
          <span className="text-xs text-accent">
            {queueCount} prompt{queueCount > 1 ? "s" : ""} queued — waiting for team
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFlush}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-30"
          >
            <Play className="h-3 w-3" />
            Send all to AI
          </motion.button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your prompt... (Shift+Enter for new line)"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-input p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex items-center justify-between">
            <ModelSelector value={model} onChange={setModel} />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="hidden sm:inline">Enter = send · Shift+Enter = newline</span>
            </div>
          </div>
        </div>

        <div className="mb-8 flex shrink-0 gap-2">
          {/* Queue button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQueue}
            disabled={!text.trim()}
            title="Queue prompt for batch send"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-secondary-foreground transition-opacity disabled:opacity-30"
          >
            <ListPlus className="h-4 w-4" />
          </motion.button>

          {/* Send immediately */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            title="Send to AI now"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
