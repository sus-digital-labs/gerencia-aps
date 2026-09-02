import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { loading } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center">
      {loading ? (
        <Loader2 className="animate-spin" aria-label="Carregando" />
      ) : null}
    </div>
  );
}
