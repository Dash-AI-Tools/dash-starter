import { LogOut, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OPEN_COOKIE_PREFERENCES } from '@/lib/consent'
import { useI18n } from '@/lib/i18n'
import { orgPath } from '@/lib/nav'
import { useCurrentUser, useSignOut } from '@/lib/session'

/**
 * The menu of the account of the visitor.
 */
export function UserMenu({ orgSlug }: { orgSlug: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const signOut = useSignOut()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="gap-2" aria-label={t('userMenu')} />}
      >
        <Avatar size="sm">
          {user?.avatarPath ? <AvatarImage src={user.avatarPath} alt="" /> : null}
          <AvatarFallback>{user?.initials ?? '?'}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm sm:inline">{user?.fullName}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => navigate(orgPath(orgSlug, 'profile'))}>
            <User className="size-4" />
            {t('navProfile')}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES))}
          >
            <Settings className="size-4" />
            {t('cookiePreferences')}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOut className="size-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
