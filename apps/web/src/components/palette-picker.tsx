import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/lib/i18n'
import { PALETTE_IDS, PALETTE_LABELS, isPaletteId, type PaletteId } from '@/lib/palettes'
import { cn } from '@/lib/utils'
import { usePalette } from '@/providers/palette-provider'

/**
 * Three bands painted with a palette's own tokens, in the current mode: the
 * swatch carries `data-palette`, so the stylesheet resolves its colours.
 */
function Swatch({ palette, className }: { palette: PaletteId; className?: string }) {
  return (
    <span
      aria-hidden
      data-palette={palette}
      className={cn('flex shrink-0 overflow-hidden rounded-[0.2rem] ring-1 ring-border', className)}
    >
      <span className="h-full flex-1 bg-primary" />
      <span className="h-full flex-1 bg-station-orgs" />
      <span className="h-full flex-1 bg-station-billing" />
    </span>
  )
}

/**
 * Lets a visitor try the palettes of the product, and a signed-in user pick
 * the one saved in the account. The public header only renders it for a
 * visitor; the dashboard top bar renders it always.
 */
export function PalettePicker() {
  const { t } = useI18n()
  const { palette, setPalette, canChoose } = usePalette()

  if (!canChoose) return null

  const current = t(PALETTE_LABELS[palette])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${t('paletteLabel')}: ${current}`}
            title={`${t('paletteLabel')}: ${current}`}
          />
        }
      >
        <Swatch palette={palette} className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('paletteLabel')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={palette}
            onValueChange={(value) => {
              if (isPaletteId(value)) setPalette(value)
            }}
          >
            {PALETTE_IDS.map((id) => (
              <DropdownMenuRadioItem key={id} value={id} className="gap-2.5">
                <Swatch palette={id} className="size-4" />
                {t(PALETTE_LABELS[id])}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
