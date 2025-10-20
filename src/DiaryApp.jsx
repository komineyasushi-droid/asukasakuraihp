前回までのjsonコードを全部採用し、現在のjsonコードを合体させて新しいjsonコードを作れ。
/** @type {import('tailwindcss').Config} */
export default {
  // content: はプロジェクトのファイルに合わせて設定
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'main-color': '#E0F7FA',       
        'accent-color': '#FF7F50',     
        'dark-color': '#00AEEF',       
        'owner-pink': '#EC4899',       
        'theme-blue': '#00AEEF',      
      },
    },
  },
  plugins: [],
}