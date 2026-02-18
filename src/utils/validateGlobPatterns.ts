import { minimatch } from 'minimatch';

/**
 * Validates an array of glob patterns and returns any errors found.
 * Returns an empty array if all patterns are valid.
 */
export function validateGlobPatterns(patterns: string[]): string[] {
  const errors: string[] = [];

  for (const pattern of patterns) {
    try {
      // Attempt to create a minimatch pattern - this will catch syntax errors
      new minimatch.Minimatch(pattern, { dot: true });

      // Check for common mistakes
      if (pattern.includes('\\') && process.platform !== 'win32') {
        errors.push(
          `"${pattern}" contains backslashes - use forward slashes for glob patterns`
        );
      }

      if (pattern.startsWith('/')) {
        errors.push(
          `"${pattern}" starts with / - glob patterns should be relative`
        );
      }
    } catch (e) {
      errors.push(
        `"${pattern}" is not a valid glob pattern: ${e instanceof Error ? e.message : 'unknown error'}`
      );
    }
  }

  return errors;
}
