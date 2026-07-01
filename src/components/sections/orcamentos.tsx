"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DollarSign, TrendingUp, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { BRL, NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

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

export function Orcamentos() {
  const { dataInicio, dataFim } = usePeriod()
  const [orcData, setOrcData] = useState<OrcamentoResponse | null>(null)
  const [orcLoading, setOrcLoading] = useState(true)

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

  return (
    <>
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
  )
}
