import { createHmac, timingSafeEqual } from "node:crypto";

// Sessão simples baseada em cookie assinado (HMAC-SHA256). Sem dependências
// externas: o token carrega o payload em claro + uma assinatura verificável
// tanto na Route Handler (Node) quanto no proxy (Node runtime).

export const SESSION_COOKIE = "dashboard_session";
// Duração da sessão: 12h.
export const SESSION_MAX_AGE = 60 * 60 * 12;

// Apenas estes operadores podem acessar o dashboard:
//   53146 = Hélio Pereira de Oliveira
//   39973 = Janaina Costa Cavalcante
// Pode ser sobrescrito por DASHBOARD_ALLOWED_OPERADORES (ids separados por vírgula).
const DEFAULT_ALLOWED_OPERADORES = [53146, 39973];

export function getAllowedOperadores(): number[] {
  const env = process.env.DASHBOARD_ALLOWED_OPERADORES;
  if (!env) return DEFAULT_ALLOWED_OPERADORES;
  const ids = env
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n));
  return ids.length > 0 ? ids : DEFAULT_ALLOWED_OPERADORES;
}

export interface SessionPayload {
  sub: number; // operador_id
  nome: string;
  exp: number; // epoch em segundos
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET não configurado");
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string): string {
  return base64url(createHmac("sha256", getSecret()).update(data).digest());
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const body = base64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
