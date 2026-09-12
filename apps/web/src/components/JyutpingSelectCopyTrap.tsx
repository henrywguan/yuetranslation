import { useJyutpingSelectCopyTrap } from '../lib/useJyutpingSelectCopyTrap'

/** Mount once under App — installs the Jyutping select/copy upgrade gate. */
export function JyutpingSelectCopyTrap() {
  useJyutpingSelectCopyTrap()
  return null
}
