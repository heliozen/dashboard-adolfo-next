import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseEmpresaId } from "@/lib/dashboard-shared";

interface Contagem {
  label: string;
  total: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");
  const empresaId = parseEmpresaId(searchParams.get("empresa_id"));

  if (!dataInicio || !dataFim) {
    return NextResponse.json(
      { error: "data_inicio e data_fim são obrigatórios" },
      { status: 400 }
    );
  }

  // Fonte: tb_ambulatorio_atendimentos_cancelamento (evento de cancelamento de
  // agenda). Período por data_cadastro (quando cancelou); unidade por empresa_id.
  // Motivo em tb_ambulatorio_cancelamento; médico em tb_operador.
  const sqlMotivo = `
    SELECT COALESCE(c.descricao, 'Sem motivo') AS label, COUNT(*) AS total
    FROM ponto.tb_ambulatorio_atendimentos_cancelamento ac
    LEFT JOIN ponto.tb_ambulatorio_cancelamento c
      ON c.ambulatorio_cancelamento_id = ac.ambulatorio_cancelamento_id
    WHERE ac.empresa_id = $3
      AND ac.data_cadastro::date BETWEEN $1::date AND $2::date
    GROUP BY c.descricao
    ORDER BY COUNT(*) DESC
  `;

  const sqlMedico = `
    SELECT COALESCE(INITCAP(op.nome), 'Sem Médico') AS label, COUNT(*) AS total
    FROM ponto.tb_ambulatorio_atendimentos_cancelamento ac
    LEFT JOIN ponto.tb_operador op ON op.operador_id = ac.medico_id
    WHERE ac.empresa_id = $3
      AND ac.data_cadastro::date BETWEEN $1::date AND $2::date
    GROUP BY op.nome
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `;

  const params = [dataInicio, dataFim, empresaId];
  const [motivoRows, medicoRows] = await Promise.all([
    query<Contagem>(sqlMotivo, params),
    query<Contagem>(sqlMedico, params),
  ]);

  const total = motivoRows.reduce((s, r) => s + Number(r.total), 0);

  const toItem = (r: Contagem) => ({
    label: r.label,
    total: Number(r.total),
    pct: total > 0 ? (Number(r.total) / total) * 100 : 0,
  });

  return NextResponse.json({
    total,
    porMotivo: motivoRows.map(toItem),
    porMedico: medicoRows.map(toItem),
  });
}
