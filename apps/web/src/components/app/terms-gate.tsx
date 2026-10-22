import { useState } from 'react'
import { TERMS_VERSION } from '@dash/api/legal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { useI18n } from '@/lib/i18n'
import { useCurrentUser, useSetCurrentUser } from '@/lib/session'

/**
 * The gate that asks the accounts created with an older version of the terms
 * to accept them again. It blocks the app until the terms are accepted.
 */
export function TermsGate() {
  const { t } = useI18n()
  const { data: user } = useCurrentUser()
  const setCurrentUser = useSetCurrentUser()
  const [accepting, setAccepting] = useState(false)

  if (!user || user.termsVersion === TERMS_VERSION) return null

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('termsOutdatedTitle')}</DialogTitle>
          <DialogDescription>{t('termsOutdatedBody')}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            disabled={accepting}
            onClick={async () => {
              setAccepting(true)

              try {
                const response = await client.api.profile.terms({})
                setCurrentUser(response.user)
              } catch (error) {
                setAccepting(false)
                console.error(toApiFailure(error).error.message)
              }
            }}
          >
            {t('termsAccept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
