import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ComparecimentoRow {
  categoria: string;
  atendidos: string;
  agendados: string;
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

  // Comparecimento por categoria (grupo), contando PACIENTES DISTINTOS.
  // Um paciente pode fazer mais de um procedimento na mesma categoria: por isso
  // COUNT(DISTINCT paciente_id) — nunca COUNT(*).
  //   agendados = pacientes distintos com procedimento na categoria
  //   atendidos = pacientes distintos com pelo menos um procedimento realizado
  const sql = `
    SELECT
      INITCAP(g.nome) AS categoria,
      COUNT(DISTINCT ae.paciente_id) FILTER (WHERE ae.realizada = true) AS atendidos,
      COUNT(DISTINCT ae.paciente_id) AS agendados
    FROM ponto.tb_agenda_exames ae
    JOIN ponto.tb_procedimento_convenio pc ON pc.procedimento_convenio_id = ae.procedimento_tuss_id
    JOIN ponto.tb_procedimento_tuss pt ON pt.procedimento_tuss_id = pc.procedimento_tuss_id
    JOIN ponto.tb_ambulatorio_subgrupo sg ON sg.ambulatorio_subgrupo_id = pt.subgrupo_id
    JOIN ponto.tb_ambulatorio_grupo g ON g.ambulatorio_grupo_id = sg.ambulatorio_grupo_id
    WHERE ae.empresa_id = 1
      AND ae.data >= $1
      AND ae.data <= $2
      AND pc.convenio_id != 915
    GROUP BY g.nome
    ORDER BY COUNT(DISTINCT ae.paciente_id) DESC
  `;

  const rows = await query<ComparecimentoRow>(sql, [dataInicio, dataFim]);

  const dados = rows.map((row) => {
    const atendidos = Number(row.atendidos);
    const agendados = Number(row.agendados);
    return {
      categoria: row.categoria,
      atendidos,
      agendados,
      taxa: agendados > 0 ? Math.round((atendidos / agendados) * 1000) / 10 : 0,
    };
  });

  return NextResponse.json({ dados });
}
