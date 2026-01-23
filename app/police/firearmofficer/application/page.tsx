// app/police/firearmofficer/application/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import NavPage from '../nav/page'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  applicant_email: string
  national_id: string
  address: string
  phone: string
  province: string
  district: string
  gun_uid: number | null
  status: string
  attachments: string[] | null
  competency_id: number | null
  oic_email: string | null
}

type Gun = {
  id: number
  make: string
  model: string
  caliber: string | null
  serial: string | null
}

const statusDot = (status: string) => {
  switch (status) {
    case 'unread':
      return { bg: '#3E5C80', label: 'Unread' }
    case 'forwarded':
      return { bg: '#212B37', label: 'Forwarded' }
    case 'returned':
      return { bg: '#ACACAC', label: 'Returned' }
    default:
      return { bg: '#D9D8D6', label: status || 'Unknown' }
  }
}

// order: attachments -> competency -> oic
const nextStep = (app: Application) => {
  const hasAttachments = (app.attachments?.length ?? 0) > 0
  const hasCompetency = !!app.competency_id
  const hasOic = !!app.oic_email

  if (!hasAttachments) {
    return {
      label: 'Next: Attachments',
      href: `/police/firearmofficer/application/attachments?appId=${app.id}`,
      done: false,
    }
  }

  if (!hasCompetency) {
    return {
      label: 'Next: Competency',
      href: `/police/firearmofficer/application/competency?appId=${app.id}`,
      done: false,
    }
  }

  if (!hasOic) {
    return {
      label: 'Next: Forward to OIC',
      href: `/police/firearmofficer/application/oic?appId=${app.id}`,
      done: false,
    }
  }

  return { label: 'Completed', href: '', done: true }
}

