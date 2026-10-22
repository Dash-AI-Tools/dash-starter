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
import { usePalette } from '@/providers/palette-provider'

/**
 * Three chips painted with a palette's own tokens, in the current mode: the
 * swatch carries `data-palette`, so the stylesheet resolves its colours.
 */
function Swatch({ palette }: { palette: PaletteId }) {
  return (
    <span
      aria-hidden
      data-palette={palette}
      className="flex shrink-0 overflow-hidden rounded-sm ring-1 ring-border"
    >
      <span className="size-3 bg-primary" />
      <span className="size-3 bg-station-orgs" />
      <span className="size-3 bg-station-billing" />
    </span>
  )
}

/**
 * Lets a visitor try the palettes of the product. It only exists in demo
 * mode; elsewhere every visitor sees the default palette.
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
            variant="outline"
            size="sm"
            aria-label={`${t('paletteLabel')}: ${current}`}
            className="gap-2"
          >
            <Swatch palette={palette} />
            <span className="hidden sm:inline">{current}</span>
          </Button>
        }
      />
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
                <Swatch palette={id} />
                {t(PALETTE_LABELS[id])}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
