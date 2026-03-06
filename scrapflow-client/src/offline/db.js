/**
 * ScrapFlow IndexedDB helper
 * Stores: ticketDrafts, materialCache, supplierCache, outbox
 */

const DB_NAME    = 'scrapflow-db'
const DB_VERSION = 1

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      if (!db.objectStoreNames.contains('ticketDrafts')) {
        db.createObjectStore('ticketDrafts', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('materialCache')) {
        db.createObjectStore('materialCache', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('supplierCache')) {
        db.createObjectStore('supplierCache', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true })
        outbox.createIndex('status', 'status', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })

  return dbPromise
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => {
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  })
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ─── Ticket Drafts ────────────────────────────────────────
export async function saveDraft(draft) {
  const store = await tx('ticketDrafts', 'readwrite')
  return wrap(store.put({ ...draft, savedAt: Date.now() }))
}

export async function getDraft(id) {
  const store = await tx('ticketDrafts')
  return wrap(store.get(id))
}

export async function getAllDrafts() {
  const store = await tx('ticketDrafts')
  return wrap(store.getAll())
}

export async function deleteDraft(id) {
  const store = await tx('ticketDrafts', 'readwrite')
  return wrap(store.delete(id))
}

// ─── Material Cache ───────────────────────────────────────
export async function cacheMaterials(materials) {
  const store = await tx('materialCache', 'readwrite')
  await Promise.all(materials.map((m) => wrap(store.put(m))))
}

export async function getCachedMaterials() {
  const store = await tx('materialCache')
  return wrap(store.getAll())
}

// ─── Supplier Cache ───────────────────────────────────────
export async function cacheSuppliers(suppliers) {
  const store = await tx('supplierCache', 'readwrite')
  await Promise.all(suppliers.map((s) => wrap(store.put(s))))
}

export async function getCachedSuppliers(search = '') {
  const store = await tx('supplierCache')
  const all = await wrap(store.getAll())
  if (!search) return all
  const q = search.toLowerCase()
  return all.filter((s) =>
    s.fullName?.toLowerCase().includes(q) || s.idNumber?.toLowerCase().includes(q)
  )
}

// ─── Outbox (offline mutation queue) ─────────────────────
export async function enqueueOutbox(mutation) {
  const store = await tx('outbox', 'readwrite')
  return wrap(store.add({
    ...mutation,
    status:    'pending',
    createdAt: Date.now(),
    retries:   0,
  }))
}

export async function getPendingMutations() {
  const store = await tx('outbox')
  const index = store.index('status')
  return wrap(index.getAll('pending'))
}

export async function markMutationDone(id) {
  const store = await tx('outbox', 'readwrite')
  const item = await wrap(store.get(id))
  if (item) return wrap(store.put({ ...item, status: 'done' }))
}

export async function markMutationFailed(id, error) {
  const store = await tx('outbox', 'readwrite')
  const item = await wrap(store.get(id))
  if (item) return wrap(store.put({ ...item, status: 'failed', error, retries: item.retries + 1 }))
}

// ─── Replay outbox on reconnect ───────────────────────────
export async function replayOutbox(apiExecutor) {
  const pending = await getPendingMutations()
  const results = []

  for (const mutation of pending) {
    try {
      const result = await apiExecutor(mutation)
      await markMutationDone(mutation.id)
      results.push({ mutation, result, success: true })
    } catch (err) {
      await markMutationFailed(mutation.id, err.message)
      results.push({ mutation, error: err.message, success: false })
    }
  }

  return results
}
