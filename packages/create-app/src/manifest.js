import { readFile } from 'node:fs/promises'

/**
 * The manifest of the template travels with the installer, so the installer
 * knows the defaults of the identity and the tokens of the template before it
 * downloads anything.
 */
const MANIFEST_URL = new URL('../template.json', import.meta.url)

/**
 * Reads the manifest of the template.
 */
export async function readManifest(path = MANIFEST_URL) {
  return JSON.parse(await readFile(path, 'utf8'))
}

/**
 * Reads the version of the installer, which is the version of the template it
 * installs: the release of the template that matches the version of the
 * installer.
 */
export async function readInstallerVersion(path = new URL('../package.json', import.meta.url)) {
  const { version } = JSON.parse(await readFile(path, 'utf8'))

  return version
}
