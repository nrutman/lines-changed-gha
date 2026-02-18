import { minimatch } from 'minimatch';
import type { FileChange, DiffSummary } from './types';

export function calculateDiffSummary(
  files: FileChange[],
  ignorePatterns: string[]
): DiffSummary {
  const includedFiles: FileChange[] = [];
  const ignoredFiles: FileChange[] = [];
  let addedLines = 0;
  let removedLines = 0;
  let ignoredAddedLines = 0;
  let ignoredRemovedLines = 0;

  for (const file of files) {
    const isIgnored = ignorePatterns.some(pattern =>
      minimatch(file.filename, pattern, { dot: true })
    );

    if (isIgnored) {
      ignoredFiles.push(file);
      ignoredAddedLines += file.additions;
      ignoredRemovedLines += file.deletions;
    } else {
      includedFiles.push(file);
      addedLines += file.additions;
      removedLines += file.deletions;
    }
  }

  return {
    addedLines,
    removedLines,
    ignoredAddedLines,
    ignoredRemovedLines,
    totalFiles: files.length,
    includedFiles,
    ignoredFiles,
  };
}
