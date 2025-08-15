import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { presetUno, presetAttributify, presetIcons } from "unocss";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [UnoCSS({
    presets: [
      presetUno({
        dark: "media",
      }),
      presetAttributify(),
      presetIcons({
        extraProperties: {
          display: "inline-block",
          "vertical-align": "middle",
        },
      }),
    ],
    theme: {
      colors: {
        'base-100': 'var(--base-100)',
        'base-200': 'var(--base-200)',
        'base-300': 'var(--base-300)',
        'bg-success': 'var(--bg-success)',
        'bg-warning': 'var(--bg-warning)',
        'bg-error': 'var(--bg-error)',
        'bg-info': 'var(--bg-info)',
        'bg-purple': 'var(--bg-purple)',
        'bg-orange': 'var(--bg-orange)',
        'primary': 'var(--primary)',
        'secondary': 'var(--secondary)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'text-error': 'var(--text-error)',
        'text-purple': 'var(--text-purple)',
        'text-orange': 'var(--text-orange)',
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
      },
    },
  }), react()],
});
