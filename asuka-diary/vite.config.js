import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 【最重要】GitHub Pagesで最も確実に動く相対パス設定
  base: './', 

  // 【究極の解決策】出力フォルダの構造をGitHub Pagesに最適化する
  build: {
    outDir: 'dist',
    assetsDir: '.', // ここを'.'にすることで、assetsフォルダが消え、ファイルがルートに平坦化される
  },
})
