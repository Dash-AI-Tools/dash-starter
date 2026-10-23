import type BulkImport from '#models/bulk_import'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class BulkImportTransformer extends BaseTransformer<BulkImport> {
  toObject() {
    const record = this.resource

    return {
      id: record.id,
      fileName: record.fileName,
      state: record.state,
      totalRows: record.totalRows,
      importedRows: record.importedRows,
      errors: record.errors ?? [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}
