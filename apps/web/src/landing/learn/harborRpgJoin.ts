/**
 * HarborRPG lobby. Teleport does not enter the world until a character exists
 * and the sailor confirms. Process only — Harbor copy and kits, not another game's chrome.
 */
export type HarborRpgJoinPhase = 'create' | 'select'

export function harborRpgJoinPhase(characterCount: number): HarborRpgJoinPhase {
  return characterCount > 0 ? 'select' : 'create'
}
