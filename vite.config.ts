import { defineConfig } from 'vite';
import { exec } from 'child_process';
import path from 'path';

export default defineConfig({
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    esbuild: {
        loader: 'ts',
    },
    build: {
        target: 'esnext',
        sourcemap: true,
        outDir: 'dist',
        rollupOptions: {
            input: './index.html',
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
    server: {
        watch: {
            ignored: ['!**/src-gen/**'] // ensure src-gen is not ignored
        },
        open: true,
    },
    plugins: [

        {
            name: 'aot-compiler-watcher',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    res.setHeader('Cache-Control', 'no-cache');
                    next();
                });
            },
            async handleHotUpdate(ctx) {
                const file = ctx.file;

                // Only watch .ts files in src/
                if (!file.endsWith('.ts') || !file.includes('/src/')) return;

                console.log('[AOT] File changed:', ctx.file);
                return new Promise((resolve) => {
                    exec('node --loader ts-node/esm mngc/compiler.ts', (err, stdout, stderr) => {
                        if (err) {
                            console.error('[AOT Compiler Error]', err.message);
                        } else {
                            console.log('[AOT] Recompiled');
                            //This is the KEY part that triggers reload
                            ctx.server.ws.send({
                                type: 'full-reload',
                                path: '*',
                            });
                        }
                        resolve([]);
                    });
                });
            },
        },
    ],
});
