import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'vendor': path.resolve(__dirname, 'public/vendor'),
        },
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                // 禁用严格模式
                strict: false
            }
        }
    },
    optimizeDeps: {
        // 预构建 foliate-js
        exclude: ['foliate-js'],
    },
})
