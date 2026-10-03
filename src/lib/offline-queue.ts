/* Browser-side offline queue for the logging form. Falls back to IndexedDB. */
const DB = 'greenscore-offline'
const STORE = 'queue'

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function enqueue(url: string, body: unknown) {
  const db = await open()
  const tx = db.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).add({ url, body, ts: Date.now() })
  return new Promise<void>((res) => (tx.oncomplete = () => res()))
}

export async function pendingCount(): Promise<number> {
  const db = await open()
  return new Promise((res) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => res(req.result)
  })
}

export async function flushQueue(): Promise<number> {
  const db = await open()
  const items: Array<{ id: number; url: string; body: unknown }> = await new Promise((res) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => res(req.result as never)
  })
  let sent = 0
  for (const it of items) {
    try {
      const r = await fetch(it.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(it.body) })
      if (r.ok) {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(it.id)
        await new Promise((res) => (tx.oncomplete = res))
        sent++
      }
    } catch { /* still offline */ }
  }
  return sent
}

/** Online → POST; offline (or network error) → queue in IndexedDB. */
export async function postOrQueue(url: string, body: unknown): Promise<{ queued: boolean }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) throw new Error(String(r.status))
    return { queued: false }
  } catch {
    await enqueue(url, body)
    return { queued: true }
  }
}
