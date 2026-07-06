"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
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
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { Users, Loader2 } from "lucide-react"
import { NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface SolicitacaoItem {
  medico: string
  total_solicitacoes: number
}

interface SolicitacaoResponse {
  dados: SolicitacaoItem[]
  total: number
}

const solicitChartConfig: ChartConfig = {
  total_solicitacoes: { label: "Solicitações", color: "var(--chart-1)" },
}

export function Solicitacoes() {
  const { dataInicio, dataFim, empresaId } = usePeriod()
  const [solicitData, setSolicitData] = useState<SolicitacaoResponse | null>(null)
  const [solicitLoading, setSolicitLoading] = useState(true)
  const [solicitApenasComMedico, setSolicitApenasComMedico] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setSolicitLoading(true)

    fetch(
      `/api/solicitacoes?data_inicio=${dataInicio}&data_fim=${dataFim}&empresa_id=${empresaId}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar solicitações")
        return r.json()
      })
      .then((json: SolicitacaoResponse) => {
        setSolicitData(json)
        setSolicitLoading(false)
      })
      .catch((e) => {
        if (e.name !== "AbortError") setSolicitLoading(false)
      })

    return () => controller.abort()
  }, [dataInicio, dataFim, empresaId])

  const solicitFiltered = useMemo(() => {
    if (!solicitData) return { dados: [], total: 0 }
    const dados = solicitApenasComMedico
      ? solicitData.dados.filter((d) => d.medico !== "Sem Médico")
      : solicitData.dados
    const total = dados.reduce((s, d) => s + d.total_solicitacoes, 0)
    return { dados, total }
  }, [solicitData, solicitApenasComMedico])

  return (
    <>
      <div className="border-b pb-1 pt-2">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Solicitações Médicas</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">Exames solicitados por médico</p>
      </div>

      {solicitLoading && !solicitData ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando solicitações...</span>
        </div>
      ) : solicitData && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <Users className="size-3 sm:size-3.5" />
                  Total de Solicitações
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">
                  {NUM(solicitFiltered.total)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Bar Chart - Horizontal */}
          <Card>
            <CardHeader className="space-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Solicitações por Médico</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Top 20 médicos solicitantes</CardDescription>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={solicitApenasComMedico}
                  onChange={(e) => setSolicitApenasComMedico(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-muted-foreground text-xs sm:text-sm">Apenas com médico</span>
              </label>
            </CardHeader>
            <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
              {solicitLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ChartContainer config={solicitChartConfig} className="w-full" style={{ height: Math.max(300, solicitFiltered.dados.length * 36 + 40) }}>
                  <BarChart
                    data={solicitFiltered.dados}
                    layout="vertical"
                    margin={{ top: 5, right: 40, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="medico"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      fontWeight={600}
                      width={140}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      fontWeight={600}
                      height={30}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const val = payload[0].value as number
                        const pct = solicitFiltered.total > 0
                          ? ((val / solicitFiltered.total) * 100).toFixed(1)
                          : "0.0"
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <p className="mb-1 text-sm font-semibold">{label}</p>
                            <p className="text-sm">{NUM(val)} ({pct}%)</p>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="total_solicitacoes"
                      fill="var(--chart-1)"
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey="total_solicitacoes"
                        position="right"
                        formatter={(v) => NUM(Number(v))}
                        fontSize={11}
                        fontWeight={600}
                        fill="var(--foreground)"
                        offset={6}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Table - Solicitações */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Detalhamento de Solicitações</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Quantidade de exames por médico solicitante</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              {/* Mobile: card list */}
              <div className="space-y-3 sm:hidden">
                {solicitFiltered.dados.map((row) => {
                  const pct = solicitFiltered.total > 0 ? ((row.total_solicitacoes / solicitFiltered.total) * 100).toFixed(1) : "0.0"
                  return (
                    <div key={row.medico} className="rounded-lg border p-3 space-y-2">
                      <p className="font-medium text-sm">{row.medico}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Solicitações</p>
                          <p className="font-medium">{NUM(row.total_solicitacoes)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">%</p>
                          <p className="font-medium">{pct}%</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Desktop: table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">Solicitações</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitFiltered.dados.map((row) => {
                      const pct = solicitFiltered.total > 0 ? ((row.total_solicitacoes / solicitFiltered.total) * 100).toFixed(1) : "0.0"
                      return (
                        <TableRow key={row.medico}>
                          <TableCell className="font-medium">{row.medico}</TableCell>
                          <TableCell className="text-right">{NUM(row.total_solicitacoes)}</TableCell>
                          <TableCell className="text-right">{pct}%</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
