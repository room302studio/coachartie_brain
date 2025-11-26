/**
 * Test DB Connection Endpoint
 *
 * Uses the shared Drizzle client
 */

import { defineEventHandler } from 'h3'
import { getDefaultDbPath } from '@coachartie/shared'
import { existsSync } from 'fs'
import { resolve } from 'path'

export default defineEventHandler(async () => {
  const dbPath = getDefaultDbPath()
  const absolutePath = resolve(dbPath)

  return {
    cwd: process.cwd(),
    dbPath,
    envPath: process.env.DATABASE_PATH,
    exists: existsSync(absolutePath),
    absolutePath
  }
})
