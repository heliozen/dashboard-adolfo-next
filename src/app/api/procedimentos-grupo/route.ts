import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ProcedimentoRow {
  procedimento_tuss_id: number;
  procedimento: string;
  subgrupo: string;
  grupo: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const grupo = searchParams.get("grupo");

  if (!grupo) {
    return NextResponse.json(
      { error: "grupo é obrigatório" },
      { status: 400 }
    );
  }

  const sql = `
    SELECT DISTINCT
      pt.procedimento_tuss_id,
      INITCAP(pt.nome) AS procedimento,
      INITCAP(sg.nome) AS subgrupo,
      INITCAP(g.nome) AS grupo
    FROM ponto.tb_procedimento_tuss pt
    JOIN ponto.tb_ambulatorio_subgrupo sg ON sg.ambulatorio_subgrupo_id = pt.subgrupo_id
    JOIN ponto.tb_ambulatorio_grupo g ON g.ambulatorio_grupo_id = sg.ambulatorio_grupo_id
    WHERE LOWER(g.nome) = LOWER($1)
    ORDER BY subgrupo, procedimento
  `;

  const rows = await query<ProcedimentoRow>(sql, [grupo]);

  const formato = searchParams.get("formato");

  if (formato === "csv") {
    const header = "ID;Procedimento;Subgrupo;Grupo";
    const lines = rows.map((r) =>
      `${r.procedimento_tuss_id};${r.procedimento.replace(/;/g, ",")};${r.subgrupo.replace(/;/g, ",")};${r.grupo.replace(/;/g, ",")}`
    );
    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="procedimentos-${grupo}.csv"`,
      },
    });
  }

  return NextResponse.json({ total: rows.length, dados: rows });
}
