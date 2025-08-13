import { defineEventHandler } from 'h3'
import path from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'coachartie.db')
  
  return {
    cwd: process.cwd(),
    dbPath,
    envPath: process.env.DATABASE_PATH,
    exists: fs.existsSync(dbPath),
    absolutePath: path.resolve(dbPath)
  }
})