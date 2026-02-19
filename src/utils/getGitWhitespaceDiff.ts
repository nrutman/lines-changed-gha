import * as core from '@actions/core';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Parsed line counts for a single file from git diff --numstat
 */
export interface GitLineCounts {
  additions: number;
  deletions: number;
}

/**
 * Parses the output of `git diff --numstat` into a map of filename to line counts.
 *
 * Format: `<added>\t<removed>\t<filename>` per line
 * Binary files show as `-\t-\t<filename>` and are excluded.
 * Renamed files show as `<added>\t<removed>\t<old> => <new>` or with `{old => new}` syntax.
 *
 * @param output - Raw output from git diff --numstat
 * @returns Map of filename to additions/deletions counts
 */
export function parseGitNumstat(output: string): Map<string, GitLineCounts> {
  const result = new Map<string, GitLineCounts>();

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');
    if (parts.length < 3) continue;

    const [addedStr, removedStr, ...filenameParts] = parts;
    const filename = filenameParts.join('\t');

    // Skip binary files (shown as - - filename)
    if (addedStr === '-' && removedStr === '-') continue;

    const additions = parseInt(addedStr, 10);
    const deletions = parseInt(removedStr, 10);

    if (isNaN(additions) || isNaN(deletions)) continue;

    // Handle rename syntax: use the new filename
    // Format: "old => new" or "{old => new}/path" or "path/{old => new}"
    let resolvedFilename = filename;
    if (filename.includes(' => ')) {
      const braceMatch = filename.match(/^(.*)\{.* => (.*)\}(.*)$/);
      if (braceMatch) {
        resolvedFilename = braceMatch[1] + braceMatch[2] + braceMatch[3];
      } else {
        resolvedFilename = filename.split(' => ')[1];
      }
    }

    result.set(resolvedFilename, { additions, deletions });
  }

  return result;
}

/**
 * Runs `git diff -w --numstat` between two commits to get whitespace-adjusted line counts.
 *
 * Requires `actions/checkout` to have been run before this action. Falls back gracefully
 * to null if the checkout is missing or git fails.
 *
 * @param baseSha - Base commit SHA (PR base)
 * @param headSha - Head commit SHA (PR head)
 * @returns Map of filename to adjusted line counts, or null if unavailable
 */
export async function getGitWhitespaceDiff(
  baseSha: string,
  headSha: string
): Promise<Map<string, GitLineCounts> | null> {
  // Check if we're in a git checkout
  if (!existsSync('.git')) {
    core.warning(
      'No git checkout detected. Whitespace-adjusted counts are unavailable. ' +
        'Add actions/checkout before this action to enable ignore-whitespace.'
    );
    return null;
  }

  try {
    // Ensure the commits are available (shallow clones may not have them)
    try {
      execSync(`git fetch origin ${baseSha} ${headSha} --depth=1`, {
        stdio: 'pipe',
      });
    } catch {
      // Ignore fetch errors - commits may already be available
    }

    const output = execSync(`git diff -w --numstat ${baseSha}...${headSha}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    });

    return parseGitNumstat(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    core.warning(
      `Failed to get whitespace-adjusted diff: ${message}. ` +
        'Falling back to GitHub API counts.'
    );
    return null;
  }
}
