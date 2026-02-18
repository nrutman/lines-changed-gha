export function generateDiffSquares(
  additions: number,
  deletions: number
): string {
  const total = additions + deletions;

  if (total === 0) {
    return '▫▫▫▫▫';
  }

  const greenRatio = additions / total;
  const greenSquares = Math.round(greenRatio * 5);
  const redSquares = 5 - greenSquares;

  return '🟩'.repeat(greenSquares) + '🟥'.repeat(redSquares);
}
