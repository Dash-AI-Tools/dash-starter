import type { Preview } from '@storybook/react-vite'
import '@dash/ui/styles.css'

/**
 * The palettes of the stylesheet. The tokens only exist under a palette, so
 * every story renders inside one.
 */
const PALETTES = ['line', 'ink', 'ocean', 'forest', 'plum', 'ember']

/**
 * The stories render with the stylesheet of the app, so a token changed in the
 * package shows here and in the app at once. The toolbar switches the palette
 * and the mode the way the app does: on the document root.
 */
const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
  },
  globalTypes: {
    palette: {
      description: 'Colour palette',
      toolbar: { title: 'Palette', icon: 'paintbrush', items: PALETTES, dynamicTitle: true },
    },
    theme: {
      description: 'Light or dark mode',
      toolbar: { title: 'Mode', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { palette: 'line', theme: 'light' },
  decorators: [
    (Story, { globals }) => {
      const root = document.documentElement
      root.dataset.palette = globals.palette ?? 'line'
      root.classList.toggle('dark', globals.theme === 'dark')
      return Story()
    },
  ],
}

export default preview
