import { minimatch } from 'minimatch';
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
 * @returns Summary with files organized by group and aggregated metrics
 */
export function calculateDiffSummary(
  files: FileChange[],
  config: FileGroupsConfig
): DiffSummary {
  // Initialize a map to track files for each group
  const groupFilesMap = new Map<FileGroup | DefaultGroupConfig, FileChange[]>();

  // Initialize all groups with empty arrays
  for (const group of config.groups) {
    groupFilesMap.set(group, []);
  }
  groupFilesMap.set(config.defaultGroup, []);

  // Track which files have been assigned
  const assignedFiles = new Set<string>();

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
        assignedFiles.add(file.filename);
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
  const groupedFiles: GroupedFiles[] = [];
  let addedLines = 0;
  let removedLines = 0;
  let uncountedAddedLines = 0;
  let uncountedRemovedLines = 0;

  // Process defined groups first (in order)
  for (const group of config.groups) {
    const groupFiles = groupFilesMap.get(group)!;
    if (groupFiles.length === 0) {
      continue; // Skip empty groups
    }

    const groupAddedLines = groupFiles.reduce((sum, f) => sum + f.additions, 0);
    const groupRemovedLines = groupFiles.reduce(
      (sum, f) => sum + f.deletions,
      0
    );

    groupedFiles.push({
      group,
      files: groupFiles,
      addedLines: groupAddedLines,
      removedLines: groupRemovedLines,
    });

    if (group.countTowardMetric) {
      addedLines += groupAddedLines;
      removedLines += groupRemovedLines;
    } else {
      uncountedAddedLines += groupAddedLines;
      uncountedRemovedLines += groupRemovedLines;
    }
  }

  // Process default group last
  const defaultGroupFiles = groupFilesMap.get(config.defaultGroup)!;
  if (defaultGroupFiles.length > 0) {
    const defaultAddedLines = defaultGroupFiles.reduce(
      (sum, f) => sum + f.additions,
      0
    );
    const defaultRemovedLines = defaultGroupFiles.reduce(
      (sum, f) => sum + f.deletions,
      0
    );

    groupedFiles.push({
      group: config.defaultGroup,
      files: defaultGroupFiles,
      addedLines: defaultAddedLines,
      removedLines: defaultRemovedLines,
    });

    if (config.defaultGroup.countTowardMetric) {
      addedLines += defaultAddedLines;
      removedLines += defaultRemovedLines;
    } else {
      uncountedAddedLines += defaultAddedLines;
      uncountedRemovedLines += defaultRemovedLines;
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