export default function FirearmOfficerApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [guns, setGuns] = useState<Record<number, Gun | null>>({})
  const [loading, setLoading] = useState(true)

  const requestedGunIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    const loadApps = async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user?.email) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('officer_email', user.email)
        .order('created_at', { ascending: false })

      if (error) {
        // keep it simple like your other pages
        alert(error.message)
        setLoading(false)
        return
      }

      setApps((data as Application[]) ?? [])
      setLoading(false)
    }

    loadApps()
  }, [])

  useEffect(() => {
    const loadGun = async (gunId: number) => {
      if (requestedGunIds.current.has(gunId)) return
      requestedGunIds.current.add(gunId)

      const { data, error } = await supabase
        .from('inventory')
        .select('id, make, model, caliber, serial')
        .eq('id', gunId)
        .maybeSingle()

      if (error) return

      setGuns(prev => ({
        ...prev,
        [gunId]: (data as Gun) ?? null,
      }))
    }

    apps.forEach(app => {
      if (app.gun_uid) loadGun(app.gun_uid)
    })
  }, [apps])

  if (loading)
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
        <div className="mb-4">
          <h1 className="text-3xl font-semibold" style={{ color: COLORS.blackBlue }}>
            Assigned Applications
          </h1>
          <p className="mt-1 text-sm" style={{ color: COLORS.lamar }}>
            Open an application, review details, then follow the next step.
          </p>
        </div>

        <Card style={{ borderColor: COLORS.naturalAluminum }}>
          <CardHeader className="border-b" style={{ borderColor: COLORS.naturalAluminum }}>
            <CardTitle className="text-lg" style={{ color: COLORS.blackBlue }}>
              Applications
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            {apps.length === 0 ? (
              <div
                className="rounded-md border p-4 text-sm"
                style={{ borderColor: COLORS.naturalAluminum, color: COLORS.coolGreyMedium }}
              >
                No applications assigned to you yet.
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-3">
                {apps.map(app => {
                  const step = nextStep(app)
                  const dot = statusDot(app.status)

                  return (
                    <AccordionItem
                      key={app.id}
                      value={String(app.id)}
                      className="rounded-md border"
                      style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
                    >
                      <AccordionTrigger className="flex items-center gap-3 px-4 py-3 hover:no-underline">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dot.bg }} />

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <div className="text-base font-semibold" style={{ color: COLORS.blackBlue }}>
                              {app.applicant_name}
                            </div>
                            <span className="text-xs" style={{ color: COLORS.coolGreyMedium }}>
                              #{app.id}
                            </span>
                          </div>

                          <div className="text-xs" style={{ color: COLORS.lamar }}>
                            Dealer: {app.applicant_email}
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          style={{
                            borderColor: COLORS.naturalAluminum,
                            color: COLORS.blackBlue,
                            backgroundColor: COLORS.snowWhite,
                          }}
                        >
                          {dot.label}
                        </Badge>
                      </AccordionTrigger>

                      <AccordionContent className="px-4 pb-4">
                        <div
                          className="rounded-md border p-4"
                          style={{
                            borderColor: COLORS.naturalAluminum,
                            backgroundColor: COLORS.snowWhite,
                          }}
                        >
                          <div className="mb-2 text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                            Applicant Details
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                            <div style={{ color: COLORS.blackBlue }}>
                              <b>National ID:</b> {app.national_id}
                            </div>
                            <div style={{ color: COLORS.blackBlue }}>
                              <b>Phone:</b> {app.phone}
                            </div>
                            <div style={{ color: COLORS.blackBlue }}>
                              <b>Address:</b> {app.address}
                            </div>
                            <div style={{ color: COLORS.blackBlue }}>
                              <b>Province:</b> {app.province}
                            </div>
                            <div style={{ color: COLORS.blackBlue }}>
                              <b>District:</b> {app.district}
                            </div>
                          </div>
                        </div>

                        <div
                          className="mt-4 rounded-md border p-4"
                          style={{ borderColor: COLORS.naturalAluminum, backgroundColor: '#fff' }}
                        >
                          <div className="mb-2 text-sm font-semibold" style={{ color: COLORS.blackBlue }}>
                            Firearm Details
                          </div>

                          {!app.gun_uid ? (
                            <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                              No firearm linked.
                            </div>
                          ) : guns[app.gun_uid] ? (
                            <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                              <div style={{ color: COLORS.blackBlue }}>
                                <b>Make:</b> {guns[app.gun_uid]!.make}
                              </div>
                              <div style={{ color: COLORS.blackBlue }}>
                                <b>Model:</b> {guns[app.gun_uid]!.model}
                              </div>
                              <div style={{ color: COLORS.blackBlue }}>
                                <b>Caliber:</b> {guns[app.gun_uid]!.caliber ?? '—'}
                              </div>
                              <div style={{ color: COLORS.blackBlue }}>
                                <b>Serial:</b> {guns[app.gun_uid]!.serial ?? '—'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm" style={{ color: COLORS.coolGreyMedium }}>
                              Loading firearm…
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: COLORS.naturalAluminum,
                              color: COLORS.blackBlue,
                              backgroundColor: COLORS.snowWhite,
                            }}
                          >
                            Attachments: {app.attachments?.length ?? 0}
                          </Badge>

                          <Badge
                            variant="outline"
                            style={{
                              borderColor: COLORS.naturalAluminum,
                              color: COLORS.blackBlue,
                              backgroundColor: COLORS.snowWhite,
                            }}
                          >
                            Competency: {app.competency_id ? 'Attached' : 'Missing'}
                          </Badge>

                          <Badge
                            variant="outline"
                            style={{
                              borderColor: COLORS.naturalAluminum,
                              color: COLORS.blackBlue,
                              backgroundColor: COLORS.snowWhite,
                            }}
                          >
                            OIC: {app.oic_email ? 'Sent' : 'Not sent'}
                          </Badge>
                        </div>

                        <div className="mt-4 flex justify-end">
                          {step.done ? (
                            <Button
                              size="sm"
                              disabled
                              className="h-10 px-4"
                              style={{ backgroundColor: COLORS.naturalAluminum, color: COLORS.blackBlue }}
                            >
                              {step.label}
                            </Button>
                          ) : (
                            <Button
                              asChild
                              size="sm"
                              className="h-10 px-4"
                              style={{ backgroundColor: COLORS.blackBlue, color: COLORS.snowWhite }}
                            >
                              <Link href={step.href}>{step.label}</Link>
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
