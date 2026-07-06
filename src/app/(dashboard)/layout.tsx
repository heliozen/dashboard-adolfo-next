import { cookies } from "next/headers"
import { PeriodProvider } from "@/components/period-context"
import { DashboardShell } from "@/components/dashboard-shell"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = verifySessionToken(token)

  return (
    <PeriodProvider>
      <DashboardShell userName={session?.nome ?? ""}>{children}</DashboardShell>
    </PeriodProvider>
  )
}
