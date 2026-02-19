import * as yaml from 'js-yaml';
import type { DefaultGroupConfig, FileGroup, FileGroupsConfig } from './types';

/**
 * Parses the file-groups YAML input into a structured configuration.
 *
 * @param fileGroupsYaml - YAML string defining file groups
 * @param defaultGroupLabel - Label for the default group
 * @returns Parsed file groups configuration
 * @throws Error if YAML is invalid or group definitions are malformed
 */
export function parseFileGroups(
  fileGroupsYaml: string,
  defaultGroupLabel: string
): FileGroupsConfig {
  const defaultGroup: DefaultGroupConfig = {
    label: defaultGroupLabel || 'Changed',
    countTowardMetric: true,
  };

  // If no groups defined, return config with just the default group
  if (!fileGroupsYaml || fileGroupsYaml.trim() === '') {
    return {
      groups: [],
      defaultGroup,
    };
  }

  // Parse YAML
  let parsed: unknown;
  try {
    parsed = yaml.load(fileGroupsYaml);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    throw new Error(`Invalid YAML in file-groups input: ${message}`);
  }

  // Validate parsed structure is an array
  if (!Array.isArray(parsed)) {
    throw new Error(
      'file-groups must be a YAML array of group definitions. Example:\n' +
        '- label: "Source"\n' +
        '  patterns:\n' +
        '    - "src/**/*.ts"\n' +
        '  count: true'
    );
  }

  // Parse each group definition
  const groups: FileGroup[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const raw = parsed[i] as RawGroupDefinition;
    const groupNum = i + 1;

    // Validate label
    if (typeof raw.label !== 'string' || raw.label.trim() === '') {
      throw new Error(
        `Group ${groupNum}: 'label' is required and must be a non-empty string`
      );
    }

    // Validate patterns
    if (!Array.isArray(raw.patterns) || raw.patterns.length === 0) {
      throw new Error(
        `Group ${groupNum} ("${raw.label}"): 'patterns' is required and must be a non-empty array of glob patterns`
      );
    }

    const patterns: string[] = [];
    for (let j = 0; j < raw.patterns.length; j++) {
      const pattern = raw.patterns[j];
      if (typeof pattern !== 'string' || pattern.trim() === '') {
        throw new Error(
          `Group ${groupNum} ("${raw.label}"): pattern at index ${j} must be a non-empty string`
        );
      }
      patterns.push(pattern.trim());
    }

    // Validate count (defaults to true if not specified)
    let countTowardMetric = true;
    if (raw.count !== undefined) {
      if (typeof raw.count !== 'boolean') {
        throw new Error(
          `Group ${groupNum} ("${raw.label}"): 'count' must be a boolean (true or false)`
        );
      }
      countTowardMetric = raw.count;
    }

    // Validate ignore-whitespace (defaults to false if not specified)
    let ignoreWhitespace = false;
    if (raw['ignore-whitespace'] !== undefined) {
      if (typeof raw['ignore-whitespace'] !== 'boolean') {
        throw new Error(
          `Group ${groupNum} ("${raw.label}"): 'ignore-whitespace' must be a boolean (true or false)`
        );
      }
      ignoreWhitespace = raw['ignore-whitespace'];
    }

    groups.push({
      label: raw.label.trim(),
      patterns,
      countTowardMetric,
      ignoreWhitespace,
    });
  }

  return {
    groups,
    defaultGroup,
  };
}

// Private types

/**
 * Raw group definition from YAML input
 */
interface RawGroupDefinition {
  label?: unknown;
  patterns?: unknown;
  count?: unknown;
  'ignore-whitespace'?: unknown;
}
