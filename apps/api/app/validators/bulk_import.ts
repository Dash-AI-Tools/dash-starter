import type { MultipartFile } from '@adonisjs/bodyparser/types'
import type { I18n } from '@adonisjs/i18n'
import { errors as VineErrors } from '@vinejs/vine'

/**
 * The largest file an import accepts.
 */
export const MAX_IMPORT_BYTES = 1024 * 1024

/**
 * Refuses an upload that is missing, is not a CSV or is too large, before
 * anything is recorded. The number of rows needs the content, so it is
 * checked by the service.
 */
export function assertBulkImportFile(file: MultipartFile | null, i18n: I18n): MultipartFile {
  if (!file || !file.tmpPath) {
    throw rejected('file', i18n.t('organizations.import_file_missing'), 'import_file_missing')
  }

  if (file.extname?.toLowerCase() !== 'csv') {
    throw rejected('file', i18n.t('organizations.import_file_type'), 'import_file_type')
  }

  if (file.size > MAX_IMPORT_BYTES) {
    throw rejected('file', i18n.t('organizations.import_file_too_large'), 'import_file_too_large')
  }

  return file
}

/**
 * A validation error shaped like the ones of the body validators, so the
 * client handles every rejected field the same way.
 */
export function rejected(field: string, message: string, rule: string) {
  return new VineErrors.E_VALIDATION_ERROR([{ field, message, rule }])
}
