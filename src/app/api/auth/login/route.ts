import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAllowedOperadores,
} from "@/lib/auth";

interface OperadorRow {
  operador_id: number;
  nome: string;
}

export async function POST(req: NextRequest) {
  let body: { usuario?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const usuario = body.usuario?.trim();
  const senha = body.senha;

  if (!usuario || !senha) {
    return NextResponse.json(
      { error: "Informe usuário e senha" },
      { status: 400 }
    );
  }

  // Senhas do sistema são MD5 sem salt: comparamos com md5($2) no próprio banco.
  // Acesso restrito à allowlist de operadores autorizados.
  const rows = await query<OperadorRow>(
    `SELECT operador_id, nome
       FROM ponto.tb_operador
      WHERE LOWER(usuario) = LOWER($1)
        AND senha = md5($2)
        AND ativo = true
        AND operador_id = ANY($3::int[])
      LIMIT 1`,
    [usuario, senha, getAllowedOperadores()]
  );

  const operador = rows[0];
  if (!operador) {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos" },
      { status: 401 }
    );
  }

  const token = createSessionToken({
    sub: operador.operador_id,
    nome: operador.nome,
  });

  const res = NextResponse.json({ nome: operador.nome });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
