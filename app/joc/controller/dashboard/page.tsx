// app/joc/controller/dashboard/page.tsx
import NavPage from '../nav/page'

export default function ControllerDashboard() {
  return (
    <div className="flex min-h-screen">
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      <div className="w-3/4 p-6">
        <h1 className="text-2xl font-bold">
          JOC – Controller Dashboard
        </h1>
      </div>
    </div>
  )
}
