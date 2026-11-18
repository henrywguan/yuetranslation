import { useEffect, useState } from 'react'

/** Match Jyut theme (`data-theme`) / OS preference for stock `.dark` tokens. */
export function useAuiStockDark(): boolean {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const read = () => {
      const t = document.documentElement.getAttribute('data-theme')
      if (t === 'dark') return true
      if (t === 'light') return false
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    const apply = () => setDark(read())
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    const obs = new MutationObserver(apply)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', apply)
      obs.disconnect()
    }
  }, [])

  return dark
}
