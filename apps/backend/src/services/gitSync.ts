import type { Database } from "./projectRepository";
import { GitStorage } from "./gitStorage";
import type { Project, RoadmapList, Chat, Message, Template, MetaChat, Snapshot } from "../types";
import {
  dbGetProject,
  dbGetRoadmap,
  dbListRoadmaps,
  dbGetMetaChat,
  dbListChats,
  dbGetChat,
  dbGetMessages,
  dbGetTemplate,
  dbAddSnapshot,
} from "./projectRepository";

/**
 * GitSync service manages bidirectional synchronization between the database and git storage.
 *
 * This service ensures that:
 * 1. Database changes are persisted to git storage
 * 2. Git storage can be used as a backup/audit trail
 * 3. Projects can be reconstructed from git storage
 */
export class GitSync {
  constructor(
    private db: Database,
    private gitStorage: GitStorage
  ) {}

  /**
   * Sync a project to git storage after database update
   */
  async syncProjectToGit(projectId: string): Promise<void> {
    const project = await dbGetProject(this.db, projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found in database`);
    }

    // Check if project git repo exists, initialize if not
    const exists = await this.gitStorage.projectExists(projectId);
    if (!exists) {
      await this.gitStorage.initProject(project);
    } else {
      await this.gitStorage.writeProject(project);
      await this.gitStorage.commitChanges(projectId, `Update project: ${project.name}`);
    }
  }

  /**
   * Sync a roadmap to git storage after database update
   */
  async syncRoadmapToGit(roadmapId: string): Promise<void> {
    const roadmap = await dbGetRoadmap(this.db, roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found in database`);
    }

    const metaChat = await dbGetMetaChat(this.db, roadmapId);
    if (!metaChat) {
      throw new Error(`Meta-chat for roadmap ${roadmapId} not found`);
    }

