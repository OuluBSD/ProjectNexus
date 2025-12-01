import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Project, RoadmapList, Chat, Message, Template, MetaChat } from "../types";

const execAsync = promisify(exec);

export interface GitStorageConfig {
  projectsRoot: string; // Base directory for all projects (e.g., "/data/projects")
}

/**
 * GitStorage service manages git-backed storage for projects, roadmaps, chats, and messages.
 *
 * Directory structure:
 * /projects/{projectId}/
 *   ├── .git/
 *   ├── project.json
 *   ├── roadmaps/{roadmapId}/
 *   │   ├── roadmap.json
 *   │   ├── meta-chat.json
 *   │   └── chats/{chatId}/
 *   │       ├── chat.json
 *   │       ├── messages.jsonl
 *   │       └── workspace/
 *   └── templates/{templateId}.json
 */
export class GitStorage {
  private config: GitStorageConfig;

  constructor(config: GitStorageConfig) {
    this.config = config;
  }

  /**
   * Get the root directory for a project
   */
  getProjectRoot(projectId: string): string {
    return path.join(this.config.projectsRoot, projectId);
  }

  /**
   * Get the directory for a roadmap
   */
  getRoadmapDir(projectId: string, roadmapId: string): string {
    return path.join(this.getProjectRoot(projectId), "roadmaps", roadmapId);
  }

  /**
   * Get the directory for a chat
   */
  getChatDir(projectId: string, roadmapId: string, chatId: string): string {
    return path.join(this.getRoadmapDir(projectId, roadmapId), "chats", chatId);
  }

  /**
   * Get the workspace directory for a chat (writable area for agent operations)
   */
  getChatWorkspace(projectId: string, roadmapId: string, chatId: string): string {
    return path.join(this.getChatDir(projectId, roadmapId, chatId), "workspace");
  }

  /**
   * Get the directory for templates in a project
   */
  getTemplateDir(projectId: string): string {
    return path.join(this.getProjectRoot(projectId), "templates");
  }

  /**
   * Initialize a new git repository for a project
   */
  async initProject(project: Project): Promise<void> {
    const projectRoot = this.getProjectRoot(project.id);

    // Create directory structure
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.mkdir(path.join(projectRoot, "roadmaps"), { recursive: true });
    await fs.mkdir(path.join(projectRoot, "templates"), { recursive: true });

    // Initialize git repository
    await execAsync("git init", { cwd: projectRoot });
    await execAsync('git config user.name "Project Nexus"', { cwd: projectRoot });
    await execAsync('git config user.email "nexus@localhost"', { cwd: projectRoot });

    // Create .gitignore
    const gitignore = [
      "# Workspace directories (agent working areas)",
      "**/workspace/",
      "",
      "# Temporary files",
      "*.tmp",
      ".DS_Store",
      "",
    ].join("\n");
    await fs.writeFile(path.join(projectRoot, ".gitignore"), gitignore, "utf-8");

    // Write project metadata
    await this.writeProject(project);

    // Initial commit
    await execAsync("git add .", { cwd: projectRoot });
    await execAsync('git commit -m "Initial project setup"', { cwd: projectRoot });
  }

