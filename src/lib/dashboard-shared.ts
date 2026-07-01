export const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export const NUM = (v: number) => v.toLocaleString("pt-BR")

export const CHART_COLORS = [
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

export function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function getDefaultDates() {
  const now = new Date()
  const fim = toISO(now)
  const inicio = toISO(new Date(now.getFullYear(), now.getMonth() - 5, 1))
  return { inicio, fim }
}

export type PeriodPreset = {
  label: string
  getDates: () => { inicio: string; fim: string }
}

export const PERIOD_PRESETS: PeriodPreset[] = [
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

export function formatMes(mes: string) {
  const [year, month] = mes.split("-")
  const names = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ]
  return `${names[parseInt(month) - 1]}/${year.slice(2)}`
}

export function formatDia(dia: string) {
  const [, month, day] = dia.split("-")
  return `${day}/${month}`
}
