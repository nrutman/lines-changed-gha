import { minimatch } from 'minimatch';
import type { FileChange, DiffSummary } from './types';

export function calculateDiffSummary(
  files: FileChange[],
  excludePatterns: string[]
): DiffSummary {
  const excludedFiles: string[] = [];
  const includedFiles: FileChange[] = [];
  let addedLines = 0;
  let removedLines = 0;
  let excludedAddedLines = 0;
  let excludedRemovedLines = 0;

  for (const file of files) {
    const isExcluded = excludePatterns.some(pattern =>
      minimatch(file.filename, pattern, { dot: true })
    );

    if (isExcluded) {
      excludedFiles.push(file.filename);
      excludedAddedLines += file.additions;
      excludedRemovedLines += file.deletions;
    } else {
      includedFiles.push(file);
      addedLines += file.additions;
      removedLines += file.deletions;
    }
  }

  return {
    addedLines,
    removedLines,
    excludedAddedLines,
    excludedRemovedLines,
    totalFiles: files.length,
    excludedFiles,
    includedFiles,
  };
}
