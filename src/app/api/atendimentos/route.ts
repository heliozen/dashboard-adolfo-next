import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface AtendimentoRow {
  categoria: string;
  atendidos: string;
  nao_realizados: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");
  const agrupamento = searchParams.get("agrupamento") ?? "grupo";

  if (!dataInicio || !dataFim) {
    return NextResponse.json(
      { error: "data_inicio e data_fim são obrigatórios" },
      { status: 400 }
    );
  }

  let sql: string;

  if (agrupamento === "medico") {
    sql = `
      SELECT
        COALESCE(INITCAP(op.nome), 'Sem Médico') AS categoria,
        COUNT(*) FILTER (WHERE ae.realizada = true) AS atendidos,
        COUNT(*) FILTER (WHERE ae.realizada IS DISTINCT FROM true) AS nao_realizados
      FROM ponto.tb_agenda_exames ae
      JOIN ponto.tb_procedimento_convenio pc ON pc.procedimento_convenio_id = ae.procedimento_tuss_id
      LEFT JOIN ponto.tb_operador op ON op.operador_id = ae.medico_consulta_id
      WHERE ae.empresa_id = 1
        AND ae.data >= $1
        AND ae.data <= $2
        AND pc.convenio_id != 915
      GROUP BY op.nome
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `;
  } else {
    sql = `
      SELECT
        INITCAP(g.nome) AS categoria,
        COUNT(*) FILTER (WHERE ae.realizada = true) AS atendidos,
        COUNT(*) FILTER (WHERE ae.realizada IS DISTINCT FROM true) AS nao_realizados
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
      ORDER BY COUNT(*) DESC
    `;
  }

  const rows = await query<AtendimentoRow>(sql, [dataInicio, dataFim]);

  const dados = rows.map((row) => ({
    categoria: row.categoria,
    atendidos: Number(row.atendidos),
    nao_realizados: Number(row.nao_realizados),
  }));

  const totalAtendidos = dados.reduce((s, d) => s + d.atendidos, 0);
  const totalNaoRealizados = dados.reduce((s, d) => s + d.nao_realizados, 0);
  const total = totalAtendidos + totalNaoRealizados;

  return NextResponse.json({
    dados,
    totais: {
      atendidos: totalAtendidos,
      nao_realizados: totalNaoRealizados,
      taxa_realizacao: total > 0
        ? Math.round((totalAtendidos / total) * 1000) / 10
        : 0,
    },
  });
}
