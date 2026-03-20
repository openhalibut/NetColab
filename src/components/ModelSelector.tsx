import { AIModel, MODEL_INFO } from "@/types/chat";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModelSelectorProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const info = MODEL_INFO[value];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
      >
        <span>{info.icon}</span>
        <span>{info.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute bottom-full left-0 z-50 mb-1 w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
          >
            {(Object.keys(MODEL_INFO) as AIModel[]).map((model) => {
              const m = MODEL_INFO[model];
              return (
                <button
                  key={model}
                  onClick={() => { onChange(model); setOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                    model === value ? "bg-muted font-medium text-foreground" : "text-secondary-foreground"
                  }`}
                >
                  <span className={m.color}>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
