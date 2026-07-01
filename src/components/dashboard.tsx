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
import { DollarSign, Users, TrendingUp, Loader2, AlertCircle, CheckCircle } from "lucide-react"

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

interface SolicitacaoItem {
  medico: string
  total_solicitacoes: number
}

interface SolicitacaoResponse {
  dados: SolicitacaoItem[]
  total: number
}

interface AtendimentoItem {
  categoria: string
  atendidos: number
  nao_realizados: number
}

interface AtendimentoResponse {
  dados: AtendimentoItem[]
  totais: {
    atendidos: number
    nao_realizados: number
    taxa_realizacao: number
  }
}

interface ComparecimentoItem {
  categoria: string
  atendidos: number
  agendados: number
  taxa: number
}

interface ComparecimentoResponse {
  dados: ComparecimentoItem[]
}

interface OrcamentoStatus {
  orcamentos: number
  valor: number
}

interface OrcamentoResponse {
  pendente: OrcamentoStatus
  parcial: OrcamentoStatus
  realizado: OrcamentoStatus
  total: OrcamentoStatus
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
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "var(--chart-11)",
  "var(--chart-12)",
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

function formatDia(dia: string) {
  const [, month, day] = dia.split("-")
  return `${day}/${month}`
}

export default function Dashboard() {
  const defaults = getDefaultDates()
  const [dataInicio, setDataInicio] = useState(defaults.inicio)
  const [dataFim, setDataFim] = useState(defaults.fim)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("todos")
  const [granularidade, setGranularidade] = useState<"mensal" | "diario">("mensal")
  const [barGrupoSelecionado, setBarGrupoSelecionado] = useState<string>("todos")
  const [periodoAtivo, setPeriodoAtivo] = useState("6 meses")
  const [atendData, setAtendData] = useState<AtendimentoResponse | null>(null)
  const [atendLoading, setAtendLoading] = useState(true)
  const [atendAgrupamento, setAtendAgrupamento] = useState<"grupo" | "medico">("grupo")
  const [atendApenasComMedico, setAtendApenasComMedico] = useState(false)
  const [compData, setCompData] = useState<ComparecimentoResponse | null>(null)
  const [compLoading, setCompLoading] = useState(true)
  const [orcData, setOrcData] = useState<OrcamentoResponse | null>(null)
  const [orcLoading, setOrcLoading] = useState(true)
  const [solicitData, setSolicitData] = useState<SolicitacaoResponse | null>(null)
  const [solicitLoading, setSolicitLoading] = useState(true)
  const [solicitApenasComMedico, setSolicitApenasComMedico] = useState(false)

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

  function selecionarGranularidade(valor: "mensal" | "diario") {
    setGranularidade(valor)
    // No diário, forçar um período curto quando o atual for muito longo
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

  useEffect(() => {
    const controller = new AbortController()
    setAtendLoading(true)

    fetch(
      `/api/atendimentos?data_inicio=${dataInicio}&data_fim=${dataFim}&agrupamento=${atendAgrupamento}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar dados de atendimentos")
        return r.json()
      })
      .then((json: AtendimentoResponse) => {
        setAtendData(json)
        setAtendLoading(false)
      })
      .catch((e) => {
        if (e.name !== "AbortError") setAtendLoading(false)
      })

    return () => controller.abort()
  }, [dataInicio, dataFim, atendAgrupamento])

  useEffect(() => {
    const controller = new AbortController()
    setCompLoading(true)

    fetch(
      `/api/comparecimento?data_inicio=${dataInicio}&data_fim=${dataFim}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar comparecimento")
        return r.json()
      })
      .then((json: ComparecimentoResponse) => {
        setCompData(json)
        setCompLoading(false)
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCompLoading(false)
      })

    return () => controller.abort()
  }, [dataInicio, dataFim])

  useEffect(() => {
    const controller = new AbortController()
    setOrcLoading(true)

    fetch(
      `/api/orcamento?data_inicio=${dataInicio}&data_fim=${dataFim}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar orçamentos")
        return r.json()
      })
      .then((json: OrcamentoResponse) => {
        setOrcData(json)
        setOrcLoading(false)
      })
      .catch((e) => {
        if (e.name !== "AbortError") setOrcLoading(false)
      })

    return () => controller.abort()
  }, [dataInicio, dataFim])

  useEffect(() => {
    const controller = new AbortController()
    setSolicitLoading(true)

    fetch(
      `/api/solicitacoes?data_inicio=${dataInicio}&data_fim=${dataFim}`,
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

  const atendChartConfig: ChartConfig = {
    atendidos: { label: "Atendidos", color: "hsl(142, 71%, 45%)" },
    nao_realizados: { label: "Não Realizados", color: "hsl(0, 84%, 60%)" },
  }

  const compChartConfig: ChartConfig = {
    taxa: { label: "Comparecimento (%)", color: "var(--chart-1)" },
  }

  const solicitChartConfig: ChartConfig = {
    total_solicitacoes: { label: "Solicitações", color: "var(--chart-1)" },
  }

  const solicitFiltered = useMemo(() => {
    if (!solicitData) return { dados: [], total: 0 }
    const dados = solicitApenasComMedico
      ? solicitData.dados.filter((d) => d.medico !== "Sem Médico")
      : solicitData.dados
    const total = dados.reduce((s, d) => s + d.total_solicitacoes, 0)
    return { dados, total }
  }, [solicitData, solicitApenasComMedico])

  // Butterfly chart data: atendidos negativos (esquerda), não realizados positivos (direita)
  const atendDadosFiltrados = useMemo(() => {
    if (!atendData) return []
    if (atendApenasComMedico && atendAgrupamento === "medico") {
      return atendData.dados.filter((d) => d.categoria !== "Sem Médico")
    }
    return atendData.dados
  }, [atendData, atendApenasComMedico, atendAgrupamento])

  const butterflyData = useMemo(() => {
    return atendDadosFiltrados.map((d) => ({
      categoria: d.categoria,
      atendidos: d.atendidos,
      nao_realizados: -d.nao_realizados,
      _atendidos: d.atendidos,
      _nao_realizados: d.nao_realizados,
    }))
  }, [atendDadosFiltrados])

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
              Métricas das clínicas Adolfo Lutz
            </p>
          </div>
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
              {/* Seção: Ticket Médio */}
              <div className="border-b pb-1">
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">Ticket Médio</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">Análise financeira por procedimento</p>
              </div>

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
              {/* Seção: Atendidos vs Não Realizados */}
              <div className="border-b pb-1 pt-2">
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">Atendimentos</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">Pacientes atendidos vs não realizados</p>
              </div>

              {atendLoading && !atendData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando atendimentos...</span>
                </div>
              ) : atendData && (
                <>
                  {/* KPI Cards - Atendimentos */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <CheckCircle className="size-3 sm:size-3.5 text-green-600" />
                          Atendidos
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl">
                          {NUM(atendData.totais.atendidos)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <AlertCircle className="size-3 sm:size-3.5 text-orange-500" />
                          Não Realizados
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl">
                          {NUM(atendData.totais.nao_realizados)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <TrendingUp className="size-3 sm:size-3.5" />
                          Taxa de Realização
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl">
                          {atendData.totais.taxa_realizacao.toFixed(1)}%
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Stacked Bar Chart */}
                  <Card>
                    <CardHeader className="space-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-6">
                      <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg">
                          Atendidos vs Não Realizados
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {atendAgrupamento === "grupo"
                            ? "Comparação por grupo de procedimentos"
                            : "Comparação por médico (top 15)"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <Select
                          value={atendAgrupamento}
                          onValueChange={(v) => {
                            if (v === "grupo" || v === "medico") setAtendAgrupamento(v)
                          }}
                        >
                          <SelectTrigger className="h-10 w-full sm:h-8 sm:w-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grupo">Por Grupo</SelectItem>
                            <SelectItem value="medico">Por Médico</SelectItem>
                          </SelectContent>
                        </Select>
                        {atendAgrupamento === "medico" && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={atendApenasComMedico}
                              onChange={(e) => setAtendApenasComMedico(e.target.checked)}
                              className="size-4 rounded border-input accent-primary"
                            />
                            <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">Apenas com médico</span>
                          </label>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
                      {atendLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                        <div className="flex items-center justify-center gap-6 pb-3 text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
                            <span className="text-muted-foreground">Não Realizados (esquerda)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                            <span className="text-muted-foreground">Atendidos (direita)</span>
                          </div>
                        </div>
                        <ChartContainer config={atendChartConfig} className="w-full" style={{ height: Math.max(300, butterflyData.length * 44 + 40) }}>
                          <BarChart
                            data={butterflyData}
                            layout="vertical"
                            margin={{ top: 5, right: 50, bottom: 20, left: 50 }}
                            stackOffset="sign"
                          >
                            <CartesianGrid horizontal={false} />
                            <YAxis
                              dataKey="categoria"
                              type="category"
                              tickLine={false}
                              axisLine={false}
                              fontSize={11}
                              fontWeight={600}
                              width={120}
                            />
                            <XAxis
                              type="number"
                              tickLine={false}
                              axisLine={false}
                              fontSize={11}
                              fontWeight={600}
                              height={30}
                              tickFormatter={(v) => NUM(Math.abs(v as number))}
                            />
                            <ChartTooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null
                                const row = payload[0]?.payload
                                const atendidos = row?._atendidos ?? 0
                                const naoRealizados = row?._nao_realizados ?? 0
                                const total = atendidos + naoRealizados
                                const taxa = total > 0 ? ((atendidos / total) * 100).toFixed(1) : "0.0"
                                return (
                                  <div className="rounded-lg border bg-background p-3 shadow-md">
                                    <p className="mb-1.5 text-sm font-semibold">{label}</p>
                                    <div className="flex items-center gap-2 py-0.5 text-sm">
                                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                                      <span className="text-muted-foreground">Atendidos:</span>
                                      <span className="font-medium">{NUM(atendidos)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-0.5 text-sm">
                                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />
                                      <span className="text-muted-foreground">Não Realizados:</span>
                                      <span className="font-medium">{NUM(naoRealizados)}</span>
                                    </div>
                                    <div className="mt-1 border-t pt-1 text-sm">
                                      <span className="text-muted-foreground">Total:</span>{" "}
                                      <span className="font-medium">{NUM(total)}</span>
                                      <span className="ml-2 text-muted-foreground">({taxa}%)</span>
                                    </div>
                                  </div>
                                )
                              }}
                            />
                            <Bar
                              dataKey="nao_realizados"
                              stackId="a"
                              fill="hsl(var(--chart-destructive, 0 84% 60%))"
                              radius={[4, 0, 0, 4]}
                            >
                              <LabelList
                                dataKey="_nao_realizados"
                                position="left"
                                offset={8}
                                fontSize={11}
                                fontWeight={600}
                                fill="hsl(0, 84%, 60%)"
                                formatter={(v: unknown) => NUM(Number(v))}
                              />
                            </Bar>
                            <Bar
                              dataKey="atendidos"
                              stackId="a"
                              fill="hsl(142, 71%, 45%)"
                              radius={[0, 4, 4, 0]}
                            >
                              <LabelList
                                dataKey="_atendidos"
                                position="right"
                                offset={8}
                                fontSize={11}
                                fontWeight={600}
                                fill="hsl(142, 71%, 45%)"
                                formatter={(v: unknown) => NUM(Number(v))}
                              />
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Table - Atendimentos */}
                  <Card>
                    <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                      <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg">Detalhamento de Atendimentos</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {atendAgrupamento === "grupo"
                            ? "Métricas por grupo de procedimentos"
                            : "Métricas por médico"}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                      {/* Mobile: card list */}
                      <div className="space-y-3 sm:hidden">
                        {atendDadosFiltrados.map((row) => {
                          const total = row.atendidos + row.nao_realizados
                          const taxa = total > 0 ? ((row.atendidos / total) * 100).toFixed(1) : "0.0"
                          return (
                            <div key={row.categoria} className="rounded-lg border p-3 space-y-2">
                              <p className="font-medium text-sm">{row.categoria}</p>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Atendidos</p>
                                  <p className="font-medium text-green-600">{NUM(row.atendidos)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Não Realiz.</p>
                                  <p className="font-medium text-orange-500">{NUM(row.nao_realizados)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Total</p>
                                  <p className="font-medium">{NUM(total)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Taxa</p>
                                  <p className="font-medium">{taxa}%</p>
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
                              <TableHead>{atendAgrupamento === "grupo" ? "Grupo" : "Médico"}</TableHead>
                              <TableHead className="text-right">Atendidos</TableHead>
                              <TableHead className="text-right">Não Realizados</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Taxa (%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {atendDadosFiltrados.map((row) => {
                              const total = row.atendidos + row.nao_realizados
                              const taxa = total > 0 ? ((row.atendidos / total) * 100).toFixed(1) : "0.0"
                              return (
                                <TableRow key={row.categoria}>
                                  <TableCell className="font-medium">{row.categoria}</TableCell>
                                  <TableCell className="text-right text-green-600">{NUM(row.atendidos)}</TableCell>
                                  <TableCell className="text-right text-orange-500">{NUM(row.nao_realizados)}</TableCell>
                                  <TableCell className="text-right">{NUM(total)}</TableCell>
                                  <TableCell className="text-right">{taxa}%</TableCell>
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

              {/* Comparecimento por categoria (pacientes distintos) */}
              {compLoading && !compData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando comparecimento...</span>
                </div>
              ) : compData && compData.dados.length > 0 && (
                <Card>
                  <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                    <CardTitle className="text-base sm:text-lg">Comparecimento por Categoria</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      % de pacientes atendidos sobre agendados, por categoria — pacientes distintos (um paciente com vários procedimentos conta uma vez por categoria)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
                    <ChartContainer config={compChartConfig} className="w-full" style={{ height: Math.max(220, compData.dados.length * 48 + 40) }}>
                      <BarChart
                        data={compData.dados}
                        layout="vertical"
                        margin={{ top: 5, right: 48, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                          dataKey="categoria"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          fontWeight={600}
                          width={110}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                          fontSize={11}
                          fontWeight={600}
                          height={30}
                        />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0].payload as ComparecimentoItem
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-md">
                                <p className="mb-1 text-sm font-semibold">{label}</p>
                                <p className="text-sm">Comparecimento: <span className="font-medium">{row.taxa.toFixed(1)}%</span></p>
                                <p className="text-sm text-muted-foreground">{NUM(row.atendidos)} de {NUM(row.agendados)} pacientes</p>
                              </div>
                            )
                          }}
                        />
                        <Bar
                          dataKey="taxa"
                          fill="var(--chart-1)"
                          radius={[0, 4, 4, 0]}
                        >
                          <LabelList
                            dataKey="taxa"
                            position="right"
                            formatter={(v) => `${Number(v).toFixed(1)}%`}
                            fontSize={11}
                            fontWeight={600}
                            fill="var(--foreground)"
                            offset={6}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Seção: Solicitações Médicas */}
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

              {/* Seção: Orçamentos */}
              <div className="border-b pb-1 pt-2">
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">Orçamentos</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">Orçamentos por status: realizados (todos os itens agendados), parciais (alguns) e pendentes (nenhum)</p>
              </div>

              {orcLoading && !orcData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando orçamentos...</span>
                </div>
              ) : orcData && (
                <>
                  {/* KPI Cards - Orçamentos por status */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <CheckCircle className="size-3 sm:size-3.5 text-green-600" />
                          Realizados
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl text-green-600">
                          {BRL(orcData.realizado.valor)}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                          {NUM(orcData.realizado.orcamentos)} orçamentos
                        </p>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <TrendingUp className="size-3 sm:size-3.5 text-amber-600" />
                          Parciais
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl text-amber-600">
                          {BRL(orcData.parcial.valor)}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                          {NUM(orcData.parcial.orcamentos)} orçamentos
                        </p>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <AlertCircle className="size-3 sm:size-3.5 text-red-500" />
                          Pendentes
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl text-red-500">
                          {BRL(orcData.pendente.valor)}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                          {NUM(orcData.pendente.orcamentos)} orçamentos
                        </p>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="p-3 sm:p-6">
                        <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                          <DollarSign className="size-3 sm:size-3.5" />
                          Total
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-2xl">
                          {BRL(orcData.total.valor)}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                          {NUM(orcData.total.orcamentos)} orçamentos
                        </p>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Barra de proporção por status (valor) */}
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      {orcData.total.valor > 0 ? (
                        <div className="space-y-3">
                          <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="bg-green-600"
                              style={{ width: `${(orcData.realizado.valor / orcData.total.valor) * 100}%` }}
                            />
                            <div
                              className="bg-amber-500"
                              style={{ width: `${(orcData.parcial.valor / orcData.total.valor) * 100}%` }}
                            />
                            <div
                              className="bg-red-500"
                              style={{ width: `${(orcData.pendente.valor / orcData.total.valor) * 100}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-block size-2.5 rounded-full bg-green-600" />
                              <span className="text-muted-foreground">Realizados</span>
                              <span className="font-medium">{BRL(orcData.realizado.valor)} ({((orcData.realizado.valor / orcData.total.valor) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block size-2.5 rounded-full bg-amber-500" />
                              <span className="text-muted-foreground">Parciais</span>
                              <span className="font-medium">{BRL(orcData.parcial.valor)} ({((orcData.parcial.valor / orcData.total.valor) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block size-2.5 rounded-full bg-red-500" />
                              <span className="text-muted-foreground">Pendentes</span>
                              <span className="font-medium">{BRL(orcData.pendente.valor)} ({((orcData.pendente.valor / orcData.total.valor) * 100).toFixed(1)}%)</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          Sem orçamentos no período selecionado.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
