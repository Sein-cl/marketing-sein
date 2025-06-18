// src/react-app/setupTests.ts
import '@testing-library/jest-dom'; // Adds jest-dom matchers for better assertions

// --- Mock localStorage ---
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => { store[key] = value.toString(); },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { store = {}; },
    key: (index: number): string | null => Object.keys(store)[index] || null,
    get length(): number { return Object.keys(store).length; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true // Allow individual tests to override if necessary
});

// --- Mock fetch ---
// global.fetch = vi.fn(() =>
//   Promise.resolve({
//     ok: true,
//     json: () => Promise.resolve({}), // Default mock response
//     text: () => Promise.resolve(''),
//     blob: () => Promise.resolve(new Blob()),
//     arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
//     formData: () => Promise.resolve(new FormData()),
//     headers: new Headers(),
//     redirected: false,
//     status: 200,
//     statusText: 'OK',
//     type: 'default',
//     url: '',
//     clone: () => this, // Simplified clone
//   })
// );
// More robust to define fetch mock per test suite or per test via vi.spyOn(global, 'fetch')
// For now, a basic global mock:
global.fetch = vi.fn();


// --- Mock crypto.randomUUID ---
// If your components use crypto.randomUUID() and it's not available in happy-dom/jsdom
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {
    subtle: {}, // or mock specific subtle functions if needed
  };
}
if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = () => {
    // Basic UUID v4 polyfill for testing environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// --- Clean up mocks after each test ---
// Not strictly necessary if using vi.resetAllMocks() in test files, but can be a safeguard
// import { afterEach } from 'vitest';
// afterEach(() => {
//   localStorageMock.clear();
//   vi.clearAllMocks(); // Clears history of all mocks
// });

console.log('Global test setup file loaded (setupTests.ts)');
