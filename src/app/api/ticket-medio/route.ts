import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface RawRow {
  grupo: string;
  subgrupo: string;
  valor_total: number;
  data: string;
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
    SELECT
      INITCAP(g.nome) as grupo,
      INITCAP(sg.nome) as subgrupo,
      ae.valor_total,
      ae.data
    FROM ponto.tb_agenda_exames ae
    JOIN ponto.tb_procedimento_convenio pc ON pc.procedimento_convenio_id = ae.procedimento_tuss_id
    JOIN ponto.tb_procedimento_tuss pt ON pt.procedimento_tuss_id = pc.procedimento_tuss_id
    JOIN ponto.tb_ambulatorio_subgrupo sg ON sg.ambulatorio_subgrupo_id = pt.subgrupo_id
    JOIN ponto.tb_ambulatorio_grupo g ON g.ambulatorio_grupo_id = sg.ambulatorio_grupo_id
    WHERE ae.situacao = 'OK'
      AND ae.empresa_id = 1
      AND ae.data >= $1
      AND ae.data <= $2
      AND pc.convenio_id != 915
  `;

  const rows = await query<RawRow>(sql, [dataInicio, dataFim]);

  // Agregar por grupo
  const grupoMap = new Map<
    string,
    { total: number; count: number; receita: number }
  >();
  // Agregar por grupo+subgrupo
  const subgrupoMap = new Map<
    string,
    Map<string, { total: number; count: number; receita: number }>
  >();
  // Agregar mensal por grupo
  const mensalGrupoMap = new Map<string, Map<string, { total: number; count: number }>>();
  // Agregar mensal por grupo+subgrupo
  const mensalSubgrupoMap = new Map<
    string,
    Map<string, Map<string, { total: number; count: number }>>
  >();
  // Agregar diário por grupo
  const diarioGrupoMap = new Map<string, Map<string, { total: number; count: number }>>();
  // Agregar diário por grupo+subgrupo
  const diarioSubgrupoMap = new Map<
    string,
    Map<string, Map<string, { total: number; count: number }>>
  >();

  for (const row of rows) {
    const valor = Number(row.valor_total);
    const mes = new Date(row.data).toISOString().slice(0, 7);
    const dia = new Date(row.data).toISOString().slice(0, 10);

    // Grupo
    const g = grupoMap.get(row.grupo) ?? { total: 0, count: 0, receita: 0 };
    g.total += valor;
    g.count += 1;
    g.receita += valor;
    grupoMap.set(row.grupo, g);

    // Subgrupo
    if (!subgrupoMap.has(row.grupo)) subgrupoMap.set(row.grupo, new Map());
    const sgMap = subgrupoMap.get(row.grupo)!;
    const sg = sgMap.get(row.subgrupo) ?? { total: 0, count: 0, receita: 0 };
    sg.total += valor;
    sg.count += 1;
    sg.receita += valor;
    sgMap.set(row.subgrupo, sg);

    // Mensal grupo
    if (!mensalGrupoMap.has(row.grupo)) mensalGrupoMap.set(row.grupo, new Map());
    const mgMap = mensalGrupoMap.get(row.grupo)!;
    const mg = mgMap.get(mes) ?? { total: 0, count: 0 };
    mg.total += valor;
    mg.count += 1;
    mgMap.set(mes, mg);

    // Mensal subgrupo
    if (!mensalSubgrupoMap.has(row.grupo))
      mensalSubgrupoMap.set(row.grupo, new Map());
    const msgGrupo = mensalSubgrupoMap.get(row.grupo)!;
    if (!msgGrupo.has(row.subgrupo)) msgGrupo.set(row.subgrupo, new Map());
    const msgSub = msgGrupo.get(row.subgrupo)!;
    const ms = msgSub.get(mes) ?? { total: 0, count: 0 };
    ms.total += valor;
    ms.count += 1;
    msgSub.set(mes, ms);

    // Diário grupo
    if (!diarioGrupoMap.has(row.grupo)) diarioGrupoMap.set(row.grupo, new Map());
    const dgMap = diarioGrupoMap.get(row.grupo)!;
    const dg = dgMap.get(dia) ?? { total: 0, count: 0 };
    dg.total += valor;
    dg.count += 1;
    dgMap.set(dia, dg);

    // Diário subgrupo
    if (!diarioSubgrupoMap.has(row.grupo))
      diarioSubgrupoMap.set(row.grupo, new Map());
    const dsgGrupo = diarioSubgrupoMap.get(row.grupo)!;
    if (!dsgGrupo.has(row.subgrupo)) dsgGrupo.set(row.subgrupo, new Map());
    const dsgSub = dsgGrupo.get(row.subgrupo)!;
    const ds = dsgSub.get(dia) ?? { total: 0, count: 0 };
    ds.total += valor;
    ds.count += 1;
    dsgSub.set(dia, ds);
  }

  // Formatar grupo
  const grupos = Array.from(grupoMap.entries())
    .map(([nome, d]) => ({
      nome,
      ticket_medio: Math.round((d.total / d.count) * 100) / 100,
      total_atendimentos: d.count,
      receita_total: Math.round(d.receita * 100) / 100,
    }))
    .sort((a, b) => b.total_atendimentos - a.total_atendimentos);

  // Formatar subgrupos
  const subgrupos: Record<
    string,
    { nome: string; ticket_medio: number; total_atendimentos: number; receita_total: number }[]
  > = {};
  for (const [grupo, sgMap] of subgrupoMap) {
    subgrupos[grupo] = Array.from(sgMap.entries())
      .map(([nome, d]) => ({
        nome,
        ticket_medio: Math.round((d.total / d.count) * 100) / 100,
        total_atendimentos: d.count,
        receita_total: Math.round(d.receita * 100) / 100,
      }))
      .sort((a, b) => b.total_atendimentos - a.total_atendimentos);
  }

  // Formatar mensal grupo
  const mensalGrupo: { categoria: string; mes: string; ticket_medio: number }[] = [];
  for (const [grupo, mMap] of mensalGrupoMap) {
    for (const [mes, d] of mMap) {
      mensalGrupo.push({
        categoria: grupo,
        mes,
        ticket_medio: Math.round((d.total / d.count) * 100) / 100,
      });
    }
  }
  mensalGrupo.sort((a, b) => a.mes.localeCompare(b.mes));

  // Formatar mensal subgrupo
  const mensalSubgrupo: Record<
    string,
    { categoria: string; mes: string; ticket_medio: number }[]
  > = {};
  for (const [grupo, sgMap] of mensalSubgrupoMap) {
    mensalSubgrupo[grupo] = [];
    for (const [subgrupo, mMap] of sgMap) {
      for (const [mes, d] of mMap) {
        mensalSubgrupo[grupo].push({
          categoria: subgrupo,
          mes,
          ticket_medio: Math.round((d.total / d.count) * 100) / 100,
        });
      }
    }
    mensalSubgrupo[grupo].sort((a, b) => a.mes.localeCompare(b.mes));
  }

  // Formatar diário grupo
  const diarioGrupo: { categoria: string; dia: string; ticket_medio: number }[] = [];
  for (const [grupo, dMap] of diarioGrupoMap) {
    for (const [dia, d] of dMap) {
      diarioGrupo.push({
        categoria: grupo,
        dia,
        ticket_medio: Math.round((d.total / d.count) * 100) / 100,
      });
    }
  }
  diarioGrupo.sort((a, b) => a.dia.localeCompare(b.dia));

  // Formatar diário subgrupo
  const diarioSubgrupo: Record<
    string,
    { categoria: string; dia: string; ticket_medio: number }[]
  > = {};
  for (const [grupo, sgMap] of diarioSubgrupoMap) {
    diarioSubgrupo[grupo] = [];
    for (const [subgrupo, dMap] of sgMap) {
      for (const [dia, d] of dMap) {
        diarioSubgrupo[grupo].push({
          categoria: subgrupo,
          dia,
          ticket_medio: Math.round((d.total / d.count) * 100) / 100,
        });
      }
    }
    diarioSubgrupo[grupo].sort((a, b) => a.dia.localeCompare(b.dia));
  }

  return NextResponse.json({
    grupos,
    subgrupos,
    mensalGrupo,
    mensalSubgrupo,
    diarioGrupo,
    diarioSubgrupo,
  });
}
