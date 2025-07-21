import { openDB } from 'idb'
import type { InventoryItem } from '../types/pokemon.ts'

const DB_NAME = 'pokenug-inventory'
const STORE_NAME = 'items'
const DB_VERSION = 1

export async function getInventoryDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export async function saveInventory(items: Record<string, InventoryItem>) {
  const db = await getInventoryDB()
  await db.put(STORE_NAME, items, 'inventory')
}

export async function loadInventory(): Promise<Record<string, InventoryItem> | null> {
  const db = await getInventoryDB()
  return (await db.get(STORE_NAME, 'inventory')) || null
}
