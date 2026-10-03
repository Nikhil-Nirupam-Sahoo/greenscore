'use client'
export default function ReviewActions({ id }: { id: string }) {
  return (
    <div className="flex gap-2">
      <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={async () => {
        await fetch('/api/review', { method: 'POST', body: JSON.stringify({ id, action: 'approve' }) })
        location.reload()
      }}>Approve</button>
      <button className="rounded bg-red-500 px-3 py-1 text-white" onClick={async () => {
        await fetch('/api/review', { method: 'POST', body: JSON.stringify({ id, action: 'reject' }) })
        location.reload()
      }}>Reject</button>
    </div>
  )
}
