import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface RelatorioRow {
  paciente: string;
  procedimento: string;
  data: string;
  realizada: boolean | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");
  const grupo = searchParams.get("grupo");

  if (!dataInicio || !dataFim) {
    return NextResponse.json(
      { error: "data_inicio e data_fim são obrigatórios" },
      { status: 400 }
    );
  }

  const params: (string | null)[] = [dataInicio, dataFim];
  let grupoFilter = "";
  if (grupo) {
    grupoFilter = " AND LOWER(g.nome) = LOWER($3)";
    params.push(grupo);
  }

  const sql = `
    SELECT
      INITCAP(p.nome) AS paciente,
      INITCAP(pt.nome) AS procedimento,
      ae.data,
      ae.realizada
    FROM ponto.tb_agenda_exames ae
    JOIN ponto.tb_paciente p ON p.paciente_id = ae.paciente_id
    JOIN ponto.tb_procedimento_convenio pc ON pc.procedimento_convenio_id = ae.procedimento_tuss_id
    JOIN ponto.tb_procedimento_tuss pt ON pt.procedimento_tuss_id = pc.procedimento_tuss_id
    JOIN ponto.tb_ambulatorio_subgrupo sg ON sg.ambulatorio_subgrupo_id = pt.subgrupo_id
    JOIN ponto.tb_ambulatorio_grupo g ON g.ambulatorio_grupo_id = sg.ambulatorio_grupo_id
    WHERE ae.empresa_id = 1
      AND ae.data >= $1
      AND ae.data <= $2
      AND pc.convenio_id != 915
      ${grupoFilter}
    ORDER BY ae.data, p.nome
  `;

  const rows = await query<RelatorioRow>(sql, params);

  const header = "Paciente;Procedimento;Data;Status";
  const lines = rows.map((r) => {
    const data = new Date(r.data).toLocaleDateString("pt-BR");
    const status = r.realizada === true ? "Atendido" : "Não Realizado";
    const paciente = r.paciente.replace(/;/g, ",");
    const procedimento = r.procedimento.replace(/;/g, ",");
    return `${paciente};${procedimento};${data};${status}`;
  });

  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${grupo ?? "todos"}-${dataInicio}-${dataFim}.csv"`,
    },
  });
}
