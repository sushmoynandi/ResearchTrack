// lib/clientPdfStorage.ts
// 100% Client-Side Browser Storage using IndexedDB (Zero Database, Zero Server Upload)

const DB_NAME = 'ResearchTrack_ClientStorage'
const DB_VERSION = 1
const STORE_NAME = 'client_pdfs'

interface StoredPdfRecord {
  paperId: string
  name: string
  blob: Blob
  updatedAt: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment.'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'paperId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveClientPdf(paperId: string, file: File): Promise<{ blobUrl: string; name: string }> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const record: StoredPdfRecord = {
      paperId,
      name: file.name,
      blob: file,
      updatedAt: Date.now(),
    }

    const request = store.put(record)

    request.onsuccess = () => {
      const blobUrl = URL.createObjectURL(file)
      resolve({ blobUrl, name: file.name })
    }

    request.onerror = () => reject(request.error)
  })
}

export async function getClientPdf(paperId: string): Promise<{ blobUrl: string; name: string } | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(paperId)

      request.onsuccess = () => {
        const record = request.result as StoredPdfRecord | undefined
        if (record && record.blob) {
          const blobUrl = URL.createObjectURL(record.blob)
          resolve({ blobUrl, name: record.name })
        } else {
          resolve(null)
        }
      }

      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

export async function removeClientPdf(paperId: string): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(paperId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch {
    // Non-blocking
  }
}
