import { useParams } from 'react-router'
import { BillingSettings } from '@/components/billing/billing-settings'

/**
 * The billing of an organization: the plan, the usage and the invoices.
 */
export default function BillingPage() {
  const { orgSlug = '' } = useParams()

  return <BillingSettings orgSlug={orgSlug} />
}
