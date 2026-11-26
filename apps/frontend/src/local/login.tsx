import { useState, type FormEvent } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localReturnPath } from "@shared/local-navigation";

export function LocalLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/local/auth/login", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.get("email"), password: values.get("password") }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Não foi possível entrar. Tente novamente.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.replace(localReturnPath(next));
    } catch {
      setError("O serviço local está indisponível. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-sm border-0 bg-white/90 shadow-xl" aria-labelledby="login-title">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <Activity className="size-6" aria-hidden />
            </span>
            <span className="font-black text-gray-900">SUS Analytics</span>
          </div>
          <CardTitle id="login-title"><h1>Entrar</h1></CardTitle>
          <CardDescription>Use as credenciais padrão do superadmin para acessar o PEC local.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="login-form space-y-4" onSubmit={submit} aria-busy={busy}>
            <div className="space-y-2">
              <Label htmlFor="operator-email">E-mail</Label>
              <Input id="operator-email" name="email" type="email" autoComplete="username" maxLength={254} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator-password">Senha</Label>
              <Input id="operator-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required />
            </div>
            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <Button className="w-full" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
