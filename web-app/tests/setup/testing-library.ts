import '@testing-library/jest-dom'

// jose (JWT) uses the Web Crypto API via `crypto.subtle`.
// jsdom does not polyfill it by default — import from Node's crypto module.
import { webcrypto } from 'crypto'
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
  })
}