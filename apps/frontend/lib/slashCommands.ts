export type SlashCommand = {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string, context: SlashCommandContext) => Promise<void> | void;
};

export type SlashCommandContext = {
  sessionToken: string;
  selectedChatId: string | null;
  selectedProjectId: string | null;
  selectedRoadmapId: string | null;
  appendMessage: (role: "system" | "status" | "meta", content: string) => void;
  updateChatStatus: (status: string, progress?: number) => void;
  openMetaChat: () => void;
};

const commands: SlashCommand[] = [
  {
    name: "help",
    description: "Show available slash commands",
    aliases: ["?"],
    handler: (_, context) => {
      const helpText = commands
        .map((cmd) => {
          const aliases = cmd.aliases ? ` (${cmd.aliases.map((a) => `/${a}`).join(", ")})` : "";
          return `/${cmd.name}${aliases} - ${cmd.description}`;
        })
        .join("\n");
      context.appendMessage("system", `Available slash commands:\n\n${helpText}`);
    },
  },
  {
    name: "status",
    description: "Show current chat status and progress",
    handler: (_, context) => {
      if (!context.selectedChatId) {
        context.appendMessage("system", "No chat selected.");
        return;
      }
      context.appendMessage("system", "Status information would be displayed here.");
    },
  },
  {
    name: "meta",
    description: "Open the meta-chat for this roadmap",
    handler: (_, context) => {
      if (!context.selectedRoadmapId) {
        context.appendMessage("system", "No roadmap selected.");
        return;
      }
      context.openMetaChat();
    },
  },
  {
    name: "clear",
    description: "Clear the message input",
    handler: () => {
      // Handler is no-op; clearing is done by the caller
    },
  },
];

export function getSlashCommands(): SlashCommand[] {
  return commands;
}

export function parseSlashCommand(input: string): { command: string; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");

  return { command, args };
}

export function findSlashCommand(commandName: string): SlashCommand | null {
  const normalized = commandName.toLowerCase();
  return (
    commands.find(
      (cmd) => cmd.name === normalized || cmd.aliases?.some((alias) => alias === normalized)
    ) ?? null
  );
}

export function getSlashCommandSuggestions(input: string): SlashCommand[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return [];

  const commandPart = trimmed.slice(1).split(/\s+/)[0].toLowerCase();
  if (!commandPart) return commands;

  return commands.filter((cmd) => {
    const matches = cmd.name.startsWith(commandPart);
    const aliasMatches = cmd.aliases?.some((alias) => alias.startsWith(commandPart)) ?? false;
    return matches || aliasMatches;
  });
}

export async function executeSlashCommand(
  input: string,
  context: SlashCommandContext
): Promise<boolean> {
  const parsed = parseSlashCommand(input);
  if (!parsed) return false;

  const command = findSlashCommand(parsed.command);
  if (!command) {
    context.appendMessage(
      "system",
      `Unknown command: /${parsed.command}. Type /help for available commands.`
    );
    return true;
  }

  try {
    await command.handler(parsed.args, context);
    return true;
  } catch (err) {
    context.appendMessage(
      "system",
      `Error executing /${command.name}: ${err instanceof Error ? err.message : "unknown error"}`
    );
    return true;
  }
}
