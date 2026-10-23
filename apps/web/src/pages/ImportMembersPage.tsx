import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PageHeader } from '@/components/patterns/page-header'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FileUpload,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dash/ui'
import { toApiFailure } from '@/lib/api-error'
import { useBulkImport } from '@/lib/imports'
import { useI18n } from '@/lib/i18n'
import { canManage, useOrganization } from '@/lib/organizations'

/** The largest file the API accepts. */
const MAX_BYTES = 1024 * 1024

export default function ImportMembersPage() {
  const { orgSlug = '' } = useParams()
  const { t } = useI18n()
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const mutation = useBulkImport(orgSlug)
  const { data: organization } = useOrganization(orgSlug)

  /**
   * The file is checked here for a fast answer; the API checks it again.
   */
  async function submit(event: React.FormEvent) {
    event.preventDefault()

    const file = files[0]
    if (!file) return

    setError('')

    if (file.size > MAX_BYTES) {
      setError(t('importTooLarge'))
      return
    }

    try {
      await mutation.mutateAsync(file)
    } catch (failure) {
      const reason = toApiFailure(failure)
      setError(reason.error.errors[0]?.message || reason.error.message || t('importFailed'))
    }
  }

  if (organization && !canManage(organization.role)) {
    return <p className="p-6 text-sm text-muted-foreground">{t('noPermission')}</p>
  }

  const result = mutation.data

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <PageHeader
        title={t('importTitle')}
        description={t('importDescription')}
        actions={
          <Button variant="outline" render={<Link to={`/app/${orgSlug}/members`} />}>
            {t('membersTitle')}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('importFile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FileUpload
              name="file"
              accept=".csv,text/csv"
              label={t('importChoose')}
              hint={t('importHint')}
              onFilesChange={setFiles}
            />

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={files.length === 0 || mutation.isPending}>
              {mutation.isPending ? t('importUploading') : t('importSubmit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.state === 'failed'
                ? t('importFailed')
                : t('importDone', { imported: result.importedRows, total: result.totalRows })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.errors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('importNoErrors')}</p>
            ) : (
              <>
                <h3 className="text-sm font-medium">{t('importErrors')}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('importLine')}</TableHead>
                      <TableHead>{t('importEmail')}</TableHead>
                      <TableHead>{t('importReason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((row) => (
                      <TableRow key={row.line}>
                        <TableCell>{row.line}</TableCell>
                        <TableCell>{row.email ?? '—'}</TableCell>
                        <TableCell>{row.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
