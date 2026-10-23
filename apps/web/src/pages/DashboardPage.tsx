import { useMemo } from 'react'
import { UserRoundIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { AreaChartCard, type ChartDatum } from '@/components/patterns/charts'
import { EmptyState } from '@/components/patterns/empty-state'
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
import { useDashboard, type DashboardActivity } from '@/lib/dashboard'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { canAccess, orgPath } from '@/lib/nav'
import { useConversations } from '@/lib/chat'
import { useBilling } from '@/lib/billing'
import { useMembers, useOrganization } from '@/lib/organizations'
import { useCurrentUser } from '@/lib/session'

/**
 * The value a card shows while the metrics load.
 */
const PLACEHOLDER = '—'

/**
 * The sentence that describes each type of activity.
 */
const ACTIVITY_SENTENCES = {
  member_joined: 'activityMemberJoined',
  invitation_sent: 'activityInvitationSent',
  api_key_created: 'activityApiKeyCreated',
} as const satisfies Record<DashboardActivity['type'], TranslationKey>

/**
 * The home of an organization: the numbers of the workspace, the usage of
 * the last days, the latest activity and the steps that are left to finish
 * the setup.
 */
export default function DashboardPage() {
  const { t, locale, formatDate, formatNumber } = useI18n()
  const { orgSlug = '' } = useParams()
  const { data: dashboard } = useDashboard(orgSlug)
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

  /**
   * What is left of a limit of the plan: never below zero, and "Unlimited"
   * when the plan has no limit.
   */
  const left = (quota: { used: number; limit: number }) =>
    quota.limit < 0 ? t('kpiUnlimited') : formatNumber(Math.max(0, quota.limit - quota.used))

  const cards = [
    {
      id: 'members',
      label: t('kpiMembers'),
      value: dashboard ? formatNumber(dashboard.members) : PLACEHOLDER,
      hint: t('kpiMembersHint'),
    },
    {
      id: 'aiCredits',
      label: t('kpiAiCredits'),
      value: dashboard ? left(dashboard.aiCredits) : PLACEHOLDER,
      hint: t('kpiAiCreditsHint'),
    },
    {
      id: 'mcpCalls',
      label: t('kpiMcpCalls'),
      value: !dashboard
        ? PLACEHOLDER
        : dashboard.mcpCalls.enabled
          ? left(dashboard.mcpCalls)
          : t('kpiNotInPlan'),
      hint: t('kpiMcpCallsHint'),
    },
    {
      id: 'seats',
      label: t('kpiSeats'),
      value: dashboard
        ? t('kpiUsedOf', {
            used: formatNumber(dashboard.seats.used),
            limit:
              dashboard.seats.limit < 0 ? t('kpiUnlimited') : formatNumber(dashboard.seats.limit),
          })
        : PLACEHOLDER,
      hint: t('kpiSeatsHint'),
    },
  ]

  /**
   * The credits of each of the last days, labelled with the short weekday in
   * the language of the interface. The days are UTC dates, so they are read
   * in UTC to keep the weekday of the server.
   */
  const usage: ChartDatum[] = (dashboard?.usage ?? []).map((day) => ({
    label: formatDate(day.date, { weekday: 'short', timeZone: 'UTC' }),
    value: day.credits,
  }))

  const activity = dashboard?.activity ?? []

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('dashboardTitle')}
        description={t('dashboardSubtitle')}
        actions={organization ? <Badge variant="secondary">{organization.name}</Badge> : null}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.id}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
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
            <AreaChartCard data={usage} locale={locale} seriesName={t('usageTitle')} />
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

        {dashboard && activity.length === 0 ? (
          <EmptyState title={t('activityEmpty')} />
        ) : (
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
                {dashboard ? (
                  activity.map((entry, index) => (
                    <TableRow key={`${entry.type}-${entry.at}-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback>
                              {entry.actor ? (
                                entry.actor.initials
                              ) : (
                                <UserRoundIcon aria-hidden="true" className="size-3" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {entry.actor ? entry.actor.fullName : t('activityFormerMember')}
                        </div>
                      </TableCell>
                      <TableCell>{t(ACTIVITY_SENTENCES[entry.type])}</TableCell>
                      <TableCell>{formatDate(entry.at)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell>{PLACEHOLDER}</TableCell>
                    <TableCell>{PLACEHOLDER}</TableCell>
                    <TableCell>{PLACEHOLDER}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
