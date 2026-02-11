import { resolve } from 'path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        tailwindcss(),
    ],
    root: './',
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
})