import type { Plugin } from 'vite'
import { parseEnv } from '../src/shared/config/parse-env.ts'

export function applicationEnvPlugin(): Plugin {
  return {
    name: 'blueprint-application-env',
    configResolved(config) {
      // Vite has applied mode, envDir and process.env precedence at this point.
      parseEnv(config.env)
    },
  }
}
