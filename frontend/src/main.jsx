import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/index.js';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <App />
    </Suspense>
  </StrictMode>
);
