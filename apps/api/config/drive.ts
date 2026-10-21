import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * File storage. The avatars and the images of the organizations live in the
 * disk, and the API serves them under `/api/uploads`, so the web app and the
 * API share the same origin and the images need no CORS.
 *
 * shortcut: the S3 disk arrives with the image storage group (12.3), together
 * with the dependency that talks to it. Until then the local disk is the only
 * one registered.
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
