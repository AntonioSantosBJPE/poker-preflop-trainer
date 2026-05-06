import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </ThemeProvider>,
);
