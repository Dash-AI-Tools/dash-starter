import assert from 'node:assert/strict'
import test from 'node:test'

import { readInstallerVersion, readManifest } from '../src/manifest.js'

test('the installer and the template have the same version', async () => {
  const manifest = await readManifest()
  const version = await readInstallerVersion()

  assert.equal(
    version,
    manifest.version,
    'the installer downloads the release of the template that matches its version'
  )
})
