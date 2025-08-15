import React from 'react';
import ReactDOM from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import App from './App';
import './style.css';
import 'virtual:uno.css';
import { ThemeProvider } from './contexts/ThemeContext';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <Theme>
          <App />
        </Theme>
      </ThemeProvider>
    </React.StrictMode>,
  );
}