import { CLI_MANIFEST } from '../src/manifest/cli-manifest';
import {
  generateBashCompletion as bashGen,
  generateZshCompletion as zshGen,
  generateFishCompletion as fishGen,
  generateAllCompletions as allGen
} from '../src/utils/shell-completion';

// Re-export the functions for use in the tool
export {
  bashGen as generateBashCompletion,
  zshGen as generateZshCompletion,
  fishGen as generateFishCompletion,
  allGen as generateAllCompletions
};

// Export the original functions as well to avoid conflicts
export function generateBashCompletion(): string {
  return bashGen();
}

export function generateZshCompletion(): string {
  return zshGen();
}

export function generateFishCompletion(): string {
  return fishGen();
}

export function generateAllCompletions(shell: string): string {
  return allGen(shell);
}