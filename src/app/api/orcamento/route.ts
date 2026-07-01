import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface OrcamentoRow {
  status: "pendente" | "parcial" | "realizado";
  orcamentos: string;
  valor: string | null;
}

type StatusResumo = { orcamentos: number; valor: number };

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

  // Classifica cada ORÇAMENTO (criado no período) por status, conforme quantos
  // dos seus itens viraram agendamento (agenda_exames_id):
  //   pendente  = nenhum item agendado
  //   parcial   = alguns itens agendados
  //   realizado = todos os itens agendados
  // valor = valor total do orçamento (soma de valor_total dos itens ativos).
  const sql = `
    WITH por_orcamento AS (
      SELECT
        o.ambulatorio_orcamento_id,
        COUNT(*) AS itens,
        COUNT(*) FILTER (WHERE i.agenda_exames_id IS NOT NULL) AS itens_realizados,
        SUM(i.valor_total) AS valor_total
      FROM ponto.tb_ambulatorio_orcamento o
      JOIN ponto.tb_ambulatorio_orcamento_item i
        ON i.orcamento_id = o.ambulatorio_orcamento_id
      WHERE o.empresa_id = 1
        AND o.ativo = true
        AND i.ativo = true
        AND o.data_criacao >= $1
        AND o.data_criacao <= $2
      GROUP BY o.ambulatorio_orcamento_id
    )
    SELECT
      CASE
        WHEN itens_realizados = 0 THEN 'pendente'
        WHEN itens_realizados = itens THEN 'realizado'
        ELSE 'parcial'
      END AS status,
      COUNT(*) AS orcamentos,
      COALESCE(SUM(valor_total), 0) AS valor
    FROM por_orcamento
    GROUP BY 1
  `;

  const rows = await query<OrcamentoRow>(sql, [dataInicio, dataFim]);

  const vazio = (): StatusResumo => ({ orcamentos: 0, valor: 0 });
  const pendente = vazio();
  const parcial = vazio();
  const realizado = vazio();
  const mapa = { pendente, parcial, realizado };

  for (const row of rows) {
    mapa[row.status].orcamentos = Number(row.orcamentos);
    mapa[row.status].valor = Math.round(Number(row.valor ?? 0) * 100) / 100;
  }

  const total: StatusResumo = {
    orcamentos: pendente.orcamentos + parcial.orcamentos + realizado.orcamentos,
    valor:
      Math.round((pendente.valor + parcial.valor + realizado.valor) * 100) / 100,
  };

  return NextResponse.json({ pendente, parcial, realizado, total });
}
