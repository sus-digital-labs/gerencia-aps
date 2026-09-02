import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "./const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { runtimeConfig } from "./config/runtime";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento root ausente");

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const root = createRoot(rootElement);

if (runtimeConfig.status !== "READY") {
  root.render(
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-2xl space-y-4 rounded-lg border border-red-400/40 bg-slate-900 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-300">
          CONFIGURATION_ERROR
        </p>
        <h1 className="text-3xl font-bold">
          Configuração obrigatória ausente ou inválida
        </h1>
        <p className="text-slate-300">
          O aplicativo foi interrompido de forma segura. Corrija as variáveis
          públicas de runtime antes de iniciar a aplicação.
        </p>
        <p className="text-sm text-slate-400">
          Campos a revisar:{" "}
          {runtimeConfig.error?.fields.join(", ") ||
            "configuração desconhecida"}
          .
        </p>
      </section>
    </main>
  );
} else {
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: runtimeConfig.apiUrl,
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });

  root.render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
