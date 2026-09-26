import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const hook = readFileSync(join(here, 'usePointerGlow.ts'), 'utf8')
const css = readFileSync(join(here, 'pointerGlow.css'), 'utf8')
const bento = readFileSync(join(here, 'HomeFeaturesBento.tsx'), 'utf8')
const duo = readFileSync(join(here, 'HomePricingDuo.tsx'), 'utf8')
const pricing = readFileSync(join(here, 'PricingPage.tsx'), 'utf8')

assert.match(hook, /pointerType === 'touch'/, 'Pointer glow skips touch so iPhone scroll stays clean')
assert.match(css, /--glow-x/, 'Glare follows CSS pointer vars')
assert.match(css, /mask-composite: exclude/, 'Jade edge is a 1px glowing rim, not a fill')
assert.match(css, /prefers-reduced-motion: reduce/, 'Reduced motion keeps cards still')
assert.match(bento, /usePointerGlowScope/, 'Feature bento hosts the glow scope')
assert.match(bento, /PointerGlowLayers/, 'Feature tiles get glare layers')
assert.match(duo, /ln-pointer-glow/, 'Homepage pricing cards get glare')
assert.match(pricing, /ln-pointer-glow/, 'Pricing page cards get glare')
assert.doesNotMatch(hook, /tailwind|@\/components\/ui/, 'No Tailwind / shadcn import')

console.log('pointerGlow.smoke: ok')
