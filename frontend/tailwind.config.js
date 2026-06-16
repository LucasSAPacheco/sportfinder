/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4D3B',
          light: '#266B52',
          dark: '#123527',
        },
        gold: {
          DEFAULT: '#C68A15',
          light: '#D9A030',
          dark: '#A57210',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
