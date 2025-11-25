"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "status" | "meta";
  content: string;
  createdAt: string;
};

type MessageNavigationProps = {
  messages: Message[];
  visibleMessages: Message[];
};

export function MessageNavigation({ messages, visibleMessages }: MessageNavigationProps) {
  const [currentUserMessageIndex, setCurrentUserMessageIndex] = useState<number>(-1);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Get all user messages in order
  const userMessages = visibleMessages.filter((msg) => msg.role === "user");

  // Update current index when visible messages change
  useEffect(() => {
    if (currentUserMessageIndex >= userMessages.length) {
      setCurrentUserMessageIndex(userMessages.length > 0 ? userMessages.length - 1 : -1);
    }
  }, [userMessages.length, currentUserMessageIndex]);

  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a visual highlight
      element.style.transition = "background-color 0.3s ease";
      element.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
      setTimeout(() => {
        element.style.backgroundColor = "";
      }, 1000);
    }
  }, []);

  const goToPrevious = useCallback(() => {
    if (userMessages.length === 0) return;
    const newIndex =
      currentUserMessageIndex <= 0 ? userMessages.length - 1 : currentUserMessageIndex - 1;
    setCurrentUserMessageIndex(newIndex);
    scrollToMessage(userMessages[newIndex].id);
  }, [currentUserMessageIndex, userMessages, scrollToMessage]);

  const goToNext = useCallback(() => {
    if (userMessages.length === 0) return;
    const newIndex =
      currentUserMessageIndex >= userMessages.length - 1 ? 0 : currentUserMessageIndex + 1;
    setCurrentUserMessageIndex(newIndex);
    scrollToMessage(userMessages[newIndex].id);
  }, [currentUserMessageIndex, userMessages, scrollToMessage]);

  // Register refs for all visible messages
  const registerRef = useCallback((messageId: string, element: HTMLElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
    } else {
      messageRefs.current.delete(messageId);
    }
  }, []);

  if (userMessages.length === 0) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem",
          borderTop: "1px solid #374151",
          background: "#1F2937",
        }}
      >
        <span className="item-subtle" style={{ fontSize: "0.875rem" }}>
          User messages: {currentUserMessageIndex + 1} / {userMessages.length}
        </span>
        <button
          type="button"
          onClick={goToPrevious}
          disabled={userMessages.length === 0}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.875rem",
            background: "#374151",
            color: "#F9FAFB",
            border: "1px solid #4B5563",
            borderRadius: "4px",
            cursor: userMessages.length === 0 ? "not-allowed" : "pointer",
            opacity: userMessages.length === 0 ? 0.5 : 1,
          }}
          title="Previous user message (wraps around)"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={goToNext}
          disabled={userMessages.length === 0}
          style={{
            padding: "0.25rem 0.75rem",
            fontSize: "0.875rem",
            background: "#374151",
            color: "#F9FAFB",
            border: "1px solid #4B5563",
            borderRadius: "4px",
            cursor: userMessages.length === 0 ? "not-allowed" : "pointer",
            opacity: userMessages.length === 0 ? 0.5 : 1,
          }}
          title="Next user message (wraps around)"
        >
          Next →
        </button>
      </div>
      {/* Hidden hook to expose registerRef */}
      <MessageRefProvider registerRef={registerRef} />
    </>
  );
}

// Context to pass registerRef to parent
function MessageRefProvider({
  registerRef,
}: {
  registerRef: (id: string, el: HTMLElement | null) => void;
}) {
  // This is a pattern to expose the registerRef function to the parent
  // The parent will need to call this on each message element
  return null;
}

// Export the hook for use in parent component
export function useMessageNavigation(messages: Message[], visibleMessages: Message[]) {
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [currentUserMessageIndex, setCurrentUserMessageIndex] = useState<number>(-1);

  const userMessages = visibleMessages.filter((msg) => msg.role === "user");

  useEffect(() => {
    if (currentUserMessageIndex >= userMessages.length) {
      setCurrentUserMessageIndex(userMessages.length > 0 ? userMessages.length - 1 : -1);
    }
  }, [userMessages.length, currentUserMessageIndex]);

  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.style.transition = "background-color 0.3s ease";
      element.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
      setTimeout(() => {
        element.style.backgroundColor = "";
      }, 1000);
    }
  }, []);

  const goToPrevious = useCallback(() => {
    if (userMessages.length === 0) return;
    const newIndex =
      currentUserMessageIndex <= 0 ? userMessages.length - 1 : currentUserMessageIndex - 1;
    setCurrentUserMessageIndex(newIndex);
    scrollToMessage(userMessages[newIndex].id);
  }, [currentUserMessageIndex, userMessages, scrollToMessage]);

  const goToNext = useCallback(() => {
    if (userMessages.length === 0) return;
    const newIndex =
      currentUserMessageIndex >= userMessages.length - 1 ? 0 : currentUserMessageIndex + 1;
    setCurrentUserMessageIndex(newIndex);
    scrollToMessage(userMessages[newIndex].id);
  }, [currentUserMessageIndex, userMessages, scrollToMessage]);

  const registerRef = useCallback((messageId: string, element: HTMLElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
    } else {
      messageRefs.current.delete(messageId);
    }
  }, []);

  return {
    currentUserMessageIndex,
    userMessages,
    goToPrevious,
    goToNext,
    registerRef,
  };
}
