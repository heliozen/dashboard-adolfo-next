"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EMPRESAS, PERIOD_PRESETS } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

const NAV_ITEMS = [
  { href: "/painel-diario", label: "Orçamentos/Atendimentos", icon: LayoutDashboard },
  { href: "/ticket-medio", label: "Ticket Médio", icon: TrendingUp },
  { href: "/produtividade", label: "Produtividade", icon: Activity },
  { href: "/pessoas-lab", label: "Pessoas / Lab", icon: Users },
]

function EmpresaFilter() {
  const { empresaId, setEmpresaId } = usePeriod()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium text-muted-foreground sm:text-sm">Unidade:</span>
      {EMPRESAS.map((empresa) => (
        <Button
          key={empresa.id}
          type="button"
          size="sm"
          variant={empresaId === empresa.id ? "default" : "outline"}
          aria-pressed={empresaId === empresa.id}
          onClick={() => setEmpresaId(empresa.id)}
        >
          {empresa.label}
        </Button>
      ))}
    </div>
  )
}

function PeriodFilter() {
  const { dataInicio, dataFim, periodoAtivo, setDataInicio, setDataFim, aplicarPeriodo } = usePeriod()
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {PERIOD_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            size="sm"
            variant={periodoAtivo === preset.label ? "default" : "outline"}
            aria-pressed={periodoAtivo === preset.label}
            onClick={() => aplicarPeriodo(preset.label)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={periodoAtivo === "personalizado" ? "default" : "outline"}
          aria-pressed={periodoAtivo === "personalizado"}
          onClick={() => aplicarPeriodo("personalizado")}
        >
          Personalizado
        </Button>
      </div>
      {periodoAtivo === "personalizado" && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="data-inicio" className="text-sm text-muted-foreground">De</label>
            <input
              id="data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 sm:h-8 sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="data-fim" className="text-sm text-muted-foreground">Até</label>
            <input
              id="data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 sm:h-8 sm:w-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 border-r bg-card sm:flex sm:flex-col">
        <div className="border-b px-4 py-4">
          <Image
            src="/logo-adolfo-lutz.png"
            alt="Adolfo Lutz"
            width={2069}
            height={822}
            priority
            className="h-auto w-full"
          />
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 space-y-3 border-b bg-card px-4 py-3 sm:px-6 sm:py-4">
          {/* Logo (mobile) */}
          <Image
            src="/logo-adolfo-lutz.png"
            alt="Adolfo Lutz"
            width={2069}
            height={822}
            priority
            className="h-7 w-auto sm:hidden"
          />
          {/* Mobile nav */}
          <nav className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <EmpresaFilter />
            <PeriodFilter />
          </div>
        </header>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
