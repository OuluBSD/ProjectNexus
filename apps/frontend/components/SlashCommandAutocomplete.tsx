"use client";

import { useEffect, useRef } from "react";
import type { SlashCommand } from "../lib/slashCommands";

type SlashCommandAutocompleteProps = {
  suggestions: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
};

export function SlashCommandAutocomplete({
  suggestions,
  selectedIndex,
  onSelect,
  inputRef,
}: SlashCommandAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  // Position the autocomplete dropdown relative to the textarea
  const getPosition = () => {
    if (!inputRef.current) return { top: 0, left: 0 };
    const rect = inputRef.current.getBoundingClientRect();
    return {
      top: rect.top - (suggestions.length * 36 + 10), // Position above the textarea
      left: rect.left,
      width: Math.min(rect.width, 400),
    };
  };

  const position = getPosition();

  return (
    <div
      ref={listRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        background: "#1F2937",
        border: "1px solid #374151",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
        zIndex: 50,
        maxHeight: "200px",
        overflowY: "auto",
      }}
    >
      {suggestions.map((cmd, idx) => (
        <button
          key={cmd.name}
          type="button"
          onClick={() => onSelect(cmd)}
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "0.5rem 0.75rem",
            background: idx === selectedIndex ? "#374151" : "transparent",
            border: "none",
            textAlign: "left",
            cursor: "pointer",
            borderBottom: idx < suggestions.length - 1 ? "1px solid #374151" : "none",
          }}
          onMouseEnter={(e) => {
            if (idx !== selectedIndex) {
              e.currentTarget.style.background = "#2D3748";
            }
          }}
          onMouseLeave={(e) => {
            if (idx !== selectedIndex) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontWeight: 600, color: "#60A5FA", fontSize: "0.875rem" }}>
              /{cmd.name}
            </span>
            {cmd.aliases && cmd.aliases.length > 0 && (
              <span style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>
                ({cmd.aliases.map((a) => `/${a}`).join(", ")})
              </span>
            )}
          </div>
          <span style={{ color: "#D1D5DB", fontSize: "0.75rem", marginTop: "2px" }}>
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}
