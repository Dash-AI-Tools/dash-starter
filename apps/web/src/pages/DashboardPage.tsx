import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { AreaChartCard, type ChartDatum } from '@/components/patterns/charts'
import { PageHeader } from '@/components/patterns/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'
import { canAccess, orgPath } from '@/lib/nav'
import { useConversations } from '@/lib/chat'
import { useBilling } from '@/lib/billing'
import { useMembers, useOrganization } from '@/lib/organizations'
import { useCurrentUser } from '@/lib/session'

/**
 * The numbers of the cards and the chart are examples, so the dashboard can
 * be replaced by the real metrics of the product.
 */
const KPI = {
  members: 12,
  aiCredits: 1240,
  mcpCalls: 320,
  seats: 2,
}

const USAGE: ChartDatum[] = [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 58 },
  { label: 'Wed', value: 51 },
  { label: 'Thu', value: 73 },
  { label: 'Fri', value: 66 },
  { label: 'Sat', value: 24 },
  { label: 'Sun', value: 31 },
]

const ACTIVITY = [
  { who: 'Ada Lovelace', what: 'joined the organization', when: '2026-01-08T09:12:00.000Z' },
  { who: 'Grace Hopper', what: 'created an API key', when: '2026-01-07T16:40:00.000Z' },
  { who: 'Alan Turing', what: 'sent an invitation', when: '2026-01-07T11:05:00.000Z' },
  { who: 'Ada Lovelace', what: 'changed the plan', when: '2026-01-06T18:22:00.000Z' },
]

/**
 * The home of an organization: the numbers of the workspace, the usage of
 * the last days, the latest activity and the steps that are left to finish
 * the setup.
 */
export default function DashboardPage() {
  const { t } = useI18n()
  const { orgSlug = '' } = useParams()
  const { data: organization } = useOrganization(orgSlug)
  const { data: members = [] } = useMembers(orgSlug)
  const { data: user } = useCurrentUser()
  const { data: conversations = [] } = useConversations(orgSlug)

  /**
   * The billing belongs to the admins, so the plan of the organization is only
   * read for the roles that can reach the billing page.
   */
  const managesBilling = canAccess(organization?.role, 'admin')
  const { data: billing } = useBilling(orgSlug, { enabled: managesBilling })

  /**
   * The steps of the setup, with the ones that are already done ticked.
   */
  const checklist = useMemo(
    () =>
      [
        {
          id: 'invite',
          label: t('checklistInvite'),
          hint: t('checklistInviteHint'),
          to: orgPath(orgSlug, 'members'),
          done: members.length > 1,
        },
        {
          id: 'chat',
          label: t('checklistChat'),
          hint: t('checklistChatHint'),
          to: orgPath(orgSlug, 'chat'),
          done: conversations.length > 0,
        },
        {
          id: 'plan',
          label: t('checklistPlan'),
          hint: t('checklistPlanHint'),
          to: orgPath(orgSlug, 'settings/billing'),
          /**
           * The plan is only read by the roles that manage the billing, so
           * the step is left for the others.
           */
          done: !!billing && billing.plan.key !== 'free',
        },
        {
          id: 'profile',
          label: t('checklistProfile'),
          hint: t('checklistProfileHint'),
          to: orgPath(orgSlug, 'profile'),
          done: !!user?.avatarPath,
        },
      ].filter((item) => item.id !== 'plan' || managesBilling),
    [members.length, orgSlug, t, user?.avatarPath, conversations.length, billing, managesBilling]
  )

  const cards = [
    { label: t('kpiMembers'), value: KPI.members, hint: t('kpiMembersHint') },
    { label: t('kpiAiCredits'), value: KPI.aiCredits, hint: t('kpiAiCreditsHint') },
    { label: t('kpiMcpCalls'), value: KPI.mcpCalls, hint: t('kpiMcpCallsHint') },
    { label: t('kpiSeats'), value: KPI.seats, hint: t('kpiSeatsHint') },
  ]

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('dashboardTitle')}
        description={t('dashboardSubtitle')}
        actions={organization ? <Badge variant="secondary">{organization.name}</Badge> : null}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{card.hint}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('usageTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChartCard data={USAGE} seriesName={t('usageTitle')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('checklistTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <Checkbox checked={item.done} readOnly aria-label={item.label} />
                <div className="min-w-0">
                  <Link
                    to={item.to}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('activityTitle')}</h2>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('activityColumnWho')}</TableHead>
                <TableHead>{t('activityColumnWhat')}</TableHead>
                <TableHead>{t('activityColumnWhen')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTIVITY.map((entry) => (
                <TableRow key={`${entry.who}-${entry.when}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback>
                          {entry.who
                            .split(' ')
                            .map((part) => part[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      {entry.who}
                    </div>
                  </TableCell>
                  <TableCell>{entry.what}</TableCell>
                  <TableCell>{new Date(entry.when).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
