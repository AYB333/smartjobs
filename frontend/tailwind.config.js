/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
            deepNavy: '#0F172A',
            obsidian: '#0B0F19',
            accent: '#3B82F6', // Modify this primary accent color later
        },
      },
    },
    plugins: [],
  }
