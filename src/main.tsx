// Shim window.fetch write access for iframe compatibility
try {
  const originalFetch = window.fetch;
  let customFetch = originalFetch;
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    get() {
      return customFetch;
    },
    set(val) {
      customFetch = val;
    }
  });
} catch (e) {
  console.warn('Could not override window.fetch property in main.tsx:', e);
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
