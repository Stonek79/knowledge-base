import esbuild from 'esbuild';
import { tsconfigPathsPlugin } from 'esbuild-plugin-tsconfig-paths';
import fs from 'node:fs/promises';

// Read package.json to make all dependencies external
const pkg = JSON.parse(await fs.readFile('./package.json', 'utf-8'));
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

const isWatch = process.argv.includes('--watch');

const options = {
  entryPoints: ['scripts/worker.ts'],
  bundle: true,
  outfile: 'dist/worker.cjs',
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  sourcemap: true,
  plugins: [
    tsconfigPathsPlugin({ tsconfig: './tsconfig.worker.json' }),
  ],
  external,
};

if (isWatch) {
    const context = await esbuild.context(options);
    await context.watch();
    console.log('ESBuild is watching for changes...');
} else {
    await esbuild.build(options);
    console.log('ESBuild build complete.');
}