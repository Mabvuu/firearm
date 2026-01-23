// app/joc/oic/dashboard/page.tsx
import NavPage from '../nav/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function JOCOICDashboard() {
  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 border-r bg-background md:block">
        <NavPage />
      </aside>

      {/* Main */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Dashboard
                </h1>
                <Badge variant="outline">JOC Officer In Charge</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Overview of your queue and recent activity.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              System • JOC
            </div>
          </div>

          <Separator />

          {/* Top stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending in Inbox
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">—</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Assigned to you
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">—</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Completed by you
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Returned / Declined
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">—</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Requires follow-up
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">—</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Latest activity
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main panels */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Jump straight to the work that matters.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <a
                  href="/joc/oic/application"
                  className="rounded-lg border bg-background p-4 hover:bg-muted/30 transition"
                >
                  <div className="text-sm font-semibold">Open Inbox</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Review assigned applications
                  </div>
                </a>

                <a
                  href="/joc/oic/records"
                  className="rounded-lg border bg-background p-4 hover:bg-muted/30 transition"
                >
                  <div className="text-sm font-semibold">View Records</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Check verified firearm records
                  </div>
                </a>

                <a
                  href="/joc/oic/reports"
                  className="rounded-lg border bg-background p-4 hover:bg-muted/30 transition"
                >
                  <div className="text-sm font-semibold">Reports</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Summary and export views
                  </div>
                </a>

                <a
                  href="/joc/oic/profile"
                  className="rounded-lg border bg-background p-4 hover:bg-muted/30 transition"
                >
                  <div className="text-sm font-semibold">Profile</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Your account and settings
                  </div>
                </a>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Tips</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Keep reviews consistent.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="font-medium">Use short notes</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Write facts only. Avoid emotion or assumptions.
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium">Check attachments</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Confirm all required docs are present before forwarding.
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium">Correct routing</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Assign JOC MID after approval to prevent delays.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile note */}
          <div className="md:hidden rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            Tip: Use a wider screen to see the sidebar navigation.
          </div>
        </div>
      </main>
    </div>
  )
}
