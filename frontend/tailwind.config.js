/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#FCFBF8', // Main background color from artisan_preview
        card: '#FFFFFF',
        accent: '#D46A13', // Warm terracotta accent
        muted: '#6B7280',
        text: '#0F172A',
        glass: 'rgba(255,255,255,0.6)',
      },
      boxShadow: {
        'soft': '0 6px 18px rgba(15,23,42,0.08)',
      },
    },
  },
  plugins: [],
};