    // Check if roadmap directory exists
    try {
      await this.gitStorage.readRoadmap(roadmap.projectId, roadmapId);
      // Exists, just update
      await this.gitStorage.writeRoadmap(roadmap.projectId, roadmap);
      await this.gitStorage.writeMetaChat(roadmap.projectId, roadmapId, metaChat);
      await this.gitStorage.commitChanges(roadmap.projectId, `Update roadmap: ${roadmap.title}`);
    } catch {
      // Doesn't exist, initialize
      await this.gitStorage.initRoadmap(roadmap.projectId, roadmap, metaChat);
    }
  }

  /**
   * Sync a chat to git storage after database update
   */
  async syncChatToGit(chatId: string): Promise<void> {
    const chat = await dbGetChat(this.db, chatId);
    if (!chat) {
      throw new Error(`Chat ${chatId} not found in database`);
    }

    const roadmap = await dbGetRoadmap(this.db, chat.roadmapListId);
    if (!roadmap) {
      throw new Error(`Roadmap ${chat.roadmapListId} not found for chat ${chatId}`);
    }

    // Check if chat directory exists
    try {
      await this.gitStorage.readChat(roadmap.projectId, chat.roadmapListId, chatId);
      // Exists, just update
      await this.gitStorage.writeChat(roadmap.projectId, chat.roadmapListId, chat);
      await this.gitStorage.commitChanges(roadmap.projectId, `Update chat: ${chat.title}`);
    } catch {
      // Doesn't exist, initialize
      await this.gitStorage.initChat(roadmap.projectId, chat.roadmapListId, chat);
    }
  }

  /**
   * Sync a message to git storage after database insert
   */
  async syncMessageToGit(message: Message): Promise<void> {
    const chat = await dbGetChat(this.db, message.chatId);
    if (!chat) {
      throw new Error(`Chat ${message.chatId} not found for message ${message.id}`);
    }

    const roadmap = await dbGetRoadmap(this.db, chat.roadmapListId);
    if (!roadmap) {
      throw new Error(`Roadmap ${chat.roadmapListId} not found for chat ${message.chatId}`);
    }

    // Append message to JSONL file
    await this.gitStorage.appendMessage(roadmap.projectId, chat.roadmapListId, chat.id, message);

    // Commit the message (can be batched later for performance)
    const messagePreview =
      message.content.length > 50 ? message.content.slice(0, 50) + "..." : message.content;
    await this.gitStorage.commitChanges(
      roadmap.projectId,
      `Add message (${message.role}): ${messagePreview}`
    );
  }

  /**
   * Sync a template to git storage after database update
   * Templates are stored per-project for version tracking
   */
  async syncTemplateToGit(templateId: string, projectId: string): Promise<void> {
    // Note: This requires knowing which project the template belongs to
    // In practice, templates might be global or per-project
    // For now, we'll store them in a specific project's templates directory
    const template = await dbGetTemplate(this.db, templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found in database`);
    }

    await this.gitStorage.writeTemplate(projectId, template);
    await this.gitStorage.commitChanges(projectId, `Update template: ${template.title}`);
  }

  /**
   * Create a snapshot in both database and git
   */
  async createSnapshot(projectId: string, message?: string): Promise<Snapshot> {
    // Create git tag first
    const snapshot = await dbAddSnapshot(this.db, projectId, message);
    const commitSha = await this.gitStorage.createSnapshot(projectId, snapshot.id, message);

    return { ...snapshot, gitSha: commitSha };
  }

  /**
   * Restore a project from git storage to database
   * This is useful for disaster recovery or cloning projects
   */
  async restoreProjectFromGit(projectId: string): Promise<void> {
    // Read project from git
    const project = await this.gitStorage.readProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found in git storage`);
    }

    // TODO: Insert project into database
    // This would require database insert functions that don't exist yet
    // Placeholder for future implementation
    throw new Error("restoreProjectFromGit not yet implemented - requires database insert APIs");
  }

  /**
   * Sync entire project tree to git (bulk operation)
   */
  async syncFullProjectToGit(projectId: string): Promise<void> {
    const project = await dbGetProject(this.db, projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found in database`);
    }

    // Ensure project is initialized
    const exists = await this.gitStorage.projectExists(projectId);
    if (!exists) {
      await this.gitStorage.initProject(project);
    } else {
      await this.gitStorage.writeProject(project);
    }

    // Sync all roadmaps
    const roadmaps = await dbListRoadmaps(this.db, projectId);
    for (const roadmap of roadmaps) {
      const metaChat = await dbGetMetaChat(this.db, roadmap.id);
      if (!metaChat) continue;

      // Initialize or update roadmap
      try {
        await this.gitStorage.readRoadmap(projectId, roadmap.id);
        await this.gitStorage.writeRoadmap(projectId, roadmap);
        await this.gitStorage.writeMetaChat(projectId, roadmap.id, metaChat);
      } catch {
        await this.gitStorage.initRoadmap(projectId, roadmap, metaChat);
      }

      // Sync all chats in this roadmap
      const chats = await dbListChats(this.db, roadmap.id);
      for (const chat of chats) {
        // Initialize or update chat
        try {
          await this.gitStorage.readChat(projectId, roadmap.id, chat.id);
          await this.gitStorage.writeChat(projectId, roadmap.id, chat);
        } catch {
          await this.gitStorage.initChat(projectId, roadmap.id, chat);
        }

        // Sync all messages for this chat
        const messages = await dbGetMessages(this.db, chat.id);
        // Clear existing messages.jsonl and rewrite
        const chatDir = (this.gitStorage as any).getChatDir(projectId, roadmap.id, chat.id);
        const messagesFile = `${chatDir}/messages.jsonl`;
        const fs = await import("node:fs/promises");
        await fs.writeFile(messagesFile, "", "utf-8");

        // Write all messages
        for (const message of messages) {
          await this.gitStorage.appendMessage(projectId, roadmap.id, chat.id, message);
        }
      }
    }

    // Final commit
    await this.gitStorage.commitChanges(projectId, `Full project sync: ${project.name}`);
  }
}
