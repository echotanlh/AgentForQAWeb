import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',  // 监听所有网络接口
    port: 8001,
    strictPort: true, // 如果端口被占用，退出而不是尝试其他端口

  },
})
