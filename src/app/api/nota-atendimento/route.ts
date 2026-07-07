import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { parseEmpresaId } from "@/lib/dashboard-shared";

// avaliacao_id = 4 → "Avaliacao Atendimento Guichê": a nota que o paciente dá ao
// atendente (operador_chamada). É a única dimensão consistentemente respondida.
const GUICHE_ID = 4;

interface OperadorRow {
  operador: string;
  media: string;
  avaliacoes: string;
}

interface DimensaoRow {
  avaliacao_id: number;
  dimensao: string | null;
  media: string | null;
  avaliacoes: string;
}

interface DistRow {
  nota: number;
  qtd: string;
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

  // vlr_pontuacao > 0: exclui avaliações não respondidas (0 = sem resposta).
  // Período por data_cadastro (quando o paciente avaliou); unidade por empresa_id.

  // Nota do guichê por operador (operador_chamada).
  const sqlOperador = `
    SELECT
      COALESCE(INITCAP(op.nome), 'Sem Operador') AS operador,
      ROUND(AVG(a.vlr_pontuacao), 2) AS media,
      COUNT(*) AS avaliacoes
    FROM ponto.tb_toten_senhas_nova_avaliacao a
    JOIN ponto.tb_toten_senhas_nova s ON s.toten_senha_id = a.toten_senha_id
    LEFT JOIN ponto.tb_operador op ON op.operador_id = s.operador_chamada
    WHERE s.empresa_id = $3
      AND a.avaliacao_id = ${GUICHE_ID}
      AND a.data_cadastro::date BETWEEN $1::date AND $2::date
      AND a.vlr_pontuacao > 0
    GROUP BY op.nome
    ORDER BY AVG(a.vlr_pontuacao) DESC, COUNT(*) DESC
    LIMIT 30
  `;

  // Média geral por dimensão. Parte de tb_tipo_avaliacao para listar SEMPRE todas
  // as dimensões (mesmo as sem avaliação no período → media null, avaliacoes 0).
  const sqlDimensao = `
    SELECT
      ta.tipo_avaliacao_id AS avaliacao_id,
      ta.nome AS dimensao,
      ROUND(AVG(av.vlr_pontuacao), 2) AS media,
      COUNT(av.vlr_pontuacao) AS avaliacoes
    FROM ponto.tb_tipo_avaliacao ta
    LEFT JOIN (
      SELECT a.avaliacao_id, a.vlr_pontuacao
      FROM ponto.tb_toten_senhas_nova_avaliacao a
      JOIN ponto.tb_toten_senhas_nova s ON s.toten_senha_id = a.toten_senha_id
      WHERE s.empresa_id = $3
        AND a.data_cadastro::date BETWEEN $1::date AND $2::date
        AND a.vlr_pontuacao > 0
    ) av ON av.avaliacao_id = ta.tipo_avaliacao_id
    WHERE ta.ativo = true
    GROUP BY ta.tipo_avaliacao_id, ta.nome
    ORDER BY ta.tipo_avaliacao_id
  `;

  // Distribuição das notas do guichê (1..5).
  const sqlDist = `
    SELECT a.vlr_pontuacao AS nota, COUNT(*) AS qtd
    FROM ponto.tb_toten_senhas_nova_avaliacao a
    JOIN ponto.tb_toten_senhas_nova s ON s.toten_senha_id = a.toten_senha_id
    WHERE s.empresa_id = $3
      AND a.avaliacao_id = ${GUICHE_ID}
      AND a.data_cadastro::date BETWEEN $1::date AND $2::date
      AND a.vlr_pontuacao > 0
    GROUP BY a.vlr_pontuacao
    ORDER BY a.vlr_pontuacao
  `;

  const params = [dataInicio, dataFim, empresaId];
  const [opRows, dimRows, distRows] = await Promise.all([
    query<OperadorRow>(sqlOperador, params),
    query<DimensaoRow>(sqlDimensao, params),
    query<DistRow>(sqlDist, params),
  ]);

  const porOperador = opRows.map((r) => ({
    operador: r.operador,
    media: Number(r.media),
    avaliacoes: Number(r.avaliacoes),
  }));

  const porDimensao = dimRows.map((r) => ({
    dimensao: r.dimensao ?? `Avaliação ${r.avaliacao_id}`,
    media: r.media === null ? null : Number(r.media),
    avaliacoes: Number(r.avaliacoes),
    principal: r.avaliacao_id === GUICHE_ID,
  }));

  const distribuicao = [1, 2, 3, 4, 5].map((nota) => {
    const row = distRows.find((d) => d.nota === nota);
    return { nota, qtd: row ? Number(row.qtd) : 0 };
  });

  const avaliacoesGuiche = distribuicao.reduce((s, d) => s + d.qtd, 0);
  const somaGuiche = distribuicao.reduce((s, d) => s + d.nota * d.qtd, 0);
  const mediaGeral = avaliacoesGuiche > 0 ? somaGuiche / avaliacoesGuiche : null;

  return NextResponse.json({
    mediaGeral,
    avaliacoes: avaliacoesGuiche,
    distribuicao,
    porOperador,
    porDimensao,
  });
}
