import type { Config } from 'tailwindcss';
const config: Config = { content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { navy: '#10243b', blue: '#2864dc', ink: '#17283c', muted: '#728094', line: '#e7ebf0', canvas: '#f7f8fa' }, boxShadow: { soft: '0 8px 28px rgba(15,35,60,.07)' } } }, plugins: [] };
export default config;
