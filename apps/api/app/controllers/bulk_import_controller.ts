import { E_BULK_IMPORT_NOT_FOUND } from '#exceptions/errors'
import BulkImport from '#models/bulk_import'
import { importMembers } from '#services/bulk_imports'
import { consumeImportBudget } from '#services/rate_limits'
import BulkImportTransformer from '#transformers/bulk_import_transformer'
import { assertBulkImportFile } from '#validators/bulk_import'
import type { HttpContext } from '@adonisjs/core/http'

export default class BulkImportController {
  /**
   * Imports a CSV of addresses as invitations. The file is read in the
   * request and never stored; every row that fails is reported with its line
   * and the reason.
   */
  async store(ctx: HttpContext) {
    const { request, auth, organization, membership, bouncer, response, serialize, i18n } = ctx

    await bouncer.authorize('manageInvitations', membership)

    const file = assertBulkImportFile(request.file('file'), i18n)

    await consumeImportBudget(organization.id)

    const record = await importMembers(organization, auth.getUserOrFail(), file, i18n)

    response.status(201)

    return serialize.withoutWrapping({
      import: BulkImportTransformer.transform(record),
    })
  }

  /**
   * The state of an import of the organization. An import of another
   * organization is not found, so the request never reveals it.
   */
  async show({ params, organization, membership, bouncer, serialize }: HttpContext) {
    await bouncer.authorize('manageInvitations', membership)

    const id = Number(params.id)

    const record = Number.isInteger(id)
      ? await BulkImport.query().where('organizationId', organization.id).where('id', id).first()
      : null

    if (!record) {
      throw new E_BULK_IMPORT_NOT_FOUND()
    }

    return serialize.withoutWrapping({
      import: BulkImportTransformer.transform(record),
    })
  }
}
