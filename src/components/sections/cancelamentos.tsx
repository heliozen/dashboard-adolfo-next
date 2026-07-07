"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarX, Loader2 } from "lucide-react"
import { NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface Contagem {
  label: string
  total: number
  pct: number
}

interface CancelamentoResponse {
  total: number
  porMotivo: Contagem[]
  porMedico: Contagem[]
}

function TabelaContagem({
  rows,
  colLabel,
  colValor = "Cancelamentos",
}: {
  rows: Contagem[]
  colLabel: string
  colValor?: string
}) {
  return (
    <>
      {/* Mobile */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">{row.label}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">{colValor}</p>
                <p className="font-medium">{NUM(row.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">%</p>
                <p className="font-medium">{row.pct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{colLabel}</TableHead>
              <TableHead className="text-right">{colValor}</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{NUM(row.total)}</TableCell>
                <TableCell className="text-right">{row.pct.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export function Cancelamentos() {
  const { dataInicio, dataFim, empresaId } = usePeriod()
  const [data, setData] = useState<CancelamentoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [apenasComMedico, setApenasComMedico] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setErro(null)

    fetch(
      `/api/cancelamentos?data_inicio=${dataInicio}&data_fim=${dataFim}&empresa_id=${empresaId}`,
      { signal: controller.signal }
    )
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => null)
          throw new Error(j?.error ?? "Erro ao carregar cancelamentos")
        }
        return r.json()
      })
      .then((json: CancelamentoResponse) => {
        setData(json)
        setLoading(false)
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setErro(e.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [dataInicio, dataFim, empresaId])

  return (
    <>
      <div className="border-b pb-1 pt-2">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Cancelamentos</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Agendamentos (vagas) cancelados por motivo e por médico
        </p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando cancelamentos...</span>
        </div>
      ) : erro ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {erro}
        </div>
      ) : data && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <CalendarX className="size-3 sm:size-3.5 text-orange-500" />
                  Total de Cancelamentos
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">{NUM(data.total)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {data.total === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum cancelamento no período selecionado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                  <div className="space-y-1">
                    <CardTitle className="text-base sm:text-lg">Por Motivo</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Motivo do cancelamento</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <TabelaContagem rows={data.porMotivo} colLabel="Motivo" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-6">
                  <div className="space-y-1">
                    <CardTitle className="text-base sm:text-lg">Por Médico</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Top 20 médicos (agendamentos cancelados)</CardDescription>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={apenasComMedico}
                      onChange={(e) => setApenasComMedico(e.target.checked)}
                      className="size-4 rounded border-input accent-primary"
                    />
                    <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">Apenas com médico</span>
                  </label>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <TabelaContagem
                    rows={apenasComMedico ? data.porMedico.filter((r) => r.label !== "Sem Médico") : data.porMedico}
                    colLabel="Médico"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  )
}
