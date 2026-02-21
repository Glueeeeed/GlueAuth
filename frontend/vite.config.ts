import { resolve } from 'path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        tailwindcss(),
    ],
    build: {
        outDir: '../src/public',
        rollupOptions: {
            input: {
                login: resolve(__dirname, 'login.html'),
                register: resolve(__dirname, 'register.html'),
                zkp: resolve(__dirname, 'zkp-info.html'),
            },
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:2137',
                changeOrigin: true,
            },

        },
    },
})