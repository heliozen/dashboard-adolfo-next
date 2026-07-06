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
import { DollarSign, TrendingUp, Loader2, AlertCircle, CheckCircle, Users } from "lucide-react"
import { BRL, NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface OrcamentoStatus {
  orcamentos: number
  valor: number
}

interface OrcamentoOperador {
  operador: string
  orcamentosFeitos: number
  valorOrcado: number
  itensEfetivados: number
  valorEfetivado: number
}

interface OrcamentoResponse {
  pendente: OrcamentoStatus
  parcial: OrcamentoStatus
  realizado: OrcamentoStatus
  total: OrcamentoStatus
  porOperador: OrcamentoOperador[]
}

export function Orcamentos() {
  const { dataInicio, dataFim, empresaId } = usePeriod()
  const [orcData, setOrcData] = useState<OrcamentoResponse | null>(null)
  const [orcLoading, setOrcLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setOrcLoading(true)

    fetch(
      `/api/orcamento?data_inicio=${dataInicio}&data_fim=${dataFim}&empresa_id=${empresaId}`,
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
  }, [dataInicio, dataFim, empresaId])

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

          {/* Taxa de conversão (realizados + parciais) */}
          {(() => {
            const convertidosOrc = orcData.realizado.orcamentos + orcData.parcial.orcamentos
            const convertidosValor = orcData.realizado.valor + orcData.parcial.valor
            const taxa = orcData.total.orcamentos > 0
              ? (convertidosOrc / orcData.total.orcamentos) * 100
              : 0
            return (
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                    <TrendingUp className="size-3 sm:size-3.5 text-green-600" />
                    Taxa de conversão (realizados + parciais)
                  </CardDescription>
                  <CardTitle className="text-lg sm:text-2xl text-green-600">
                    {taxa.toFixed(1)}%
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    {NUM(convertidosOrc)} de {NUM(orcData.total.orcamentos)} orçamentos · {BRL(convertidosValor)}
                  </p>
                </CardHeader>
              </Card>
            )
          })()}

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

          {/* Comparativo por operador: quanto faz x quanto converte */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-1.5 text-base sm:text-lg">
                  <Users className="size-4" />
                  Desempenho por operador
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Quantos orçamentos cada operador cadastra e quanto de fato converte (itens que ele agendou). Como quem cadastra nem sempre é quem efetiva, um operador pode aparecer só convertendo. Ordenado por valor convertido.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              {orcData.porOperador.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sem orçamentos no período selecionado.
                </p>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="space-y-3 sm:hidden">
                    {orcData.porOperador.map((op) => (
                      <div key={op.operador} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{op.operador}</p>
                          <div className="text-right">
                            <p className="font-semibold text-sm text-green-600">{BRL(op.valorEfetivado)}</p>
                            <p className="text-[11px] text-muted-foreground">convertido</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Orç. feitos</p>
                            <p className="font-medium">{NUM(op.orcamentosFeitos)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Valor orçado</p>
                            <p className="font-medium">{BRL(op.valorOrcado)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Itens conv.</p>
                            <p className="font-medium text-green-600">{NUM(op.itensEfetivados)}</p>
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
                          <TableHead>Operador</TableHead>
                          <TableHead className="text-right">Orçamentos feitos</TableHead>
                          <TableHead className="text-right">Valor orçado</TableHead>
                          <TableHead className="text-right">Itens convertidos</TableHead>
                          <TableHead className="text-right">Valor convertido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orcData.porOperador.map((op) => (
                          <TableRow key={op.operador}>
                            <TableCell className="font-medium">{op.operador}</TableCell>
                            <TableCell className="text-right">{NUM(op.orcamentosFeitos)}</TableCell>
                            <TableCell className="text-right">{BRL(op.valorOrcado)}</TableCell>
                            <TableCell className="text-right text-green-600">{NUM(op.itensEfetivados)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{BRL(op.valorEfetivado)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
