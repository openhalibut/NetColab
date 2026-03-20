import { useState } from "react";
import { AIModel } from "@/types/chat";
import { ModelSelector } from "./ModelSelector";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (content: string, model: AIModel) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [model, setModel] = useState<AIModel>("gemini-2.5-flash");

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), model);
    setText("");
  };

  return (
    <div className="border-t border-border bg-card p-4">
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
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="mb-8 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
