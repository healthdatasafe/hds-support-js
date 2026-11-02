import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'js',
    lib: {
      entry: 'src/index.ts',
      name: 'HDSSupport',
      formats: ['es', 'cjs'],
      fileName: (format) => `hds-support.${format === 'es' ? 'mjs' : 'js'}`
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'hds-lib', 'hds-forms-js'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'hds-lib': 'HDSLib',
          'hds-forms-js': 'HDSForms'
        }
      }
    }
  }
});
