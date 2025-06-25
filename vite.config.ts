import { defineConfig } from 'vite';
import { exec } from 'child_process';
import chokidar from 'chokidar';
import path from 'path';

export default defineConfig({
    root: 'dist-dev', // Tell Vite to serve from dist-dev (formerly src-gen)
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    esbuild: {
        loader: 'ts',
    },
    build: {
        target: 'esnext',
        sourcemap: true,
        outDir: '../dist', // Output final build outside dist-dev
        rollupOptions: {
            input: './index.html', // resolved from root: 'dist-dev'
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
    server: {
        open: true,
        watch: {
            ignored: [], // allow watching everything (we override with chokidar anyway)
        },
    },
    plugins: [
        {
            name: 'aot-compiler-watcher',
            configureServer(server) {
                // ✅ Watch `src` manually to trigger rebuilds
                const watcher = chokidar.watch(path.resolve('src'), {
                    ignored: /(^|[/\\])\../, // ignore dotfiles
                    ignoreInitial: true,
                });

                watcher.on('change', (file) => {
                    if (!file.endsWith('.ts')) return;

                    console.log('[AOT] File changed:', file);
                    exec('node --loader ts-node/esm mngc/compiler.ts', (err, stdout, stderr) => {
                        if (err) {
                            console.error('[AOT Compiler Error]', err.message);
                        } else {
                            console.log('[AOT] Recompiled');
                            server.ws.send({
                                type: 'full-reload',
                                path: '*',
                            });
                        }
                    });
                });
            },
        },
    ],
});
