"use client"

import { useState, useEffect } from "react"
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
import { FlaskConical, Loader2, X, Users, Percent } from "lucide-react"
import { NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface Contagem {
  label: string
  total: number
  pct: number
}

interface PostoTaxa {
  label: string
  recoletas: number
  solicitacoes: number
  taxa: number | null
}

interface RecoletaResponse {
  total: number
  solicitacoes: number
  taxaRejeicao: number | null
  porMotivo: Contagem[]
  porUsuario: Contagem[]
  porPosto: PostoTaxa[]
  porExame: Contagem[]
}

interface Local {
  id: string
  descricao: string
}

const motivoChartConfig: ChartConfig = {
  total: { label: "Recoletas", color: "var(--chart-1)" },
}

function TabelaContagem({
  rows,
  colLabel,
  colValor,
}: {
  rows: Contagem[]
  colLabel: string
  colValor: string
}) {
  return (
    <>
      {/* Mobile: card list */}
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
      {/* Desktop: table */}
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

const fmtTaxa = (t: number | null) => (t === null ? "—" : `${t.toFixed(2)}%`)

function TabelaPosto({ rows }: { rows: PostoTaxa[] }) {
  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">{row.label}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Recoletas</p>
                <p className="font-medium">{NUM(row.recoletas)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Solicitações</p>
                <p className="font-medium">{NUM(row.solicitacoes)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxa</p>
                <p className="font-medium">{fmtTaxa(row.taxa)}</p>
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
              <TableHead>Posto</TableHead>
              <TableHead className="text-right">Recoletas</TableHead>
              <TableHead className="text-right">Solicitações</TableHead>
              <TableHead className="text-right">Taxa de rejeição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{NUM(row.recoletas)}</TableCell>
                <TableCell className="text-right">{NUM(row.solicitacoes)}</TableCell>
                <TableCell className="text-right">{fmtTaxa(row.taxa)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export function Recoletas() {
  const { dataInicio, dataFim } = usePeriod()
  const [data, setData] = useState<RecoletaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [locais, setLocais] = useState<Local[]>([])
  const [local, setLocal] = useState("todos")

  // Lista de postos para o seletor (carregada uma vez).
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/recoletas/locais", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { locais: [] }))
      .then((json: { locais: Local[] }) => setLocais(json.locais ?? []))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setErro(null)

    fetch(
      `/api/recoletas?data_inicio=${dataInicio}&data_fim=${dataFim}&local=${local}`,
      { signal: controller.signal }
    )
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => null)
          const extra = j
            ? [j.code && `código: ${j.code}`, j.host !== undefined && `host: ${j.host ?? "(vazio)"}`, j.detalhe && `detalhe: ${j.detalhe}`]
                .filter(Boolean)
                .join(" · ")
            : ""
          throw new Error([j?.error ?? "Erro ao carregar recoletas", extra].filter(Boolean).join(" — "))
        }
        return r.json()
      })
      .then((json: RecoletaResponse) => {
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
  }, [dataInicio, dataFim, local])

  return (
    <>
      <div className="flex flex-col gap-2 border-b pb-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">Recoletas</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            % de recoleta por motivo · fonte: Autolac
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Posto:</span>
            <select
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs sm:text-sm"
            >
              <option value="todos">Todos os postos</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.descricao}
                </option>
              ))}
            </select>
          </label>
          {local !== "todos" && (
            <button
              type="button"
              onClick={() => setLocal("todos")}
              className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Limpar filtro de posto"
            >
              <X className="size-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando recoletas...</span>
        </div>
      ) : erro ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {erro}
        </div>
      ) : data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <FlaskConical className="size-3 sm:size-3.5" />
                  Recoletas (amostras rejeitadas)
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">{NUM(data.total)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <Users className="size-3 sm:size-3.5" />
                  Solicitações no período
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">{NUM(data.solicitacoes)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <Percent className="size-3 sm:size-3.5" />
                  Taxa de rejeição
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">
                  {data.taxaRejeicao === null ? "—" : `${data.taxaRejeicao.toFixed(2)}%`}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  recoletas ÷ solicitações
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Bar Chart - % por motivo */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Recoletas por Motivo</CardTitle>
                <CardDescription className="text-xs sm:text-sm">% do total de recoletas no período</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
              {data.porMotivo.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma recoleta no período.</p>
              ) : (
                <ChartContainer config={motivoChartConfig} className="w-full" style={{ height: Math.max(300, data.porMotivo.length * 36 + 40) }}>
                  <BarChart
                    data={data.porMotivo}
                    layout="vertical"
                    margin={{ top: 5, right: 48, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      fontWeight={600}
                      width={180}
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
                        const row = payload[0].payload as Contagem
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <p className="mb-1 text-sm font-semibold">{label}</p>
                            <p className="text-sm">{NUM(row.total)} ({row.pct.toFixed(1)}%)</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="total" fill="var(--chart-1)" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="pct"
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
              )}
            </CardContent>
          </Card>

          {/* Tabela detalhada - por motivo */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Detalhamento por Motivo</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Quantidade e % de recoletas por motivo</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <TabelaContagem rows={data.porMotivo} colLabel="Motivo" colValor="Recoletas" />
            </CardContent>
          </Card>

          {/* Taxa de rejeição por posto (só quando "Todos os postos") */}
          {local === "todos" && data.porPosto.length > 0 && (
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">Taxa de Rejeição por Posto</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Recoletas ÷ solicitações no período, por posto do Autolac
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <TabelaPosto rows={data.porPosto} />
              </CardContent>
            </Card>
          )}

          {/* Por usuário + por exame */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">Recoletas por Usuário</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Quem registrou a recoleta</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <TabelaContagem rows={data.porUsuario} colLabel="Usuário" colValor="Recoletas" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">Recoletas por Exame</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    % sobre o total de exames recoletados (uma recoleta pode ter vários)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <TabelaContagem rows={data.porExame} colLabel="Exame" colValor="Ocorrências" />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
