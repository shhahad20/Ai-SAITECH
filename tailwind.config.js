/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ED1C2B',
          hover: '#D11825',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5F7',
        },
        text: {
          primary: '#1C1C1E',
          secondary: '#6B7280',
        },
        border: {
          light: '#D1D5DB', // Updated from #E5E5EA to a slightly darker gray
          separator: '#D4D4D8' // New color for separators
        }
      },
      boxShadow: {
        'apple': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'apple-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};