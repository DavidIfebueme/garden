import '@testing-library/jest-dom/vitest'
import './src/bones/registry'

// JSDOM polyfills — cmdk uses ResizeObserver and scrolls its selected item
// into view; /ui's use-mobile hook reads window.matchMedia. None of the three
// ship with JSDOM so we stub them.
if (
  typeof Element !== 'undefined' &&
  !('scrollIntoView' in Element.prototype)
) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
