import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseEmpresaId } from "@/lib/dashboard-shared";

interface OrcamentoRow {
  status: "pendente" | "parcial" | "realizado";
  orcamentos: string;
  valor: string | null;
}

interface OperadorRow {
  operador: string;
  orcamentos_feitos: string;
  valor_orcado: string | null;
  itens_efetivados: string;
  valor_efetivado: string | null;
}

type StatusResumo = { orcamentos: number; valor: number };

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
      WHERE o.empresa_id = $3
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

  // Comparativo por operador em uma linha só, cruzando dois papéis distintos:
  //   - cadastro:   quantos orçamentos cada operador FAZ (o.operador_cadastro) e valor orçado
  //   - efetivação: quanto cada operador CONVERTE, ou seja, itens que ele agendou
  //                 (tb_agenda_exames.operador_cadastro) e valor efetivado
  // Como quem cadastra nem sempre é quem efetiva, os dois papéis são unidos por FULL OUTER JOIN
  // (um operador pode aparecer só efetivando, sem cadastrar nenhum, ou vice-versa).
  const sqlOperador = `
    WITH por_orcamento AS (
      SELECT
        o.ambulatorio_orcamento_id,
        o.operador_cadastro,
        SUM(i.valor_total) AS valor_total
      FROM ponto.tb_ambulatorio_orcamento o
      JOIN ponto.tb_ambulatorio_orcamento_item i
        ON i.orcamento_id = o.ambulatorio_orcamento_id
      WHERE o.empresa_id = $3
        AND o.ativo = true
        AND i.ativo = true
        AND o.data_criacao >= $1
        AND o.data_criacao <= $2
      GROUP BY o.ambulatorio_orcamento_id, o.operador_cadastro
    ),
    cadastro AS (
      SELECT
        operador_cadastro AS operador_id,
        COUNT(*) AS orcamentos_feitos,
        COALESCE(SUM(valor_total), 0) AS valor_orcado
      FROM por_orcamento
      GROUP BY operador_cadastro
    ),
    efetivacao AS (
      SELECT
        ae.operador_cadastro AS operador_id,
        COUNT(*) AS itens_efetivados,
        COALESCE(SUM(i.valor_total), 0) AS valor_efetivado
      FROM ponto.tb_ambulatorio_orcamento o
      JOIN ponto.tb_ambulatorio_orcamento_item i
        ON i.orcamento_id = o.ambulatorio_orcamento_id
      JOIN ponto.tb_agenda_exames ae ON ae.agenda_exames_id = i.agenda_exames_id
      WHERE o.empresa_id = $3
        AND o.ativo = true
        AND i.ativo = true
        AND o.data_criacao >= $1
        AND o.data_criacao <= $2
      GROUP BY ae.operador_cadastro
    )
    SELECT
      COALESCE(INITCAP(op.nome), 'Sem Operador') AS operador,
      COALESCE(c.orcamentos_feitos, 0) AS orcamentos_feitos,
      COALESCE(c.valor_orcado, 0) AS valor_orcado,
      COALESCE(e.itens_efetivados, 0) AS itens_efetivados,
      COALESCE(e.valor_efetivado, 0) AS valor_efetivado
    FROM cadastro c
    FULL OUTER JOIN efetivacao e ON e.operador_id = c.operador_id
    LEFT JOIN ponto.tb_operador op ON op.operador_id = COALESCE(c.operador_id, e.operador_id)
    ORDER BY COALESCE(e.valor_efetivado, 0) DESC
    LIMIT 20
  `;

  const [rows, rowsOperador] = await Promise.all([
    query<OrcamentoRow>(sql, [dataInicio, dataFim, empresaId]),
    query<OperadorRow>(sqlOperador, [dataInicio, dataFim, empresaId]),
  ]);

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

  const porOperador = rowsOperador.map((row) => ({
    operador: row.operador,
    orcamentosFeitos: Number(row.orcamentos_feitos),
    valorOrcado: Math.round(Number(row.valor_orcado ?? 0) * 100) / 100,
    itensEfetivados: Number(row.itens_efetivados),
    valorEfetivado: Math.round(Number(row.valor_efetivado ?? 0) * 100) / 100,
  }));

  return NextResponse.json({
    pendente,
    parcial,
    realizado,
    total,
    porOperador,
  });
}
