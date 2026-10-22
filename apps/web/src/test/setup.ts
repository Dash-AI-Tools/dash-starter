import '@testing-library/jest-dom/vitest'
import { File } from 'node:buffer'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

/**
 * jsdom brings its own file classes, but the fetch of the tests is the one of
 * node, which only sends the files of node in a multipart body. The globals
 * of the environment are the ones of node, so the requests the tests make are
 * the ones the browser sends.
 *
 * The form data of node is not exported, so it is taken from a request of the
 * environment, which already builds its body with it.
 */
const { constructor: NodeFormData } = await new Request('http://localhost/', {
  method: 'POST',
  body: new FormData(),
}).formData()

Object.assign(globalThis, { File, FormData: NodeFormData } as unknown as typeof globalThis)

// jsdom has no ResizeObserver, which cmdk and the charts rely on.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom has no scrollIntoView, which cmdk calls on the highlighted item.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom has no matchMedia, which the theme provider and the date picker use.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

/**
 * The API sets the token of the CSRF protection in a cookie. The tests
 * pretend the browser already carries it, so the client does not have to ask
 * the API for it before every request.
 */
document.cookie = 'XSRF-TOKEN=test-token'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
