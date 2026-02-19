import { minimatch } from 'minimatch';
import type { GitLineCounts } from './getGitWhitespaceDiff';
import type {
  DefaultGroupConfig,
  DiffSummary,
  FileChange,
  FileGroup,
  FileGroupsConfig,
  GroupedFiles,
} from './types';

/**
 * Calculates a diff summary by grouping files according to the provided configuration.
 *
 * Files are processed against groups in order - the first matching group wins.
 * Files that don't match any group are placed in the default group.
 *
 * @param files - Array of file changes from the GitHub API
 * @param config - File groups configuration
 * @param whitespaceAdjustedCounts - Optional map of filename to whitespace-adjusted line counts from git diff -w
 * @returns Summary with files organized by group and aggregated metrics
 */
export function calculateDiffSummary(
  files: FileChange[],
  config: FileGroupsConfig,
  whitespaceAdjustedCounts?: Map<string, GitLineCounts> | null
): DiffSummary {
  // Initialize a map to track files for each group
  const groupFilesMap = new Map<FileGroup | DefaultGroupConfig, FileChange[]>();

  // Initialize all groups with empty arrays
  for (const group of config.groups) {
    groupFilesMap.set(group, []);
  }
  groupFilesMap.set(config.defaultGroup, []);

  // Process each file against groups in order
  for (const file of files) {
    let matched = false;

    // Try each group in order
    for (const group of config.groups) {
      // Check if file matches any pattern in this group
      const matches = group.patterns.some(pattern =>
        minimatch(file.filename, pattern, { dot: true })
      );

      if (matches) {
        groupFilesMap.get(group)!.push(file);
        matched = true;
        break; // First match wins, don't check other groups
      }
    }

    // If no group matched, add to default group
    if (!matched) {
      groupFilesMap.get(config.defaultGroup)!.push(file);
    }
  }

  // Build grouped files results
  // Default group is rendered first, then defined groups in order
  const groupedFiles: GroupedFiles[] = [];
  let addedLines = 0;
  let removedLines = 0;
  let uncountedAddedLines = 0;
  let uncountedRemovedLines = 0;

  // Process default group first (always rendered at top)
  const defaultGroupFiles = groupFilesMap.get(config.defaultGroup)!;
  if (defaultGroupFiles.length > 0) {
    const {
      added: defaultAddedLines,
      removed: defaultRemovedLines,
      rawAdded: defaultRawAdded,
      rawRemoved: defaultRawRemoved,
    } = aggregateGroupLines(
      defaultGroupFiles,
      config.defaultGroup.ignoreWhitespace,
      whitespaceAdjustedCounts
    );

    const defaultEntry: GroupedFiles = {
      group: config.defaultGroup,
      files: defaultGroupFiles,
      addedLines: defaultAddedLines,
      removedLines: defaultRemovedLines,
    };

    if (config.defaultGroup.ignoreWhitespace && whitespaceAdjustedCounts) {
      const wsAdded = defaultRawAdded - defaultAddedLines;
      const wsRemoved = defaultRawRemoved - defaultRemovedLines;
      if (wsAdded > 0 || wsRemoved > 0) {
        defaultEntry.whitespaceOnlyAddedLines = wsAdded;
        defaultEntry.whitespaceOnlyRemovedLines = wsRemoved;
      }
    }

    groupedFiles.push(defaultEntry);

    // Default group always counts toward the metric
    addedLines += defaultAddedLines;
    removedLines += defaultRemovedLines;
  }

  // Process defined groups in order
  for (const group of config.groups) {
    const groupFiles = groupFilesMap.get(group)!;
    if (groupFiles.length === 0) {
      continue; // Skip empty groups
    }

    const {
      added: groupAddedLines,
      removed: groupRemovedLines,
      rawAdded,
      rawRemoved,
    } = aggregateGroupLines(
      groupFiles,
      group.ignoreWhitespace,
      whitespaceAdjustedCounts
    );

    const groupEntry: GroupedFiles = {
      group,
      files: groupFiles,
      addedLines: groupAddedLines,
      removedLines: groupRemovedLines,
    };

    if (group.ignoreWhitespace && whitespaceAdjustedCounts) {
      const wsAdded = rawAdded - groupAddedLines;
      const wsRemoved = rawRemoved - groupRemovedLines;
      if (wsAdded > 0 || wsRemoved > 0) {
        groupEntry.whitespaceOnlyAddedLines = wsAdded;
        groupEntry.whitespaceOnlyRemovedLines = wsRemoved;
      }
    }

    groupedFiles.push(groupEntry);

    if (group.countTowardMetric) {
      addedLines += groupAddedLines;
      removedLines += groupRemovedLines;
    } else {
      uncountedAddedLines += groupAddedLines;
      uncountedRemovedLines += groupRemovedLines;
    }
  }

  return {
    addedLines,
    removedLines,
    uncountedAddedLines,
    uncountedRemovedLines,
    totalFiles: files.length,
    groupedFiles,
  };
}

/**
 * Aggregates line counts for a group's files, using whitespace-adjusted counts
 * when the group has ignoreWhitespace enabled and adjusted counts are available.
 * Also returns raw (unadjusted) totals for computing whitespace-only deltas.
 */
function aggregateGroupLines(
  files: FileChange[],
  ignoreWhitespace: boolean,
  whitespaceAdjustedCounts?: Map<string, GitLineCounts> | null
): { added: number; removed: number; rawAdded: number; rawRemoved: number } {
  let added = 0;
  let removed = 0;
  let rawAdded = 0;
  let rawRemoved = 0;

  for (const file of files) {
    rawAdded += file.additions;
    rawRemoved += file.deletions;

    const adjusted =
      ignoreWhitespace && whitespaceAdjustedCounts
        ? whitespaceAdjustedCounts.get(file.filename)
        : undefined;

    added += adjusted ? adjusted.additions : file.additions;
    removed += adjusted ? adjusted.deletions : file.deletions;
  }

  return { added, removed, rawAdded, rawRemoved };
}
