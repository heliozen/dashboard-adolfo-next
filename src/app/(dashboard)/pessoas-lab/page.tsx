import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function PessoasLabPage() {
  return (
    <>
      <div className="border-b pb-1">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Pessoas / Laboratório</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">Indicadores de RH e laboratório</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Em breve</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Indicadores desta seção dependem de fontes de dados ainda não integradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
            <li>Pessoas: atrasos e faltas (fonte de RH a definir)</li>
            <li>Laboratório — recoleta: pendentes e entrega (banco Autolac)</li>
            <li>Taxa de amostra rejeitada, com motivo e posto (banco Autolac)</li>
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
