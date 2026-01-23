// app/police/firearmofficer/application/competency/page.tsx
'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import NavPage from '../../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const COLORS = {
  naturalAluminum: '#D9D8D6',
  blackBlue: '#212B37',
  snowWhite: '#FFFEF1',
  lamar: '#3E5C80',
  coolGreyMedium: '#ACACAC',
} as const

type Application = {
  id: number
  applicant_name: string
  national_id: string
  competency_id: number | null
}

type CompetencyFull = {
  id: number
  user_id: string
  full_name: string
  national_id: string
  violent_crime_history: boolean
  violent_crime_details: string | null
  restraining_orders: boolean
  restraining_order_details: string | null
  mental_instability: boolean
  mental_instability_details: string | null
  substance_abuse: boolean
  substance_abuse_details: string | null
  firearms_training: boolean
  firearms_training_details: string | null
  threat_to_self_or_others: boolean
  threat_details: string | null
  notes: string | null
  created_at: string
}

const competencySelect =
  'id, user_id, full_name, national_id, violent_crime_history, violent_crime_details, restraining_orders, restraining_order_details, mental_instability, mental_instability_details, substance_abuse, substance_abuse_details, firearms_training, firearms_training_details, threat_to_self_or_others, threat_details, notes, created_at'

function ApplicationCompetencyPageInner() {
  const searchParams = useSearchParams()
  const appId = Number(searchParams.get('appId'))

  const [app, setApp] = useState<Application | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompetencyFull[]>([])
  const [searching, setSearching] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [attached, setAttached] = useState<CompetencyFull | null>(null)

  const requestedCompetencyIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!appId) return

    const loadApp = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, applicant_name, national_id, competency_id')
        .eq('id', appId)
        .single()

      if (error) {
        alert(error.message)
        return
      }

      setApp((data as Application) ?? null)
    }

    loadApp()
  }, [appId])

  useEffect(() => {
    if (!app?.competency_id) return

    const competencyId = app.competency_id
    if (requestedCompetencyIds.current.has(competencyId)) return
    requestedCompetencyIds.current.add(competencyId)

    const loadAttached = async () => {
      const { data, error } = await supabase
        .from('competency')
        .select(competencySelect)
        .eq('id', competencyId)
        .maybeSingle()

      if (error) {
        alert(error.message)
        return
      }

      setAttached((data as CompetencyFull) ?? null)
    }

    loadAttached()
  }, [app?.competency_id])

  const searchCompetency = async () => {
    if (!query.trim()) return
    setSearching(true)

    const { data, error } = await supabase
      .from('competency')
      .select(competencySelect)
      .ilike('national_id', `%${query.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    setSearching(false)

    if (error) {
      alert(error.message)
      return
    }

    setResults((data as CompetencyFull[]) ?? [])
  }

  const attachToApp = async (competency: CompetencyFull) => {
    if (!app) return
    setAttaching(true)

    const { error } = await supabase
      .from('applications')
      .update({ competency_id: competency.id })
      .eq('id', app.id)

    setAttaching(false)

    if (error) {
      alert(error.message)
      return
    }

    setApp({ ...app, competency_id: competency.id })
    setAttached(competency)
    setResults([])
  }

  const detach = async () => {
    if (!app) return
    setAttaching(true)

    const { error } = await supabase
      .from('applications')
      .update({ competency_id: null })
      .eq('id', app.id)

    setAttaching(false)

    if (error) {
      alert(error.message)
      return
    }

    setApp({ ...app, competency_id: null })
    setAttached(null)
  }

  const row = (label: string, ok: boolean, details: string | null) => (
    <div
      className="rounded-md border p-3"
      style={{ borderColor: COLORS.naturalAluminum, backgroundColor: COLORS.snowWhite }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
          {label}
        </div>
        <Badge
          variant={ok ? 'destructive' : 'outline'}
          style={
            ok
              ? {
                  backgroundColor: COLORS.blackBlue,
                  color: COLORS.snowWhite,
                  borderColor: COLORS.blackBlue,
                }
              : {
                  borderColor: COLORS.naturalAluminum,
                  color: COLORS.blackBlue,
                  backgroundColor: '#fff',
                }
          }
        >
          {ok ? 'Yes' : 'No'}
        </Badge>
      </div>

      {ok && details && (
        <div className="mt-2 text-xs" style={{ color: COLORS.coolGreyMedium }}>
          Details: {details}
        </div>
      )}
    </div>
  )

  if (!appId)
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Missing appId
      </div>
    )

  if (!app)
    return (
      <div className="p-8" style={{ backgroundColor: COLORS.snowWhite, color: COLORS.blackBlue }}>
        Loading…
      </div>
    )

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: COLORS.snowWhite }}>
      <div className="w-1/4 min-w-[260px] border-r" style={{ borderColor: COLORS.naturalAluminum }}>
        <NavPage />
      </div>

      <div className="w-3/4 p-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
              Competency
            </h1>
            <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
              {app.applicant_name} (#{app.id})
            </p>
          </div>

          <Button
            asChild
            variant="outline"
            className="h-10"
            style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
          >
            <Link href={`/police/firearmofficer/application/attachments?appId=${app.id}`}>Back</Link>
          </Button>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Search & Attach Record
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {attached ? (
              <>
                <div
                  className="rounded-md border p-4"
                  style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
                >
                  <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                    Attached record
                  </div>
                  <div className="mt-1 text-base font-semibold" style={{ color: COLORS.blackBlue }}>
                    {attached.full_name}
                  </div>
                  <div className="text-sm" style={{ color: COLORS.lamar }}>
                    National ID: {attached.national_id}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {row('Violent Crime History', attached.violent_crime_history, attached.violent_crime_details)}
                  {row('Restraining Orders', attached.restraining_orders, attached.restraining_order_details)}
                  {row('Mental Instability', attached.mental_instability, attached.mental_instability_details)}
                  {row('Substance Abuse', attached.substance_abuse, attached.substance_abuse_details)}
                  {row('Firearm Training', attached.firearms_training, attached.firearms_training_details)}
                  {row('Threat to Self/Others', attached.threat_to_self_or_others, attached.threat_details)}
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={attaching}
                    onClick={detach}
                    style={{ borderColor: COLORS.blackBlue, color: COLORS.blackBlue }}
                  >
                    {attaching ? 'Removing…' : 'Remove'}
                  </Button>

                  <Button
                    asChild
                    className="h-11 text-base"
                    style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                  >
                    <Link href={`/police/firearmofficer/application/oic?appId=${app.id}`}>Next</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search competency by National ID"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchCompetency()}
                  />
                  <Button
                    className="h-10"
                    onClick={searchCompetency}
                    disabled={searching}
                    style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                  >
                    {searching ? 'Searching…' : 'Search'}
                  </Button>
                </div>

                {results.length === 0 ? (
                  <div
                    className="rounded-md border p-4 text-sm"
                    style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}
                  >
                    Search by National ID to find competency records.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map(c => (
                      <div
                        key={c.id}
                        className="rounded-md border p-4"
                        style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
                      >
                        <div className="text-base font-semibold" style={{ color: COLORS.blackBlue }}>
                          {c.full_name}
                        </div>
                        <div className="text-sm" style={{ color: COLORS.lamar }}>
                          National ID: {c.national_id}
                        </div>

                        <div className="pt-3">
                          <Button
                            className="h-10"
                            disabled={attaching}
                            onClick={() => attachToApp(c)}
                            style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                          >
                            {attaching ? 'Attaching…' : 'Attach'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    asChild
                    className="h-11 text-base"
                    style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                  >
                    <Link href={`/police/firearmofficer/application/oic?appId=${app.id}`}>Next</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ApplicationCompetencyPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <ApplicationCompetencyPageInner />
    </Suspense>
  )
}
