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
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { Loader2 } from "lucide-react"
import { NUM } from "@/lib/dashboard-shared"
import { usePeriod } from "@/components/period-context"

interface ComparecimentoItem {
  categoria: string
  atendidos: number
  agendados: number
  taxa: number
}

interface ComparecimentoResponse {
  dados: ComparecimentoItem[]
}

const compChartConfig: ChartConfig = {
  taxa: { label: "Comparecimento (%)", color: "var(--chart-1)" },
}

export function Comparecimento() {
  const { dataInicio, dataFim } = usePeriod()
  const [compData, setCompData] = useState<ComparecimentoResponse | null>(null)
  const [compLoading, setCompLoading] = useState(true)

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

  if (compLoading && !compData) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando comparecimento...</span>
      </div>
    )
  }

  if (!compData || compData.dados.length === 0) return null

  return (
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
            <Bar dataKey="taxa" fill="var(--chart-1)" radius={[0, 4, 4, 0]}>
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
  )
}
