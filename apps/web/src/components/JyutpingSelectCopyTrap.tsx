import { useJyutpingSelectCopyTrap } from '../lib/useJyutpingSelectCopyTrap'

/** Mount once under App — installs the Jyutping select/copy gotcha listener. */
export function JyutpingSelectCopyTrap() {
  useJyutpingSelectCopyTrap()
  return null
}
