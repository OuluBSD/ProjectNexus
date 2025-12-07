// src/utils/hints.ts
// Hints for error messages to improve user experience

export interface Hint {
  errorType: string;
  message: string;
}

export const hints: Hint[] = [
  {
    errorType: 'MISSING_REQUIRED_CONTEXT',
    message: "Tip: Use 'nexus agent project select --id <id>' to set a project."
  },
  {
    errorType: 'HANDLER_NOT_FOUND',
    message: "Tip: Run 'nexus help' to see available commands."
  },
  {
    errorType: 'VALIDATION_ERROR',
    message: "Tip: Check required flags with 'nexus help <command>'."
  },
  {
    errorType: 'MISSING_PROJECT_CONTEXT',
    message: "Tip: Use 'nexus agent project select --id <id>' to set a project."
  },
  {
    errorType: 'MISSING_ROADMAP_CONTEXT',
    message: "Tip: Use 'nexus agent roadmap select --id <id>' to set a roadmap."
  },
  {
    errorType: 'MISSING_CHAT_CONTEXT',
    message: "Tip: Use 'nexus agent chat select --id <id>' to set a chat."
  },
  {
    errorType: 'MISSING_AI_SESSION_CONTEXT',
    message: "Tip: Use 'nexus ai session create' to start an AI session."
  }
];

export function getHintForError(errorType: string): string | undefined {
  const hint = hints.find(hint => hint.errorType === errorType);
  return hint ? hint.message : undefined;
}

export function attachHintToError(errorType: string, originalMessage: string): string {
  const hint = getHintForError(errorType);
  if (hint) {
    return `${originalMessage}\n${hint}`;
  }
  return originalMessage;
}