import 'server-only'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { documentSchema, type HotelDocument } from '@/server/schemas/documents'

const documents: HotelDocument[] = readFileSync(
  path.join(process.cwd(), 'data/documentos.jsonl'),
  'utf8'
)
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((line) => documentSchema.parse(JSON.parse(line)))

export const listDocuments = (): HotelDocument[] => documents
