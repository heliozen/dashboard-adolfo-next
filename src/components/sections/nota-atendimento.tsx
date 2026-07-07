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
import { Star, MessageSquare, ThumbsUp, Loader2 } from "lucide-react"
import { NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface OperadorNota {
  operador: string
  media: number
  avaliacoes: number
}

interface Dimensao {
  dimensao: string
  media: number | null
  avaliacoes: number
  principal: boolean
}

interface DistItem {
  nota: number
  qtd: number
}

interface NotaResponse {
  mediaGeral: number | null
  avaliacoes: number
  distribuicao: DistItem[]
  porOperador: OperadorNota[]
  porDimensao: Dimensao[]
}

const fmtNota = (n: number | null) => (n === null ? "—" : n.toFixed(2))

// Exibe a nota (0–5) como 5 estrelas, preenchidas proporcionalmente à média
// (inclui preenchimento parcial dos decimais via overlay recortado).
function StarRating({ value, size = 18 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  const stars = [0, 1, 2, 3, 4]
  return (
    <div
      className="relative inline-flex shrink-0"
      style={{ width: size * 5, height: size }}
      role="img"
      aria-label={`${value.toFixed(2)} de 5`}
    >
      {/* Contorno (fundo) */}
      <div className="absolute inset-0 flex text-muted-foreground/30">
        {stars.map((i) => (
          <Star key={i} style={{ width: size, height: size }} strokeWidth={1.5} />
        ))}
      </div>
      {/* Preenchimento recortado pela % da média */}
      <div
        className="absolute inset-0 flex overflow-hidden text-amber-400"
        style={{ width: `${pct}%` }}
      >
        {stars.map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size, minWidth: size }}
            fill="currentColor"
            strokeWidth={1.5}
          />
        ))}
      </div>
    </div>
  )
}

export function NotaAtendimento() {
  const { dataInicio, dataFim, empresaId } = usePeriod()
  const [data, setData] = useState<NotaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setErro(null)

    fetch(
      `/api/nota-atendimento?data_inicio=${dataInicio}&data_fim=${dataFim}&empresa_id=${empresaId}`,
      { signal: controller.signal }
    )
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => null)
          throw new Error(j?.error ?? "Erro ao carregar notas")
        }
        return r.json()
      })
      .then((json: NotaResponse) => {
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

  const pctNota5 =
    data && data.avaliacoes > 0
      ? ((data.distribuicao.find((d) => d.nota === 5)?.qtd ?? 0) / data.avaliacoes) * 100
      : null

  return (
    <>
      <div className="border-b pb-1 pt-2">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Nota de Atendimento</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Avaliação do paciente no tablet (guichê) por operador · escala 1–5
        </p>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando notas...</span>
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
                  <Star className="size-3 sm:size-3.5" />
                  Nota média (guichê)
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">{fmtNota(data.mediaGeral)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <MessageSquare className="size-3 sm:size-3.5" />
                  Avaliações no período
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">{NUM(data.avaliacoes)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardDescription className="flex items-center gap-1.5 text-[11px] sm:text-sm">
                  <ThumbsUp className="size-3 sm:size-3.5" />
                  % nota 5
                </CardDescription>
                <CardTitle className="text-lg sm:text-2xl">
                  {pctNota5 === null ? "—" : `${pctNota5.toFixed(1)}%`}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Nota média por operador */}
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg">Nota Média por Operador</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Atendimento no guichê · estrelas conforme a média (top 30, maior nota primeiro)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              {data.porOperador.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma avaliação no período.</p>
              ) : (
                <div className="space-y-2">
                  {data.porOperador.map((row) => (
                    <div
                      key={row.operador}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border p-2.5 sm:flex-nowrap"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={row.operador}>
                        {row.operador}
                      </span>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <StarRating value={row.media} />
                        <span className="w-9 text-right text-sm font-semibold tabular-nums">
                          {row.media.toFixed(2)}
                        </span>
                        <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">
                          {NUM(row.avaliacoes)} aval.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhamento por operador + dimensões */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">Detalhamento por Operador</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Nota média e nº de avaliações</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                {/* Mobile */}
                <div className="space-y-3 sm:hidden">
                  {data.porOperador.map((row) => (
                    <div key={row.operador} className="rounded-lg border p-3 space-y-2">
                      <p className="font-medium text-sm">{row.operador}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Nota</p>
                          <p className="font-medium">{row.media.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avaliações</p>
                          <p className="font-medium">{NUM(row.avaliacoes)}</p>
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
                        <TableHead>Operador</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                        <TableHead className="text-right">Avaliações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.porOperador.map((row) => (
                        <TableRow key={row.operador}>
                          <TableCell className="font-medium">{row.operador}</TableCell>
                          <TableCell className="text-right">{row.media.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{NUM(row.avaliacoes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3 sm:px-6 sm:py-6">
                <div className="space-y-1">
                  <CardTitle className="text-base sm:text-lg">Médias por Dimensão</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    As 4 perguntas do tablet (guichê é a principal; as outras são pouco respondidas)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimensão</TableHead>
                      <TableHead className="text-right">Nota</TableHead>
                      <TableHead className="text-right">Avaliações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.porDimensao.map((row) => (
                      <TableRow key={row.dimensao}>
                        <TableCell className="font-medium">
                          {row.dimensao}
                          {row.principal && (
                            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              principal
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{fmtNota(row.media)}</TableCell>
                        <TableCell className="text-right">{NUM(row.avaliacoes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
