'use client'
import { useEffect } from 'react'
import { flushQueue, pendingCount } from '@/lib/offline-queue'

export default function OfflineSync() {
  useEffect(() => {
    const tryFlush = async () => {
      try {
        const sent = await flushQueue()
        if (sent > 0) console.log(`synced ${sent} queued logs`)
      } catch {}
    }
    tryFlush()
    window.addEventListener('online', tryFlush)
    pendingCount().then((n) => n > 0 && console.log(`${n} logs queued offline`))
    return () => window.removeEventListener('online', tryFlush)
  }, [])
  return null
}
