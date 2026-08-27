import { defineConfig } from 'tsdown'

const id = '@jingyun-ai/jingyun-dsh'

export default defineConfig([
  // 1. Backend half (Node, ESM)
  {
    entry: {
      index: 'src/index.ts'
    },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    clean: true,
    dts: false
  },
  // 2. Client half (Browser, CJS wrapped)
  {
    entry: {
      client: 'src/client/index.tsx'
    },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'esnext',
    clean: false,
    dts: false,
    external: [
      'react', 
      'react-dom', 
      '@deepseek-ai/dsh-client-runtime', 
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-primitives'
    ],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    }
  }
])
