"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { DEFAULT_EMPRESA_ID, getDefaultDates, PERIOD_PRESETS } from "@/lib/dashboard-shared"

interface PeriodContextValue {
  dataInicio: string
  dataFim: string
  periodoAtivo: string
  empresaId: number
  setDataInicio: (v: string) => void
  setDataFim: (v: string) => void
  setEmpresaId: (v: number) => void
  aplicarPeriodo: (valor: string | null) => void
}

const PeriodContext = createContext<PeriodContextValue | null>(null)

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const defaults = getDefaultDates()
  const [dataInicio, setDataInicio] = useState(defaults.inicio)
  const [dataFim, setDataFim] = useState(defaults.fim)
  const [periodoAtivo, setPeriodoAtivo] = useState("Mês atual")
  const [empresaId, setEmpresaId] = useState(DEFAULT_EMPRESA_ID)

  const aplicarPeriodo = useCallback((valor: string | null) => {
    if (!valor) return
    setPeriodoAtivo(valor)
    if (valor === "personalizado") return
    const preset = PERIOD_PRESETS.find((p) => p.label === valor)
    if (preset) {
      const { inicio, fim } = preset.getDates()
      setDataInicio(inicio)
      setDataFim(fim)
    }
  }, [])

  const value = useMemo(
    () => ({ dataInicio, dataFim, periodoAtivo, empresaId, setDataInicio, setDataFim, setEmpresaId, aplicarPeriodo }),
    [dataInicio, dataFim, periodoAtivo, empresaId, aplicarPeriodo]
  )

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error("usePeriod deve ser usado dentro de PeriodProvider")
  return ctx
}
