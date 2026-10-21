import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { quizCoachPlugin } from './server/quizCoach.js'

const webRoot = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(webRoot, '..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), quizCoachPlugin(loadEnv(mode, repoRoot, ''))],
}))
