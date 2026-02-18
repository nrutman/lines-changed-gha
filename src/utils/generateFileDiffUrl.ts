import { createHash } from 'crypto';

/**
 * Generates a URL to a specific file's diff in a GitHub PR.
 *
 * Note: GitHub uses MD5 hashes of filenames to create anchor IDs for file diffs.
 * This is based on observed behavior and is not officially documented.
 * If GitHub changes their anchor format, these links may stop working.
 * The links will still navigate to the PR files page, just not to the specific file.
 */
export function generateFileDiffUrl(
  owner: string,
  repo: string,
  prNumber: number,
  filename: string
): string {
  const hash = createHash('md5').update(filename).digest('hex');
  const anchor = `diff-${hash.substring(0, 16)}`;
  return `https://github.com/${owner}/${repo}/pull/${prNumber}/files#${anchor}`;
}
