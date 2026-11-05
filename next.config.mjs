import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure SWC wasm is loaded reliably on Windows environments
process.env.NEXT_TEST_WASM = '1';
process.env.NEXT_TEST_WASM_DIR = path.join(__dirname, 'node_modules/@next/swc-wasm-nodejs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
