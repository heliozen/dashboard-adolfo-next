"use client"

import { Suspense, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function LoginForm() {
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/"
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErro(data.error || "Não foi possível entrar")
        setLoading(false)
        return
      }
      // Navegação completa para reprocessar o proxy e o layout com o cookie novo.
      window.location.assign(from)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo-adolfo-lutz.png"
            alt="Adolfo Lutz"
            width={2069}
            height={822}
            priority
            className="h-10 w-auto"
          />
        </div>
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Entre com seu usuário do sistema</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="usuario" className="text-sm font-medium">Usuário</label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="senha" className="text-sm font-medium">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          {erro && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !usuario || !senha}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/30 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
