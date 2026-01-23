import { Suspense } from 'react'
import CFRAddAttachmentClient from './CFRAddAttachmentClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <CFRAddAttachmentClient />
    </Suspense>
  )
}
