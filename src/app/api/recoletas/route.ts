import { NextRequest, NextResponse } from "next/server";
import { autolacQuery } from "@/lib/autolac";

interface RecoletaRow {
  motivo: string | null;
  usuario: string | null;
  exames: string | null;
  local_id: string | null;
  posto: string | null;
}

interface SolicLocalRow {
  local_id: string | null;
  solicitacoes: number;
}

interface Contagem {
  label: string;
  total: number;
  pct: number;
}

// Agrupa uma lista de rótulos em contagens ordenadas (desc), com % sobre o total.
function agrupar(labels: string[], total: number): Contagem[] {
  const mapa = new Map<string, number>();
  for (const label of labels) {
    mapa.set(label, (mapa.get(label) ?? 0) + 1);
  }
  return Array.from(mapa, ([label, count]) => ({
    label,
    total: count,
    pct: total > 0 ? (count / total) * 100 : 0,
  })).sort((a, b) => b.total - a.total);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");
  // Posto/unidade (LOCAL.ID). Ausente ou "todos" = todos os postos.
  const localParam = searchParams.get("local");
  const local = localParam && localParam !== "todos" ? localParam : null;

  if (!dataInicio || !dataFim) {
    return NextResponse.json(
      { error: "data_inicio e data_fim são obrigatórios" },
      { status: 400 }
    );
  }

  // Fonte: banco Autolac (SQL Server). Posto vem de SOLICITACAO.LOCAL → LOCAL:
  // SOLICITACAO_RECOLETA.SOLICITACAO_ID → SOLICITACAO.ID → SOLICITACAO.LOCAL → LOCAL.ID.
  // Cada recoleta = uma amostra rejeitada (o MOTIVO é o motivo da rejeição).
  const sqlRecoletas = `
    SELECT
      m.DESCRICAO AS motivo,
      r.USUARIO   AS usuario,
      r.EXAMES    AS exames,
      s.LOCAL     AS local_id,
      l.DESCRICAO AS posto
    FROM SOLICITACAO_RECOLETA r
    LEFT JOIN MOTIVO_RECOLETA m ON m.ID = r.MOTIVO
    LEFT JOIN SOLICITACAO s ON s.ID = r.SOLICITACAO_ID
    LEFT JOIN LOCAL l ON l.ID = s.LOCAL
    WHERE r.DATA >= @dataInicio AND r.DATA <= @dataFim
      ${local ? "AND s.LOCAL = @local" : ""}
  `;

  // Denominador da taxa de rejeição: total de solicitações por posto no período.
  const sqlSolic = `
    SELECT s.LOCAL AS local_id, COUNT(*) AS solicitacoes
    FROM SOLICITACAO s
    WHERE s.DATA >= @dataInicio AND s.DATA <= @dataFim
      ${local ? "AND s.LOCAL = @local" : ""}
    GROUP BY s.LOCAL
  `;

  let rows: RecoletaRow[];
  let solicRows: SolicLocalRow[];
  try {
    const params: Record<string, unknown> = { dataInicio, dataFim };
    if (local) params.local = local;
    [rows, solicRows] = await Promise.all([
      autolacQuery<RecoletaRow>(sqlRecoletas, params),
      autolacQuery<SolicLocalRow>(sqlSolic, params),
    ]);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error("Erro ao consultar recoletas no Autolac:", e.code, e.message, err);
    return NextResponse.json(
      {
        error: "Falha ao consultar o banco Autolac (verifique VPN/conexão)",
        code: e.code ?? null,
        detalhe: e.message ?? null,
        host: process.env.AUTOLAC_HOST ?? null,
      },
      { status: 502 }
    );
  }

  const total = rows.length;

  const porMotivo = agrupar(
    rows.map((r) => (r.motivo?.trim() ? r.motivo.trim() : "Sem motivo")),
    total
  );

  const porUsuario = agrupar(
    rows.map((r) => (r.usuario?.trim() ? r.usuario.trim() : "Não informado")),
    total
  );

  // EXAMES é texto com códigos separados por vírgula (ex.: "ZIN DB, COB-DB").
  // Cada exame conta como uma ocorrência; o denominador do % aqui é o total
  // de exames (não de recoletas), já que uma recoleta pode ter vários.
  const examesLabels = rows.flatMap((r) =>
    (r.exames ?? "")
      .split(",")
      .map((e) => e.trim().toUpperCase())
      .filter((e) => e.length > 0)
  );
  const porExame = agrupar(examesLabels, examesLabels.length);

  // Solicitações por posto (chave = LOCAL.ID normalizado) → denominador da taxa.
  const solicPorLocal = new Map<string, number>();
  let solicitacoesTotal = 0;
  for (const s of solicRows) {
    const key = s.local_id?.trim() ?? "";
    const n = Number(s.solicitacoes);
    solicPorLocal.set(key, n);
    solicitacoesTotal += n;
  }

  // Recoletas por posto (com label + local_id) para cruzar com o denominador.
  const recPorLocal = new Map<string, { label: string; recoletas: number }>();
  for (const r of rows) {
    const key = r.local_id?.trim() ?? "";
    const label = r.posto?.trim() || key || "Sem posto";
    const cur = recPorLocal.get(key);
    if (cur) cur.recoletas += 1;
    else recPorLocal.set(key, { label, recoletas: 1 });
  }

  const porPosto = Array.from(recPorLocal, ([key, v]) => {
    const solic = solicPorLocal.get(key) ?? 0;
    return {
      label: v.label,
      recoletas: v.recoletas,
      solicitacoes: solic,
      taxa: solic > 0 ? (v.recoletas / solic) * 100 : null,
    };
    // Ordena pela taxa de rejeição (desc); postos sem taxa (null) vão para o fim.
  }).sort((a, b) => (b.taxa ?? -1) - (a.taxa ?? -1));

  const taxaRejeicao =
    solicitacoesTotal > 0 ? (total / solicitacoesTotal) * 100 : null;

  return NextResponse.json({
    total,
    solicitacoes: solicitacoesTotal,
    taxaRejeicao,
    porMotivo,
    porUsuario,
    porPosto,
    porExame,
  });
}
