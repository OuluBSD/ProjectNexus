export type Project = {
  id: string;
  name: string;
  category?: string;
  status: string;
  theme?: Record<string, unknown>;
  description?: string;
  contentPath?: string;
  gitUrl?: string;
};

export type RoadmapList = {
  id: string;
  projectId: string;
  title: string;
  tags: string[];
  progress: number;
  status: string;
  metaChatId?: string;
};

export type Template = {
  id: string;
  title: string;
  goal?: string;
  systemPrompt?: string;
  starterMessages?: Array<{ role: string; content: string }>;
  javascriptPrompt?: string;
  javascriptLogic?: string;
  jsonRequired?: boolean;
  metadata?: Record<string, unknown>;
};

export type Chat = {
  id: string;
  roadmapListId: string;
  title: string;
  goal?: string;
  templateId?: string;
  status: string;
  progress: number;
  metadata?: Record<string, unknown>;
};

export type Message = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system" | "status" | "meta";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type MetaChat = {
  id: string;
  roadmapListId: string;
  status: string;
  progress: number;
  summary?: string;
};

export type MetaChatMessage = {
  id: string;
  metaChatId: string;
  role: "user" | "assistant" | "system" | "status";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type Snapshot = {
  id: string;
  projectId: string;
  gitSha: string;
  message?: string;
  createdAt: string;
};

export type Session = {
  token: string;
  userId: string;
  username: string;
};

export type TerminalSession = {
  id: string;
  projectId?: string;
  cwd?: string;
};
