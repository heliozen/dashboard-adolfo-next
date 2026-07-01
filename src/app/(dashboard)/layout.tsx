import { PeriodProvider } from "@/components/period-context"
import { DashboardShell } from "@/components/dashboard-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PeriodProvider>
      <DashboardShell>{children}</DashboardShell>
    </PeriodProvider>
  )
}
