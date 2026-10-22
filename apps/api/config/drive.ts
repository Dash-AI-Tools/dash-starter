import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * File storage. The avatars and the images of the organizations live in the
 * disk, and the API serves them under `/api/uploads`, so the web app and the
 * API share the same origin and the images need no CORS.
 *
 * shortcut: only the local disk is registered. The S3-compatible disk of the
 * design needs the driver that talks to it (`@aws-sdk/client-s3` and
 * `@aws-sdk/s3-request-presigner`), so it is added when a deployment stores
 * the images outside of the machine: register the disk of `services.s3()` here
 * with the `S3_*` variables of the environment, add the driver to the API and
 * widen the `DRIVE_DISK` of `start/env.ts`. The environment refuses any other
 * disk, so a deployment never writes to the local disk by mistake.
 */
const driveConfig = defineConfig({
  default: 'local',

  services: {
    local: services.fs({
      location: env.get('DRIVE_ROOT') ?? app.makePath('storage'),
      visibility: 'public',
      serveFiles: true,
      routeBasePath: '/api/uploads',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
