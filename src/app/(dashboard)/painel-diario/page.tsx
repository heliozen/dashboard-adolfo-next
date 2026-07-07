import { Orcamentos } from "@/components/sections/orcamentos"
import { Atendimentos } from "@/components/sections/atendimentos"
import { Cancelamentos } from "@/components/sections/cancelamentos"

export default function PainelDiarioPage() {
  return (
    <>
      <Orcamentos />
      <Atendimentos />
      <Cancelamentos />
    </>
  )
}
