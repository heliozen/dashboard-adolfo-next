"use client"

import { useState, useEffect, useMemo } from "react"
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
import { TrendingUp, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

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

export function Atendimentos() {
  const { dataInicio, dataFim } = usePeriod()
  const [atendData, setAtendData] = useState<AtendimentoResponse | null>(null)
  const [atendLoading, setAtendLoading] = useState(true)
  const [atendAgrupamento, setAtendAgrupamento] = useState<"grupo" | "medico">("grupo")
  const [atendApenasComMedico, setAtendApenasComMedico] = useState(false)

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

  const atendDadosFiltrados = useMemo(() => {
    if (!atendData) return []
    const dados =
      atendApenasComMedico && atendAgrupamento === "medico"
        ? atendData.dados.filter((d) => d.categoria !== "Sem Médico")
        : atendData.dados
    // Sempre da maior para a menor taxa de realização (proporção de atendidos)
    const taxa = (d: AtendimentoItem) => {
      const total = d.atendidos + d.nao_realizados
      return total > 0 ? d.atendidos / total : 0
    }
    return [...dados].sort((a, b) => taxa(b) - taxa(a))
  }, [atendData, atendApenasComMedico, atendAgrupamento])

  const totais = useMemo(() => {
    const atendidos = atendDadosFiltrados.reduce((s, d) => s + d.atendidos, 0)
    const nao_realizados = atendDadosFiltrados.reduce((s, d) => s + d.nao_realizados, 0)
    const total = atendidos + nao_realizados
    const taxa = total > 0 ? (atendidos / total) * 100 : 0
    return { atendidos, nao_realizados, total, taxa }
  }, [atendDadosFiltrados])

  return (
    <>
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
                <CardTitle className="text-lg sm:text-2xl text-green-600">
                  {NUM(totais.atendidos)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <AlertCircle className="size-3 sm:size-3.5 text-orange-500" />
                  Não Realizados
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl text-orange-500">
                  {NUM(totais.nao_realizados)}
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
                  {totais.taxa.toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Barra de proporção Atendidos x Não Realizados */}
          <Card>
            <CardHeader className="space-y-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Atendidos vs Não Realizados</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {atendAgrupamento === "grupo"
                    ? "Proporção do total por grupo de procedimentos"
                    : "Proporção do total por médico (top 15)"}
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
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              {atendDadosFiltrados.length > 0 ? (
                <div className="space-y-4">
                  {/* Legenda */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full bg-green-600" />
                      <span className="text-muted-foreground">Atendidos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full bg-orange-500" />
                      <span className="text-muted-foreground">Não Realizados</span>
                    </div>
                  </div>
                  {/* Uma barra de proporção por grupo/médico */}
                  <div className="space-y-3">
                    {atendDadosFiltrados.map((row) => {
                      const total = row.atendidos + row.nao_realizados
                      const taxa = total > 0 ? (row.atendidos / total) * 100 : 0
                      return (
                        <div key={row.categoria} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                            <span className="truncate font-medium">{row.categoria}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {NUM(row.atendidos)}/{NUM(total)} ({taxa.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="bg-green-600"
                              style={{ width: `${total > 0 ? (row.atendidos / total) * 100 : 0}%` }}
                            />
                            <div
                              className="bg-orange-500"
                              style={{ width: `${total > 0 ? (row.nao_realizados / total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sem atendimentos no período selecionado.
                </p>
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
    </>
  )
}
