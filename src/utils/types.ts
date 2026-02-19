/**
 * Represents a single file change from the GitHub API
 */
export interface FileChange {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
}

/**
 * Configuration for a file group
 */
export interface FileGroup {
  /** Display label for this group */
  label: string;
  /** Glob patterns to match files for this group */
  patterns: string[];
  /** Whether files in this group count toward the main +/- metric */
  countTowardMetric: boolean;
  /** Whether to exclude whitespace-only changes from line counts */
  ignoreWhitespace: boolean;
}

/**
 * Configuration for the default group (files not matching any other group)
 */
export interface DefaultGroupConfig {
  /** Display label for the default group */
  label: string;
  /** Whether files in the default group count toward the main +/- metric (always true) */
  countTowardMetric: true;
  /** Whether to exclude whitespace-only changes from line counts */
  ignoreWhitespace: boolean;
}

/**
 * Type guard to check if a group config is a FileGroup (has patterns) vs DefaultGroupConfig
 */
export function isFileGroup(
  group: FileGroup | DefaultGroupConfig
): group is FileGroup {
  return 'patterns' in group;
}

/**
 * Complete file groups configuration
 */
export interface FileGroupsConfig {
  /** Ordered list of file groups (processed in order, first match wins) */
  groups: FileGroup[];
  /** Configuration for files not matching any group */
  defaultGroup: DefaultGroupConfig;
}

/**
 * Files grouped together with their aggregated metrics
 */
export interface GroupedFiles {
  /** The group configuration */
  group: FileGroup | DefaultGroupConfig;
  /** Files belonging to this group */
  files: FileChange[];
  /** Total lines added in this group */
  addedLines: number;
  /** Total lines removed in this group */
  removedLines: number;
  /** Lines added that were whitespace-only (excluded from group totals) */
  whitespaceOnlyAddedLines?: number;
  /** Lines removed that were whitespace-only (excluded from group totals) */
  whitespaceOnlyRemovedLines?: number;
}

/**
 * Summary of diff calculations with grouped files
 */
export interface DiffSummary {
  /** Lines added from groups with countTowardMetric: true */
  addedLines: number;
  /** Lines removed from groups with countTowardMetric: true */
  removedLines: number;
  /** Lines added from groups with countTowardMetric: false */
  uncountedAddedLines: number;
  /** Lines removed from groups with countTowardMetric: false */
  uncountedRemovedLines: number;
  /** Total number of files across all groups */
  totalFiles: number;
  /** Files organized by group (default group first, then defined groups in order) */
  groupedFiles: GroupedFiles[];
}
