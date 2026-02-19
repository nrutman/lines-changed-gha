export { calculateDiffSummary } from './calculateDiffSummary';
export { COMMENT_IDENTIFIER } from './constants';
export { generateCommentBody } from './generateCommentBody';
export { generateDiffSquares } from './generateDiffSquares';
export { generateFileDiffUrl } from './generateFileDiffUrl';
export { getGitWhitespaceDiff, parseGitNumstat } from './getGitWhitespaceDiff';
export type { GitLineCounts } from './getGitWhitespaceDiff';
export { parseFileGroups } from './parseFileGroups';
export { isFileGroup } from './types';
export type {
  DefaultGroupConfig,
  DiffSummary,
  FileChange,
  FileGroup,
  FileGroupsConfig,
  GroupedFiles,
} from './types';
export { validateGlobPatterns } from './validateGlobPatterns';
