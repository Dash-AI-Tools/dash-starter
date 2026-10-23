import { readFile } from 'node:fs/promises'
import BulkImport, { type ImportRowError } from '#models/bulk_import'
import type { Role } from '#models/membership'
import type Organization from '#models/organization'
import type User from '#models/user'
import { inviteMember } from '#services/invitations'
import { rejected } from '#validators/bulk_import'
import type { MultipartFile } from '@adonisjs/bodyparser/types'
import type { I18n } from '@adonisjs/i18n'

/**
 * The number of rows an import accepts, header excluded.
 */
export const MAX_IMPORT_ROWS = 500

const ROLES: Role[] = ['owner', 'admin', 'member']

/**
 * A pragmatic check of an address. The invitation validator checks it again
 * with the full rule, so this only skips the rows that cannot be an address
 * before they reach the database.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type CsvRow = {
  line: number
  cells: string[]
}

/**
 * Reads the CSV of an import, creates the record and invites every row.
 *
 * A row that cannot be invited does not abort the file: the line and the
 * reason are collected, the rest of the rows are still invited, and the
 * import ends in the state `done` with the counts and the errors.
 */
export async function importMembers(
  organization: Organization,
  inviter: User,
  file: MultipartFile,
  i18n: I18n
): Promise<BulkImport> {
  const text = await readFile(file.tmpPath!, 'utf8')
  const { rows, columns, emailIndex, roleIndex } = parseCsv(text, i18n)

  if (rows.length > MAX_IMPORT_ROWS) {
    throw rejected('file', i18n.t('organizations.import_too_many_rows'), 'import_too_many_rows')
  }

  const record = await BulkImport.create({
    organizationId: organization.id,
    fileName: file.clientName,
    state: 'pending',
    totalRows: rows.length,
  })

  record.state = 'running'
  await record.save()

  const errors: ImportRowError[] = []
  let importedRows = 0

  for (const row of rows) {
    if (row.cells.length > columns) {
      errors.push({
        line: row.line,
        email: null,
        reason: i18n.t('organizations.import_too_many_columns'),
      })
      continue
    }

    const email = (row.cells[emailIndex] ?? '').trim().toLowerCase()
    const rawRole = roleIndex === -1 ? '' : (row.cells[roleIndex] ?? '').trim().toLowerCase()
    const role = (rawRole || 'member') as Role

    if (!email) {
      errors.push({
        line: row.line,
        email: null,
        reason: i18n.t('organizations.import_email_missing'),
      })
      continue
    }

    if (!EMAIL.test(email)) {
      errors.push({
        line: row.line,
        email,
        reason: i18n.t('organizations.import_invalid_email', { email }),
      })
      continue
    }

    if (!ROLES.includes(role)) {
      errors.push({
        line: row.line,
        email,
        reason: i18n.t('organizations.import_invalid_role', { role: rawRole }),
      })
      continue
    }

    try {
      await inviteMember(organization, inviter, email, role, i18n)
      importedRows++
    } catch (error) {
      errors.push({ line: row.line, email, reason: reasonOf(error, i18n) })
    }
  }

  record.state = 'done'
  record.importedRows = importedRows
  /**
   * The driver sends a JavaScript array as a PostgreSQL array, which the
   * jsonb column refuses. The JSON text is parsed back by the driver on the
   * next read.
   */
  record.errors = (errors.length > 0 ? JSON.stringify(errors) : null) as unknown as
    ImportRowError[] | null
  await record.save()
  record.errors = errors.length > 0 ? errors : null

  return record
}

/**
 * The header of the file names the columns; `email` is required and `role`
 * is optional. Every non-empty line after it is a row.
 */
function parseCsv(text: string, i18n: I18n) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const entries: CsvRow[] = []

  lines.forEach((raw, index) => {
    const cells = splitLine(raw)
    if (cells.some((cell) => cell !== '')) {
      entries.push({ line: index + 1, cells })
    }
  })

  const header = entries.shift()

  if (!header) {
    throw rejected('file', i18n.t('organizations.import_empty'), 'import_empty')
  }

  const emailIndex = header.cells.findIndex((cell) => cell.toLowerCase() === 'email')

  if (emailIndex === -1) {
    throw rejected('file', i18n.t('organizations.import_header_missing'), 'import_header_missing')
  }

  const roleIndex = header.cells.findIndex((cell) => cell.toLowerCase() === 'role')

  if (entries.length === 0) {
    throw rejected('file', i18n.t('organizations.import_empty'), 'import_empty')
  }

  /**
   * A row with more cells than the header is malformed, and the loop of the
   * import reports it with its line. A row with fewer is accepted when the
   * missing column is the optional `role`.
   */
  return { rows: entries, columns: header.cells.length, emailIndex, roleIndex }
}

/**
 * Splits one line of a CSV, so a quoted address with a comma still works.
 */
function splitLine(line: string): string[] {
  const cells: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index++) {
    const character = line[index]

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index++
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  cells.push(value.trim())

  return cells
}

/**
 * The message of a failed row: the one of the invitation service when it is
 * a validation error, the localized seat message when the plan is full, and
 * a generic one for anything else.
 */
function reasonOf(error: unknown, i18n: I18n): string {
  const coded = error as { code?: string; messages?: { message: string }[] }

  if (coded?.code === 'E_SEAT_LIMIT_REACHED') {
    return i18n.t('errors.seat_limit_reached')
  }

  if (coded?.code === 'E_VALIDATION_ERROR') {
    const message = coded.messages?.[0]?.message

    if (message) {
      return message
    }
  }

  return i18n.t('organizations.import_row_failed')
}
