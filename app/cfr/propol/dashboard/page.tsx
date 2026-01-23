// app/cfr/propol/dashboard/page.tsx
import NavPage from '../nav/page'

export default function PropolDashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Left nav – 1/4 */}
      <div className="w-1/4 border-r">
        <NavPage />
      </div>

      {/* Right system – 3/4 */}
      <div className="w-3/4 p-6">
        <h1 className="text-2xl font-bold">
          CFR – Province Police Dashboard
        </h1>
      </div>
    </div>
  )
}
