import assert from 'node:assert/strict'
import { resolvePrimaryLangOnBootstrap } from './primaryLanguagePref.ts'

// Guest / no server pref keeps local.
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: false,
    serverPrimary: 'yue',
    localPrimary: 'cmn',
    syncedPrimary: null,
  }),
  { primary: 'cmn', needsServerPush: false, adoptServer: false },
)

// Matching local + server heals without a push.
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: true,
    serverPrimary: 'es',
    localPrimary: 'es',
    syncedPrimary: null,
  }),
  { primary: 'es', needsServerPush: false, adoptServer: false },
)

// Henry's bug: chose Mandarin, PATCH killed / failed, profile still yue → keep local + retry.
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: true,
    serverPrimary: 'yue',
    localPrimary: 'cmn',
    syncedPrimary: null,
  }),
  { primary: 'cmn', needsServerPush: true, adoptServer: false },
)

// Explicit unsynced write (synced stamp lags local).
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: true,
    serverPrimary: 'yue',
    localPrimary: 'vi',
    syncedPrimary: 'yue',
  }),
  { primary: 'vi', needsServerPush: true, adoptServer: false },
)

// Fresh device / default local adopts server (cross-device).
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: true,
    serverPrimary: 'tl',
    localPrimary: 'yue',
    syncedPrimary: null,
  }),
  { primary: 'tl', needsServerPush: false, adoptServer: true },
)

// Synced device trusts a newer server value.
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: true,
    serverPrimary: 'eses',
    localPrimary: 'cmn',
    syncedPrimary: 'cmn',
  }),
  { primary: 'eses', needsServerPush: false, adoptServer: true },
)

// English primary must round-trip through resolve (DB migration 038).
assert.deepEqual(
  resolvePrimaryLangOnBootstrap({
    loggedIn: true,
    serverPrimary: 'yue',
    localPrimary: 'en',
    syncedPrimary: 'yue',
  }),
  { primary: 'en', needsServerPush: true, adoptServer: false },
)

console.log('primaryLanguagePref.smoke: ok')
