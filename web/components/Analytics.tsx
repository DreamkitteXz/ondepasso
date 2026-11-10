"use client";
// Medição de visitas (GA4), anúncios (AdSense) e o aviso de cookies. Sem GA nem anúncios no build, não renderiza nada.
// O aviso não bloqueia o site: recusar e permitir têm o mesmo peso, e a escolha pode ser mudada no rodapé.
// Com anúncios ligados, cada finalidade (medição, publicidade) pode ser escolhida separadamente.
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_ATIVO, EVENTO_ABRIR_PREFERENCIAS, PEDE_CONSENTIMENTO, abrirPreferencias, assinarConsentimento, definirConsentimento, lerConsentimento, registrarPagina } from "@/lib/analytics";
import { ANUNCIOS_ATIVO } from "@/lib/anuncios";

const semAssinatura = () => () => {};

export function Analytics() {
  const pathname = usePathname();
  // No HTML estático o aviso não existe; ele entra depois de carregar, se a pessoa ainda não decidiu.
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  const decisao = useSyncExternalStore(assinarConsentimento, lerConsentimento, () => null);
  const [reaberto, setReaberto] = useState(false);
  const [detalhar, setDetalhar] = useState(false);
  const [medicao, setMedicao] = useState(false);
  const [publicidade, setPublicidade] = useState(false);

  useEffect(() => { registrarPagina(); }, [pathname]);
  useEffect(() => {
    const f = () => { setReaberto(true); setDetalhar(ANUNCIOS_ATIVO && ANALYTICS_ATIVO); };
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS, f);
    return () => window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS, f);
  }, []);
  // Ao abrir as opções, elas começam com a escolha atual (ou desmarcadas, para quem ainda não respondeu).
  useEffect(() => { if (detalhar) { setMedicao(decisao?.medicao ?? false); setPublicidade(decisao?.publicidade ?? false); } }, [detalhar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!PEDE_CONSENTIMENTO || !montado || (decisao != null && !reaberto)) return null;
  const escolher = (sim: boolean) => { definirConsentimento({ medicao: sim, publicidade: sim }); setReaberto(false); setDetalhar(false); };
  const salvar = () => { definirConsentimento({ medicao, publicidade }); setReaberto(false); setDetalhar(false); };
  const duas = ANALYTICS_ATIVO && ANUNCIOS_ATIVO;

  return (
    <section className="aviso-cookies" role="region" aria-labelledby="t-cookies">
      <h2 id="t-cookies">{ANUNCIOS_ATIVO ? "Podemos usar cookies?" : "Podemos medir as visitas?"}</h2>
      {ANUNCIOS_ATIVO ? (
        <p>
          Se você permitir, usamos cookies {ANALYTICS_ATIVO ? "do Google Analytics para contar visitas e " : ""}para mostrar anúncios do Google,
          que ajudam a manter o site grátis e podem ser personalizados. Suas notas do Enem nunca são enviadas. <a href="/privacidade/">Como funciona</a>
        </p>
      ) : (
        <p>
          Se você permitir, usamos cookies do Google Analytics para contar visitas, saber de onde elas vêm e quais partes do site
          ajudam mais. Suas notas do Enem nunca são enviadas. <a href="/privacidade/">Como funciona</a>
        </p>
      )}
      {decisao && <p className="miudo">Sua escolha atual: {resumo(decisao)}.</p>}
      {detalhar && duas ? (
        <>
          <fieldset className="aviso-cookies-opcoes">
            <legend className="sr-only">Escolha o que permitir</legend>
            <label><input type="checkbox" checked={medicao} onChange={(e) => setMedicao(e.target.checked)} /> <span><strong>Medição de visitas</strong> Google Analytics</span></label>
            <label><input type="checkbox" checked={publicidade} onChange={(e) => setPublicidade(e.target.checked)} /> <span><strong>Anúncios</strong> Google AdSense</span></label>
          </fieldset>
          <div className="aviso-cookies-botoes">
            <button type="button" className="botao botao-borda" onClick={() => escolher(false)}>Recusar tudo</button>
            <button type="button" className="botao botao-borda" onClick={salvar}>Salvar escolha</button>
          </div>
        </>
      ) : (
        <>
          <div className="aviso-cookies-botoes">
            <button type="button" className="botao botao-borda" onClick={() => escolher(false)}>Recusar</button>
            <button type="button" className="botao botao-borda" onClick={() => escolher(true)}>Permitir</button>
          </div>
          {duas && <button type="button" className="link link-sublinhado aviso-cookies-escolher" onClick={() => setDetalhar(true)}>Escolher o que permitir</button>}
        </>
      )}
    </section>
  );
}

function resumo(d: { medicao: boolean; publicidade: boolean }) {
  if (!ANUNCIOS_ATIVO) return d.medicao ? "medição permitida" : "medição recusada";
  if (!ANALYTICS_ATIVO) return d.publicidade ? "anúncios permitidos" : "anúncios recusados";
  if (d.medicao && d.publicidade) return "medição e anúncios permitidos";
  if (!d.medicao && !d.publicidade) return "tudo recusado";
  return d.medicao ? "só medição permitida" : "só anúncios permitidos";
}

/** Link do rodapé para rever a escolha a qualquer momento. */
export function PreferenciasCookies({ separador = true }: { separador?: boolean }) {
  if (!PEDE_CONSENTIMENTO) return null;
  return <>{separador && " · "}<button type="button" className="link link-sublinhado" onClick={abrirPreferencias}>Preferências de cookies</button></>;
}
