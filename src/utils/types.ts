export interface FileChange {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
}

export interface DiffSummary {
  addedLines: number;
  removedLines: number;
  ignoredAddedLines: number;
  ignoredRemovedLines: number;
  totalFiles: number;
  includedFiles: FileChange[];
  ignoredFiles: FileChange[];
}
