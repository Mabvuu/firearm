import NavPage from '../nav/page'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ApplicantsClient from './ApplicantsClient'

type ApplicantRow = {
  id: number
  applicant_name: string | null
  national_id: string | null
  phone: string | null
  address: string | null
  province: string | null
  district: string | null
  applicant_email: string
  created_at: string
  status: string
}

export default async function ApplicantsPage() {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(
      'id, applicant_name, national_id, phone, address, province, district, applicant_email, created_at, status'
    )
    .order('created_at', { ascending: false })

  const initialData: ApplicantRow[] = (data as ApplicantRow[]) ?? []

  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 min-w-[260px] border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        {error ? (
          <div className="border rounded p-4 text-sm">
            <div className="font-semibold">Failed to load applicants</div>
            <div className="text-muted-foreground">{error.message}</div>
          </div>
        ) : (
          <ApplicantsClient initialData={initialData} />
        )}
      </div>
    </div>
  )
}
