import { createHash } from 'crypto';

/**
 * Generates a URL to a specific file's diff in a GitHub PR.
 * GitHub uses SHA-256 hashes of filenames for diff anchor IDs.
 */
export function generateFileDiffUrl(
  owner: string,
  repo: string,
  prNumber: number,
  filename: string
): string {
  const hash = createHash('sha256').update(filename).digest('hex');
  return `https://github.com/${owner}/${repo}/pull/${prNumber}/files#diff-${hash}`;
}
