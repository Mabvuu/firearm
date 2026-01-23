// app/.../competency/page.tsx

export const dynamic = 'force-dynamic'
export const revalidate = 0

import NavPage from '../nav/page'
import { supabaseAdmin } from '@/lib/supabase/admin'
import CompetencyClient from './CompetencyClient'

export default async function CompetencyPage() {
  const { data, error } = await supabaseAdmin
    .from('competency')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('CompetencyPage fetch error:', error)

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <CompetencyClient initialData={data || []} />
      </div>
    </div>
  )
}
