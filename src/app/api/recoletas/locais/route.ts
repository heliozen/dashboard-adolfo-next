import { NextResponse } from "next/server";
import { autolacQuery } from "@/lib/autolac";

interface LocalRow {
  id: string;
  descricao: string | null;
}

// Lista os postos (LOCAL) que possuem ao menos uma recoleta registrada, para
// popular o seletor da seção. Estável (não depende do período selecionado).
export async function GET() {
  const sql = `
    SELECT DISTINCT s.LOCAL AS id, l.DESCRICAO AS descricao
    FROM SOLICITACAO_RECOLETA r
    JOIN SOLICITACAO s ON s.ID = r.SOLICITACAO_ID
    LEFT JOIN LOCAL l ON l.ID = s.LOCAL
    WHERE s.LOCAL IS NOT NULL
    ORDER BY s.LOCAL
  `;

  try {
    const rows = await autolacQuery<LocalRow>(sql);
    const locais = rows.map((r) => ({
      id: r.id.trim(),
      descricao: r.descricao?.trim() ?? r.id.trim(),
    }));
    return NextResponse.json({ locais });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error("Erro ao listar postos do Autolac:", e.code, e.message, err);
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
}
