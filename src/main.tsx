import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initAndroidRuntimeBridge } from './utils/androidBridge.ts';
import './index.css';

initAndroidRuntimeBridge();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="SAZ AI Application Root Guard">
    <App />
  </ErrorBoundary>,
);

