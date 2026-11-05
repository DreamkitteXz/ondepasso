"use client";
// Medição de visitas (GA4) e o aviso de cookies. Sem NEXT_PUBLIC_GA_ID no build, não renderiza nada.
// O aviso não bloqueia o site: as duas opções têm o mesmo peso e a escolha pode ser mudada no rodapé.
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_ATIVO, EVENTO_ABRIR_PREFERENCIAS, abrirPreferencias, assinarConsentimento, definirConsentimento, lerConsentimento, registrarPagina } from "@/lib/analytics";

const semAssinatura = () => () => {};

export function Analytics() {
  const pathname = usePathname();
  // No HTML estático o aviso não existe; ele entra depois de carregar, se a pessoa ainda não decidiu.
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  const decisao = useSyncExternalStore(assinarConsentimento, lerConsentimento, () => null);
  const [reaberto, setReaberto] = useState(false);

  useEffect(() => { registrarPagina(); }, [pathname]);
  useEffect(() => {
    const f = () => setReaberto(true);
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS, f);
    return () => window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS, f);
  }, []);

  if (!ANALYTICS_ATIVO || !montado || (decisao != null && !reaberto)) return null;
  const escolher = (d: "aceito" | "recusado") => { definirConsentimento(d); setReaberto(false); };
  return (
    <section className="aviso-cookies" role="region" aria-labelledby="t-cookies">
      <h2 id="t-cookies">Podemos medir as visitas?</h2>
      <p>
        Se você permitir, usamos cookies do Google Analytics para contar visitas, saber de onde elas vêm e quais partes do site
        ajudam mais. Suas notas do Enem nunca são enviadas. <a href="/privacidade/">Como funciona</a>
      </p>
      {decisao && <p className="miudo">Sua escolha atual: {decisao === "aceito" ? "medição permitida" : "medição recusada"}.</p>}
      <div className="aviso-cookies-botoes">
        <button type="button" className="botao botao-borda" onClick={() => escolher("recusado")}>Recusar</button>
        <button type="button" className="botao botao-borda" onClick={() => escolher("aceito")}>Permitir</button>
      </div>
    </section>
  );
}

/** Link do rodapé para rever a escolha a qualquer momento. */
export function PreferenciasCookies({ separador = true }: { separador?: boolean }) {
  if (!ANALYTICS_ATIVO) return null;
  return <>{separador && " · "}<button type="button" className="link link-sublinhado" onClick={abrirPreferencias}>Preferências de cookies</button></>;
}
