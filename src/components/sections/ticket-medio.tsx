"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  LineChart,
  Line,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, TrendingUp, Loader2, AlertCircle } from "lucide-react"
import { BRL, NUM, CHART_COLORS, formatMes, formatDia } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface GrupoData {
  nome: string
  ticket_medio: number
  total_atendimentos: number
  receita_total: number
}

interface MensalData {
  categoria: string
  mes: string
  ticket_medio: number
}

interface DiarioData {
  categoria: string
  dia: string
  ticket_medio: number
}

interface ApiResponse {
  grupos: GrupoData[]
  subgrupos: Record<string, GrupoData[]>
  mensalGrupo: MensalData[]
  mensalSubgrupo: Record<string, MensalData[]>
  diarioGrupo: DiarioData[]
  diarioSubgrupo: Record<string, DiarioData[]>
}

export function TicketMedio() {
  const { dataInicio, dataFim, aplicarPeriodo } = usePeriod()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("todos")
  const [granularidade, setGranularidade] = useState<"mensal" | "diario">("mensal")
  const [barGrupoSelecionado, setBarGrupoSelecionado] = useState<string>("todos")

  function selecionarGranularidade(valor: "mensal" | "diario") {
    setGranularidade(valor)
    if (valor === "diario") {
      const dias =
        (new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / 86_400_000
      if (dias > 31) aplicarPeriodo("30 dias")
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(
      `/api/ticket-medio?data_inicio=${dataInicio}&data_fim=${dataFim}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar dados")
        return r.json()
      })
      .then((json: ApiResponse) => {
        setData(json)
        setLoading(false)
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [dataInicio, dataFim])

  const kpis = useMemo(() => {
    if (!data) return null
    const totalReceita = data.grupos.reduce((s, g) => s + g.receita_total, 0)
    const totalAtendimentos = data.grupos.reduce((s, g) => s + g.total_atendimentos, 0)
    const ticketMedioGeral =
      totalAtendimentos > 0 ? totalReceita / totalAtendimentos : 0
    return { totalReceita, totalAtendimentos, ticketMedioGeral }
  }, [data])

  const barData = useMemo(() => {
    if (!data) return []
    if (barGrupoSelecionado === "todos") {
      return data.grupos.map((g, i) => ({
        nome: g.nome,
        ticket_medio: g.ticket_medio,
        receita_total: g.receita_total,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
    }
    const subs = data.subgrupos[barGrupoSelecionado] || []
    return subs.map((s, i) => ({
      nome: s.nome,
      ticket_medio: s.ticket_medio,
      receita_total: s.receita_total,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [data, barGrupoSelecionado])

  const barConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    barData.forEach((item, i) => {
      config[item.nome] = {
        label: item.nome,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }
    })
    config.ticket_medio = { label: "Ticket Médio", color: "var(--chart-1)" }
    return config
  }, [barData])

  const lineData = useMemo(() => {
    if (!data) return []
    const isDiario = granularidade === "diario"
    const source = isDiario
      ? (grupoSelecionado === "todos"
          ? data.diarioGrupo
          : data.diarioSubgrupo[grupoSelecionado] ?? [])
      : (grupoSelecionado === "todos"
          ? data.mensalGrupo
          : data.mensalSubgrupo[grupoSelecionado] ?? [])

    const periodoMap = new Map<string, Record<string, number>>()
    for (const item of source) {
      const periodo = "dia" in item ? item.dia : item.mes
      if (!periodoMap.has(periodo)) periodoMap.set(periodo, {})
      periodoMap.get(periodo)![item.categoria] = item.ticket_medio
    }

    return Array.from(periodoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, valores]) => ({
        mes: isDiario ? formatDia(periodo) : formatMes(periodo),
        ...valores,
      }))
  }, [data, grupoSelecionado, granularidade])

  const lineCategories = useMemo(() => {
    if (!data) return []
    const items = grupoSelecionado === "todos"
      ? data.grupos
      : (data.subgrupos[grupoSelecionado] ?? [])
    return [...items]
      .sort((a, b) => b.ticket_medio - a.ticket_medio)
      .map((g) => g.nome)
  }, [data, grupoSelecionado])

  const lineConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    lineCategories.forEach((cat, i) => {
      config[cat] = {
        label: cat,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }
    })
    return config
  }, [lineCategories])

  const tableData = useMemo(() => {
    if (!data) return []
    if (grupoSelecionado === "todos") return data.grupos
    return data.subgrupos[grupoSelecionado] ?? []
  }, [data, grupoSelecionado])

  return (
    <>
      <div className="border-b pb-1">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Ticket Médio</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">Análise financeira por procedimento</p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando dados...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 py-20 text-destructive">
          <AlertCircle className="size-5" />
          <span>{error}</span>
        </div>
      ) : data && kpis && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <DollarSign className="size-3 sm:size-3.5" />
                  Receita Total
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">
                  {BRL(kpis.totalReceita)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <Users className="size-3 sm:size-3.5" />
                  Atendimentos
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">
                  {NUM(kpis.totalAtendimentos)}
                </CardTitle>
              </CardHeader>
            </Card>
            {data.grupos.map((grupo) => (
              <Card key={grupo.nome}>
                <CardHeader className="p-3 sm:p-6">
                  <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                    <TrendingUp className="size-3 sm:size-3.5" />
                    <span className="truncate">TM — {grupo.nome}</span>
                  </CardDescription>
                  <CardTitle className="text-lg sm:text-2xl">
                    {BRL(grupo.ticket_medio)}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Bar Chart - Ticket Médio por Grupo */}
          <Card>
            <CardHeader className="space-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">
                  {barGrupoSelecionado === "todos"
                    ? "Ticket Médio por Grupo"
                    : `Subgrupos de ${barGrupoSelecionado}`}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {barGrupoSelecionado === "todos"
                    ? "Valor médio por atendimento em cada grupo"
                    : "Valor médio por atendimento em cada subgrupo"}
                </CardDescription>
              </div>
              <Select
                value={barGrupoSelecionado}
                onValueChange={(v) => {
                  if (v !== null) setBarGrupoSelecionado(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:h-8 sm:w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Grupos</SelectItem>
                  {data.grupos.map((g) => (
                    <SelectItem key={g.nome} value={g.nome}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
              <ChartContainer config={barConfig} className="h-[250px] w-full sm:h-[350px]">
                <BarChart
                  data={barData}
                  margin={{ top: 20, right: 10, bottom: 60, left: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="nome"
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    fontSize={12}
                    fontWeight={600}
                    height={70}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$${v}`}
                    fontSize={12}
                    fontWeight={600}
                    width={60}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => BRL(value as number)}
                      />
                    }
                  />
                  <Bar dataKey="ticket_medio" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="ticket_medio"
                      position="top"
                      formatter={(v) => BRL(Number(v))}
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--foreground)"
                      offset={8}
                    />
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Filter + Line Chart */}
          <Card>
            <CardHeader className="space-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">
                  {granularidade === "diario" ? "Evolução Diária" : "Evolução Mensal"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {grupoSelecionado === "todos"
                    ? "Comparação entre grupos"
                    : `Subgrupos de ${grupoSelecionado}`}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={granularidade === "mensal" ? "default" : "outline"}
                    aria-pressed={granularidade === "mensal"}
                    onClick={() => selecionarGranularidade("mensal")}
                  >
                    Mensal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={granularidade === "diario" ? "default" : "outline"}
                    aria-pressed={granularidade === "diario"}
                    onClick={() => selecionarGranularidade("diario")}
                  >
                    Diário
                  </Button>
                </div>
                <Select
                  value={grupoSelecionado}
                  onValueChange={(v) => {
                    if (v !== null) setGrupoSelecionado(v)
                  }}
                >
                  <SelectTrigger className="h-10 w-full sm:h-8 sm:w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Grupos</SelectItem>
                    {data.grupos.map((g) => (
                      <SelectItem key={g.nome} value={g.nome}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
              {lineData.length > 0 ? (
                <div className="flex flex-col gap-4 sm:flex-row">
                  <ChartContainer
                    config={lineConfig}
                    className="h-[250px] min-w-0 flex-1 sm:h-[350px]"
                  >
                    <LineChart
                      data={lineData}
                      margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        interval={granularidade === "diario" ? "preserveStartEnd" : 0}
                        minTickGap={granularidade === "diario" ? 24 : 5}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `R$${v}`}
                        fontSize={10}
                        width={55}
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const sorted = [...payload].sort(
                            (a, b) => (b.value as number) - (a.value as number)
                          )
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-md">
                              <p className="mb-1.5 text-sm font-semibold">{label}</p>
                              {sorted.map((entry) => (
                                <div key={entry.dataKey as string} className="flex items-center gap-2 py-0.5 text-sm">
                                  <span
                                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-muted-foreground">{entry.name}:</span>
                                  <span className="font-medium">{BRL(entry.value as number)}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }}
                      />
                      {lineCategories.map((cat, i) => (
                        <Line
                          key={cat}
                          type="monotone"
                          dataKey={cat}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 sm:w-[140px] sm:flex-col sm:justify-center sm:gap-y-2">
                    {lineCategories.map((cat, i) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {cat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados {granularidade === "diario" ? "diários" : "mensais"} para esta seleção.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Detalhamento</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {grupoSelecionado === "todos"
                    ? "Métricas por grupo de procedimentos"
                    : `Subgrupos de ${grupoSelecionado}`}
                </CardDescription>
              </div>
              {grupoSelecionado !== "todos" && (
                <Badge variant="secondary" className="mt-2 sm:mt-0">{grupoSelecionado}</Badge>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              {/* Mobile: card list */}
              <div className="space-y-3 sm:hidden">
                {tableData.map((row) => (
                  <div key={row.nome} className="rounded-lg border p-3 space-y-2">
                    <p className="font-medium text-sm">{row.nome}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Ticket Médio</p>
                        <p className="font-medium">{BRL(row.ticket_medio)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Atendimentos</p>
                        <p className="font-medium">{NUM(row.total_atendimentos)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Receita</p>
                        <p className="font-medium">{BRL(row.receita_total)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {grupoSelecionado === "todos" ? "Grupo" : "Subgrupo"}
                      </TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">Receita Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row) => (
                      <TableRow key={row.nome}>
                        <TableCell className="font-medium">{row.nome}</TableCell>
                        <TableCell className="text-right">{BRL(row.ticket_medio)}</TableCell>
                        <TableCell className="text-right">{NUM(row.total_atendimentos)}</TableCell>
                        <TableCell className="text-right">{BRL(row.receita_total)}</TableCell>
                      </TableRow>
                    ))}
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
