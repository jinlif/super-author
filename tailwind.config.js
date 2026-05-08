/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-activity': '#333333',
        'vscode-panel': '#1e1e1e',
        'vscode-border': '#3c3c3c',
        'vscode-text': '#cccccc',
        'vscode-active': '#37373d',
        'vscode-hover': '#2a2d2e',
      },
      height: {
        'activity-icon': '48px',
      },
      width: {
        'activity-bar': '48px',
        'sidebar': '280px',
      },
    },
  },
  plugins: [],
}
