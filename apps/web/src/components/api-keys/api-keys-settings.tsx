import { useMemo, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { PageHeader } from '@/components/patterns/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { API_BASE_URL } from '@/lib/api'
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type ApiKey } from '@/lib/api-keys'
import { useI18n } from '@/lib/i18n'

/**
 * The scopes a key can hold.
 */
const SCOPES = ['mcp:read', 'mcp:write'] as const

/**
 * The values of the form that creates a key.
 */
type CreateValues = {
  name: string
  scopes: (typeof SCOPES)[number][]
  expiresAt: string
}

/**
 * The scopes of the key, as the checkbox group of the form.
 */
function ScopesField() {
  const { t } = useI18n()
  const { control, formState } = useFormContext<CreateValues>()

  return (
    <Controller
      control={control}
      name="scopes"
      render={({ field }) => (
        <div className="space-y-2">
          {SCOPES.map((scope) => (
            <div key={scope} className="flex items-center gap-2">
              <Checkbox
                id={`scope-${scope}`}
                checked={field.value.includes(scope)}
                onCheckedChange={(checked) =>
                  field.onChange(
                    checked === true
                      ? [...field.value, scope]
                      : field.value.filter((value) => value !== scope)
                  )
                }
              />
              <label htmlFor={`scope-${scope}`} className="text-sm">
                {scope === 'mcp:read' ? t('scopeRead') : t('scopeWrite')}
              </label>
              <span className="text-xs text-muted-foreground">{scope}</span>
            </div>
          ))}

          {formState.errors.scopes ? (
            <p role="alert" className="text-sm text-destructive">
              {formState.errors.scopes.message}
            </p>
          ) : null}
        </div>
      )}
    />
  )
}

/**
 * The dialog that creates a key. The secret of the key is only shown once, so
 * the dialog that shows it is the one that closes the creation.
 */
function CreateKeyDialog({
  orgSlug,
  onCreated,
}: {
  orgSlug: string
  /** Called with the secret of the new key. */
  onCreated: (secret: string) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const create = useCreateApiKey(orgSlug)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('required')).max(120),
        scopes: z.array(z.enum(SCOPES)).min(1, t('scopeRequired')),
        expiresAt: z.string(),
      }),
    [t]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{t('create')}</Button>} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create')}</DialogTitle>
          <DialogDescription>{t('apiKeysSubtitle')}</DialogDescription>
        </DialogHeader>

        <Form<CreateValues>
          schema={schema}
          defaultValues={{ name: '', scopes: ['mcp:read'], expiresAt: '' }}
          fields={[
            {
              name: 'name',
              label: t('keyName'),
              placeholder: t('namePlaceholder'),
            },
            {
              name: 'scopes',
              label: t('scopes'),
              children: <ScopesField />,
            },
            {
              name: 'expiresAt',
              label: t('expiresAt'),
              type: 'date',
            },
          ]}
          submitLabel={t('createButton')}
          onSubmit={async (values) => {
            const response = await create.mutateAsync({
              name: values.name,
              scopes: values.scopes,
              expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
            })

            toast.success(t('keyCreated'))
            setOpen(false)
            onCreated(response.secret)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * The dialog that shows the secret of a new key and how to connect a client
 * to the server with it. The secret is never shown again.
 */
function SecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  /**
   * The configuration a client needs to reach the server.
   */
  const snippet = JSON.stringify(
    {
      mcpServers: {
        dash: {
          url: `${API_BASE_URL}/mcp`,
          headers: { Authorization: `Bearer ${secret ?? ''}` },
        },
      },
    },
    null,
    2
  )

  /**
   * Copies the secret to the clipboard. The browser may not allow it, so the
   * dialog shows the secret anyway: it can always be copied by hand.
   */
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret ?? '')
    } catch {
      // the browser refused the clipboard
    }

    setCopied(true)
  }

  return (
    <Dialog open={!!secret} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('secretTitle')}</DialogTitle>
          <DialogDescription>{t('secretBody')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('secretLabel')}</p>
          <code className="block w-full overflow-x-auto rounded-lg border bg-muted p-3 text-xs">
            {secret}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? t('copied') : t('copy')}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('mcpSnippetTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('mcpSnippetBody')}</p>
          <code className="block w-full overflow-x-auto rounded-lg border bg-muted p-3 text-xs">
            {snippet}
          </code>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t('done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The dialog that confirms the revocation of a key.
 */
function RevokeDialog({
  orgSlug,
  apiKey,
  onClose,
}: {
  orgSlug: string
  apiKey: ApiKey | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const revoke = useRevokeApiKey(orgSlug)

  return (
    <Dialog open={!!apiKey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('keyRevoke')}</DialogTitle>
          <DialogDescription>{t('keyRevokeConfirm')}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!apiKey) return

              await revoke.mutateAsync(apiKey.id)
              toast.success(t('keyRevoked'))
              onClose()
            }}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The API keys of the organization: the credentials an external agent uses to
 * reach the MCP server, and the calls they made this period.
 */
export function ApiKeysSettings({ orgSlug }: { orgSlug: string }) {
  const { t, formatDate } = useI18n()
  const { data, isPending, isError } = useApiKeys(orgSlug)
  const [secret, setSecret] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('loading')}</p>
  }

  if (isError || !data) {
    return <p className="p-6 text-sm text-destructive">{t('unknownError')}</p>
  }

  const keys = data.apiKeys
  const usage = data.usage

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('apiKeysTitle')}
        description={t('apiKeysSubtitle')}
        actions={
          data.mcpEnabled ? <CreateKeyDialog orgSlug={orgSlug} onCreated={setSecret} /> : null
        }
      />

      {data.mcpEnabled ? null : (
        <Card>
          <CardHeader>
            <CardTitle>{t('planRequired')}</CardTitle>
          </CardHeader>
        </Card>
      )}

      {data.mcpEnabled ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('calls')}</CardTitle>
              <CardDescription>
                {usage.limit < 0
                  ? t('usageUnlimited')
                  : t('usageOf', { used: usage.total, limit: usage.limit })}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('keys')}</CardTitle>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('keysEmpty')}</p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('keyName')}</TableHead>
                        <TableHead>{t('scopes')}</TableHead>
                        <TableHead>{t('calls')}</TableHead>
                        <TableHead>{t('lastUsed')}</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{key.name}</span>
                              {key.revokedAt ? (
                                <Badge variant="destructive">{t('keyRevokedBadge')}</Badge>
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground">{key.prefix}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {key.scopes.map((scope) => (
                                <Badge key={scope} variant="outline">
                                  {scope}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{key.calls}</TableCell>
                          <TableCell>
                            {key.lastUsedAt ? formatDate(key.lastUsedAt) : t('lastUsedNever')}
                          </TableCell>
                          <TableCell>
                            {key.revokedAt ? null : (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => setRevoking(key)}
                              >
                                {t('keyRevoke')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
      <RevokeDialog orgSlug={orgSlug} apiKey={revoking} onClose={() => setRevoking(null)} />
    </div>
  )
}
