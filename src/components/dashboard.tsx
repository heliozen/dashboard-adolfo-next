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
import { DollarSign, Users, TrendingUp, Loader2, AlertCircle } from "lucide-react"

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

interface ApiResponse {
  grupos: GrupoData[]
  subgrupos: Record<string, GrupoData[]>
  mensalGrupo: MensalData[]
  mensalSubgrupo: Record<string, MensalData[]>
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const NUM = (v: number) => v.toLocaleString("pt-BR")

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getDefaultDates() {
  const now = new Date()
  const fim = toISO(now)
  const inicio = toISO(new Date(now.getFullYear(), now.getMonth() - 5, 1))
  return { inicio, fim }
}

type PeriodPreset = { label: string; getDates: () => { inicio: string; fim: string } }

const PERIOD_PRESETS: PeriodPreset[] = [
  {
    label: "7 dias",
    getDates: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 6)
      return { inicio: toISO(start), fim: toISO(now) }
    },
  },
  {
    label: "15 dias",
    getDates: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 14)
      return { inicio: toISO(start), fim: toISO(now) }
    },
  },
  {
    label: "30 dias",
    getDates: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 29)
      return { inicio: toISO(start), fim: toISO(now) }
    },
  },
  {
    label: "Mês atual",
    getDates: () => {
      const now = new Date()
      return {
        inicio: toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
        fim: toISO(now),
      }
    },
  },
  {
    label: "Mês anterior",
    getDates: () => {
      const now = new Date()
      return {
        inicio: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        fim: toISO(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    },
  },
  {
    label: "3 meses",
    getDates: () => {
      const now = new Date()
      return {
        inicio: toISO(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
        fim: toISO(now),
      }
    },
  },
  {
    label: "6 meses",
    getDates: () => {
      const now = new Date()
      return {
        inicio: toISO(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
        fim: toISO(now),
      }
    },
  },
  {
    label: "Ano atual",
    getDates: () => {
      const now = new Date()
      return {
        inicio: toISO(new Date(now.getFullYear(), 0, 1)),
        fim: toISO(now),
      }
    },
  },
]

function formatMes(mes: string) {
  const [year, month] = mes.split("-")
  const names = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ]
  return `${names[parseInt(month) - 1]}/${year.slice(2)}`
}

export default function Dashboard() {
  const defaults = getDefaultDates()
  const [dataInicio, setDataInicio] = useState(defaults.inicio)
  const [dataFim, setDataFim] = useState(defaults.fim)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("todos")
  const [barGrupoSelecionado, setBarGrupoSelecionado] = useState<string>("todos")
  const [periodoAtivo, setPeriodoAtivo] = useState("6 meses")

  function aplicarPeriodo(valor: string | null) {
    if (!valor) return
    setPeriodoAtivo(valor)
    if (valor === "personalizado") return
    const preset = PERIOD_PRESETS.find((p) => p.label === valor)
    if (preset) {
      const { inicio, fim } = preset.getDates()
      setDataInicio(inicio)
      setDataFim(fim)
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

  // KPIs
  const kpis = useMemo(() => {
    if (!data) return null
    const totalReceita = data.grupos.reduce((s, g) => s + g.receita_total, 0)
    const totalAtendimentos = data.grupos.reduce(
      (s, g) => s + g.total_atendimentos,
      0
    )
    const ticketMedioGeral =
      totalAtendimentos > 0 ? totalReceita / totalAtendimentos : 0
    return { totalReceita, totalAtendimentos, ticketMedioGeral }
  }, [data])

  // Chart data for bar chart
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

  // Line chart data - monthly evolution
  const lineData = useMemo(() => {
    if (!data) return []
    const source =
      grupoSelecionado === "todos"
        ? data.mensalGrupo
        : data.mensalSubgrupo[grupoSelecionado] ?? []

    const mesesMap = new Map<string, Record<string, number>>()
    for (const item of source) {
      if (!mesesMap.has(item.mes)) mesesMap.set(item.mes, {})
      mesesMap.get(item.mes)![item.categoria] = item.ticket_medio
    }

    return Array.from(mesesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valores]) => ({ mes: formatMes(mes), ...valores }))
  }, [data, grupoSelecionado])

  const lineCategories = useMemo(() => {
    if (!data) return []
    if (grupoSelecionado === "todos") {
      return data.grupos.map((g) => g.nome)
    }
    return (data.subgrupos[grupoSelecionado] ?? []).map((s) => s.nome)
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

  // Table data
  const tableData = useMemo(() => {
    if (!data) return []
    if (grupoSelecionado === "todos") return data.grupos
    return data.subgrupos[grupoSelecionado] ?? []
  }, [data, grupoSelecionado])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-7xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Dashboard Adolfo Lutz
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Análise de ticket médio por procedimento
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select value={periodoAtivo} onValueChange={aplicarPeriodo}>
              <SelectTrigger className="h-10 w-full text-sm sm:h-8 sm:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodoAtivo === "personalizado" && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="data-inicio" className="text-sm text-muted-foreground">
                    De
                  </label>
                  <input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 sm:h-8 sm:w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="data-fim" className="text-sm text-muted-foreground">
                    Até
                  </label>
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
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando dados...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 py-20 text-destructive">
              <AlertCircle className="size-5" />
              <span>{error}</span>
            </div>
          )}

          {data && kpis && !loading && (
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
                            formatter={(value) =>
                              BRL(value as number)
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="ticket_medio"
                        radius={[4, 4, 0, 0]}
                      >
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
                    <CardTitle className="text-base sm:text-lg">Evolução Mensal</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {grupoSelecionado === "todos"
                        ? "Comparação entre grupos"
                        : `Subgrupos de ${grupoSelecionado}`}
                    </CardDescription>
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
                </CardHeader>
                <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
                  {lineData.length > 0 ? (
                    <ChartContainer
                      config={lineConfig}
                      className="h-[270px] w-full overflow-visible sm:h-[370px] [&_.recharts-surface]:overflow-visible"
                    >
                      <LineChart
                        data={lineData}
                        margin={{ top: 30, right: 100, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="mes"
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `R$${v}`}
                          fontSize={10}
                          width={55}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                BRL(value as number)
                              }
                            />
                          }
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
                          >
                            <LabelList
                              dataKey={cat}
                              position="right"
                              content={({ x, y, index }) => {
                                if (index !== lineData.length - 1) return null
                                return (
                                  <text
                                    x={Number(x) + 8}
                                    y={Number(y)}
                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                    fontSize={11}
                                    fontWeight={600}
                                    dominantBaseline="middle"
                                  >
                                    {cat}
                                  </text>
                                )
                              }}
                            />
                          </Line>
                        ))}
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      Sem dados mensais para esta seleção.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Table - Card layout on mobile, table on desktop */}
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
                      <div
                        key={row.nome}
                        className="rounded-lg border p-3 space-y-2"
                      >
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
                            <TableCell className="text-right">
                              {BRL(row.ticket_medio)}
                            </TableCell>
                            <TableCell className="text-right">
                              {NUM(row.total_atendimentos)}
                            </TableCell>
                            <TableCell className="text-right">
                              {BRL(row.receita_total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
