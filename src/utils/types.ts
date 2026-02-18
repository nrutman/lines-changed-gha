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
  excludedAddedLines: number;
  excludedRemovedLines: number;
  totalFiles: number;
  excludedFiles: string[];
  includedFiles: FileChange[];
}