  /**
   * Write project metadata to project.json
   */
  async writeProject(project: Project): Promise<void> {
    const projectRoot = this.getProjectRoot(project.id);
    const projectFile = path.join(projectRoot, "project.json");

    const data = {
      id: project.id,
      name: project.name,
      category: project.category,
      status: project.status,
      theme: project.theme,
      description: project.description,
      contentPath: project.contentPath,
      gitUrl: project.gitUrl,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(projectFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Read project metadata from project.json
   */
  async readProject(projectId: string): Promise<Project | null> {
    const projectFile = path.join(this.getProjectRoot(projectId), "project.json");

    try {
      const content = await fs.readFile(projectFile, "utf-8");
      return JSON.parse(content) as Project;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Initialize a new roadmap directory
   */
  async initRoadmap(projectId: string, roadmap: RoadmapList, metaChat: MetaChat): Promise<void> {
    const roadmapDir = this.getRoadmapDir(projectId, roadmap.id);

    // Create directory structure
    await fs.mkdir(roadmapDir, { recursive: true });
    await fs.mkdir(path.join(roadmapDir, "chats"), { recursive: true });

    // Write roadmap metadata
    await this.writeRoadmap(projectId, roadmap);

    // Write meta-chat metadata
    await this.writeMetaChat(projectId, roadmap.id, metaChat);

    // Commit changes
    await this.commitChanges(projectId, `Add roadmap: ${roadmap.title}`);
  }

  /**
   * Write roadmap metadata to roadmap.json
   */
  async writeRoadmap(projectId: string, roadmap: RoadmapList): Promise<void> {
    const roadmapFile = path.join(this.getRoadmapDir(projectId, roadmap.id), "roadmap.json");

    const data = {
      id: roadmap.id,
      projectId: roadmap.projectId,
      title: roadmap.title,
      tags: roadmap.tags,
      progress: roadmap.progress,
      status: roadmap.status,
      metaChatId: roadmap.metaChatId,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(roadmapFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Read roadmap metadata from roadmap.json
   */
  async readRoadmap(projectId: string, roadmapId: string): Promise<RoadmapList | null> {
    const roadmapFile = path.join(this.getRoadmapDir(projectId, roadmapId), "roadmap.json");

    try {
      const content = await fs.readFile(roadmapFile, "utf-8");
      return JSON.parse(content) as RoadmapList;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Write meta-chat metadata to meta-chat.json
   */
  async writeMetaChat(projectId: string, roadmapId: string, metaChat: MetaChat): Promise<void> {
    const metaChatFile = path.join(this.getRoadmapDir(projectId, roadmapId), "meta-chat.json");

    const data = {
      id: metaChat.id,
      roadmapListId: metaChat.roadmapListId,
      status: metaChat.status,
      progress: metaChat.progress,
      summary: metaChat.summary,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(metaChatFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Read meta-chat metadata from meta-chat.json
   */
  async readMetaChat(projectId: string, roadmapId: string): Promise<MetaChat | null> {
    const metaChatFile = path.join(this.getRoadmapDir(projectId, roadmapId), "meta-chat.json");

    try {
      const content = await fs.readFile(metaChatFile, "utf-8");
      return JSON.parse(content) as MetaChat;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Initialize a new chat directory
   */
  async initChat(projectId: string, roadmapId: string, chat: Chat): Promise<void> {
    const chatDir = this.getChatDir(projectId, roadmapId, chat.id);

    // Create directory structure
    await fs.mkdir(chatDir, { recursive: true });
    await fs.mkdir(path.join(chatDir, "workspace"), { recursive: true });

    // Write chat metadata
    await this.writeChat(projectId, roadmapId, chat);

    // Create empty messages.jsonl
    await fs.writeFile(path.join(chatDir, "messages.jsonl"), "", "utf-8");

    // Commit changes
    await this.commitChanges(projectId, `Add chat: ${chat.title}`);
  }

  /**
   * Write chat metadata to chat.json
   */
  async writeChat(projectId: string, roadmapId: string, chat: Chat): Promise<void> {
    const chatFile = path.join(this.getChatDir(projectId, roadmapId, chat.id), "chat.json");

    const data = {
      id: chat.id,
      roadmapListId: chat.roadmapListId,
      title: chat.title,
      goal: chat.goal,
      templateId: chat.templateId,
      status: chat.status,
      progress: chat.progress,
      metadata: chat.metadata,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(chatFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Read chat metadata from chat.json
   */
  async readChat(projectId: string, roadmapId: string, chatId: string): Promise<Chat | null> {
    const chatFile = path.join(this.getChatDir(projectId, roadmapId, chatId), "chat.json");

    try {
      const content = await fs.readFile(chatFile, "utf-8");
      return JSON.parse(content) as Chat;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Append a message to messages.jsonl
   */
  async appendMessage(
    projectId: string,
    roadmapId: string,
    chatId: string,
    message: Message
  ): Promise<void> {
    const messagesFile = path.join(this.getChatDir(projectId, roadmapId, chatId), "messages.jsonl");

    const line = JSON.stringify(message) + "\n";
    await fs.appendFile(messagesFile, line, "utf-8");
  }

  /**
   * Read all messages from messages.jsonl
   */
  async readMessages(projectId: string, roadmapId: string, chatId: string): Promise<Message[]> {
    const messagesFile = path.join(this.getChatDir(projectId, roadmapId, chatId), "messages.jsonl");

    try {
      const content = await fs.readFile(messagesFile, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      return lines.map((line) => JSON.parse(line) as Message);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  /**
   * Write template metadata with version tracking
   */
  async writeTemplate(projectId: string, template: Template): Promise<void> {
    const templateFile = path.join(
      this.getProjectRoot(projectId),
      "templates",
      `${template.id}.json`
    );

    const data = {
      id: template.id,
      title: template.title,
      goal: template.goal,
      systemPrompt: template.systemPrompt,
      starterMessages: template.starterMessages,
      javascriptPrompt: template.javascriptPrompt,
      javascriptLogic: template.javascriptLogic,
      jsonRequired: template.jsonRequired,
      metadata: template.metadata,
      version: new Date().toISOString(), // Simple version tracking using timestamp
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(templateFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Read template metadata
   */
  async readTemplate(projectId: string, templateId: string): Promise<Template | null> {
    const templateFile = path.join(
      this.getProjectRoot(projectId),
      "templates",
      `${templateId}.json`
    );

    try {
      const content = await fs.readFile(templateFile, "utf-8");
      return JSON.parse(content) as Template;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Commit all changes in the project repository
   */
  async commitChanges(projectId: string, message: string): Promise<string> {
    const projectRoot = this.getProjectRoot(projectId);

    // Stage all changes
    await execAsync("git add .", { cwd: projectRoot });

    // Check if there are changes to commit
    try {
      await execAsync("git diff --cached --quiet", { cwd: projectRoot });
      // No changes to commit
      return await this.getCurrentCommitSha(projectId);
    } catch {
      // Changes exist, proceed with commit
    }

    // Commit changes
    const timestamp = new Date().toISOString();
    const commitMessage = `${message}\n\nTimestamp: ${timestamp}`;
    await execAsync(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: projectRoot });

    // Return the commit SHA
    return await this.getCurrentCommitSha(projectId);
  }

  /**
   * Get the current commit SHA
   */
  async getCurrentCommitSha(projectId: string): Promise<string> {
    const projectRoot = this.getProjectRoot(projectId);
    const { stdout } = await execAsync("git rev-parse HEAD", { cwd: projectRoot });
    return stdout.trim();
  }

  /**
   * Create a snapshot by tagging the current commit
   */
  async createSnapshot(projectId: string, snapshotId: string, message?: string): Promise<string> {
    const projectRoot = this.getProjectRoot(projectId);
    const commitSha = await this.getCurrentCommitSha(projectId);

    const tagName = `snapshot-${snapshotId}`;
    const tagMessage = message || "Snapshot created";

    await execAsync(`git tag -a ${JSON.stringify(tagName)} -m ${JSON.stringify(tagMessage)}`, {
      cwd: projectRoot,
    });

    return commitSha;
  }

  /**
   * Check if a project git repository exists
   */
  async projectExists(projectId: string): Promise<boolean> {
    const projectRoot = this.getProjectRoot(projectId);
    const gitDir = path.join(projectRoot, ".git");

    try {
      await fs.access(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get git log for a project (for version history)
   */
  async getCommitHistory(
    projectId: string,
    limit: number = 50
  ): Promise<Array<{ sha: string; message: string; timestamp: string; author: string }>> {
    const projectRoot = this.getProjectRoot(projectId);

    try {
      const { stdout } = await execAsync(`git log --pretty=format:"%H|%s|%ai|%an" -n ${limit}`, {
        cwd: projectRoot,
      });

      return stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [sha, message, timestamp, author] = line.split("|");
          return { sha, message, timestamp, author };
        });
    } catch {
      return [];
    }
  }

  /**
   * Get the diff for a specific commit
   */
  async getCommitDiff(projectId: string, commitSha: string): Promise<string> {
    const projectRoot = this.getProjectRoot(projectId);

    try {
      const { stdout } = await execAsync(`git show ${commitSha}`, { cwd: projectRoot });
      return stdout;
    } catch (err) {
      throw new Error(`Failed to get diff for commit ${commitSha}: ${err}`);
    }
  }
}
