/**
 * Top Menu Bar Component
 * Desktop-like application menu bar for navigating between features
 */

import { type MouseEvent } from "react";

export type AppSection = "agent-manager" | "ai-chat" | "network";

interface TopMenuBarProps {
  currentSection: AppSection;
  onSectionChange: (section: AppSection) => void;
}

export function TopMenuBar({ currentSection, onSectionChange }: TopMenuBarProps) {
  return (
    <div className="top-menu-bar">
      <div className="menu-bar-brand">
        <span className="menu-bar-icon">⚡</span>
        <span className="menu-bar-title">Project Nexus</span>
      </div>

      <div className="menu-bar-items">
        <button
          className={`menu-bar-item ${currentSection === "agent-manager" ? "active" : ""}`}
          onClick={() => onSectionChange("agent-manager")}
        >
          Agent Manager
        </button>
        <button
          className={`menu-bar-item ${currentSection === "ai-chat" ? "active" : ""}`}
          onClick={() => onSectionChange("ai-chat")}
        >
          AI Chat
        </button>
        <button
          className={`menu-bar-item ${currentSection === "network" ? "active" : ""}`}
          onClick={() => onSectionChange("network")}
        >
          Network
        </button>
      </div>

      <div className="menu-bar-spacer" />
    </div>
  );
}
