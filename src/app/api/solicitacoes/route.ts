import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface SolicitacaoRow {
  medico: string;
  total_solicitacoes: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  if (!dataInicio || !dataFim) {
    return NextResponse.json(
      { error: "data_inicio e data_fim são obrigatórios" },
      { status: 400 }
    );
  }

  const sql = `
    SELECT medico, SUM(total_solicitacoes)::bigint AS total_solicitacoes
    FROM (
      SELECT
        CASE
          WHEN op.nome IS NULL OR LOWER(TRIM(op.nome)) IN ('sem solicitação', 'sem médico', 'sem medico')
          THEN 'Sem Médico'
          ELSE INITCAP(op.nome)
        END AS medico,
        COUNT(*) AS total_solicitacoes
      FROM ponto.tb_agenda_exames ae
      JOIN ponto.tb_procedimento_convenio pc ON pc.procedimento_convenio_id = ae.procedimento_tuss_id
      LEFT JOIN ponto.tb_operador op ON op.operador_id = ae.medico_solicitante
      WHERE ae.empresa_id = 1
        AND ae.data >= $1
        AND ae.data <= $2
        AND pc.convenio_id != 915
      GROUP BY op.nome
    ) sub
    GROUP BY medico
    ORDER BY SUM(total_solicitacoes) DESC
    LIMIT 20
  `;

  const rows = await query<SolicitacaoRow>(sql, [dataInicio, dataFim]);

  const dados = rows.map((row) => ({
    medico: row.medico,
    total_solicitacoes: Number(row.total_solicitacoes),
  }));

  const total = dados.reduce((s, d) => s + d.total_solicitacoes, 0);

  return NextResponse.json({ dados, total });
}
