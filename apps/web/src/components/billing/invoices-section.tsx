import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dash/ui'
import { EmptyState } from '@/components/patterns/empty-state'
import { useInvoices } from '@/lib/billing'
import { useI18n } from '@/lib/i18n'

/**
 * The invoices of an organization, newest first: the plan, the amount, the
 * state and the date of every paid or failed period, in the language of the
 * interface.
 */
export function InvoicesSection({
  orgSlug,
  enabled = true,
}: {
  orgSlug: string
  /** Whether the viewer can read the billing, so the invoices are queried. */
  enabled?: boolean
}) {
  const { t, formatDate, formatCurrency } = useI18n()
  const { data: invoices, isPending, isError } = useInvoices(orgSlug, { enabled })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('invoicesTitle')}</CardTitle>
        <CardDescription>{t('invoicesDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('unknownError')}</p>
        ) : invoices.length === 0 ? (
          <EmptyState title={t('invoicesEmpty')} description={t('invoicesEmptyBody')} />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoicesPlan')}</TableHead>
                  <TableHead>{t('invoicesAmount')}</TableHead>
                  <TableHead>{t('invoicesState')}</TableHead>
                  <TableHead>{t('invoicesDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.plan}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                    <TableCell>
                      {invoice.state === 'paid' ? (
                        <Badge variant="secondary">{t('invoicePaid')}</Badge>
                      ) : (
                        <Badge variant="destructive">{t('invoiceFailed')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.createdAt ? formatDate(invoice.createdAt) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
