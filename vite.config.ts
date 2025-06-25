import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        // This lets you omit extensions or import '.js' files that are actually TS during dev
        extensions: ['.ts', '.js', '.json'],
    },
    esbuild: {
        // Treat .ts files as TypeScript (default)
        loader: 'ts',
    },
    build: {
        target: 'esnext',
        sourcemap: true,
        outDir: 'dist',
        rollupOptions: {
            input: './index.html', // your entry html
            output: {
                // preserve the .js extension for imports
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
    server: {
        open: true,
    },
});
