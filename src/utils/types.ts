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
}

/**
 * Configuration for the default group (files not matching any other group)
 */
export interface DefaultGroupConfig {
  /** Display label for the default group */
  label: string;
  /** Whether files in the default group count toward the main +/- metric */
  countTowardMetric: boolean;
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
  /** Files organized by group (in group processing order, default group last) */
  groupedFiles: GroupedFiles[];
}
