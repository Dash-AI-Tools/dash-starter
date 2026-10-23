import { BulkImportSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

/**
 * The states of an import, in the order it goes through them.
 */
export type ImportState = 'pending' | 'running' | 'done' | 'failed'

/**
 * A row the import could not create, with the line of the file it came from.
 */
export type ImportRowError = {
  line: number
  email: string | null
  reason: string
}

export default class BulkImport extends BulkImportSchema {
  declare state: ImportState
  declare errors: ImportRowError[] | null

  /**
   * The organization the import belongs to.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
