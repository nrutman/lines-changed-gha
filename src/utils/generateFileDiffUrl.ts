import { createHash } from 'crypto';

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
