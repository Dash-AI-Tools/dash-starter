import { useState } from 'react'
import { useConsent } from '@/providers/consent-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_CHOICES, type ConsentChoices } from '@/lib/consent'
import { useI18n } from '@/lib/i18n'

/**
 * The switches of the categories and the button that saves them.
 *
 * The component only lives while the dialog is open, so the switches always
 * start with the choice the visitor made.
 */
function Categories({
  choices,
  onSave,
}: {
  choices: ConsentChoices | null
  onSave: (choices: ConsentChoices) => void
}) {
  const { t } = useI18n()
  const [analytics, setAnalytics] = useState(choices?.analytics ?? DEFAULT_CHOICES.analytics)
  const [marketing, setMarketing] = useState(choices?.marketing ?? DEFAULT_CHOICES.marketing)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('necessary')}</p>
            <p className="text-sm text-muted-foreground">{t('necessaryDescription')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('alwaysOn')}</span>
            <Switch checked disabled aria-label={t('necessary')} />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('analytics')}</p>
            <p className="text-sm text-muted-foreground">{t('analyticsDescription')}</p>
          </div>
          <Switch
            checked={analytics}
            onCheckedChange={setAnalytics}
            aria-label={t('analytics')}
            className="mt-1"
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('marketing')}</p>
            <p className="text-sm text-muted-foreground">{t('marketingDescription')}</p>
          </div>
          <Switch
            checked={marketing}
            onCheckedChange={setMarketing}
            aria-label={t('marketing')}
            className="mt-1"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          onClick={() => onSave({ necessary: true, analytics, marketing })}
        >
          {t('preferencesSave')}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * The dialog where the visitor chooses the categories of cookies they allow.
 */
export function ConsentPreferences({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const { choices, save } = useConsent()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('preferencesTitle')}</DialogTitle>
          <DialogDescription>{t('preferencesBody')}</DialogDescription>
        </DialogHeader>

        <Categories
          choices={choices}
          onSave={(next) => {
            save(next)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
