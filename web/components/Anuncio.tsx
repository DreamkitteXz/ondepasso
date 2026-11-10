"use client";
// Bloco reservado com anúncio do AdSense. O HTML estático (e quem não permitiu publicidade) recebe o conteúdo
// alternativo — o cartão "Gostou? Compartilhe". Se o Google não tiver anúncio para mostrar, o alternativo volta.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { assinarConsentimento, lerConsentimento } from "@/lib/analytics";
import { ANUNCIOS_ATIVO, CLIENTE_ADSENSE, SLOT_ADSENSE, carregarAdsense } from "@/lib/anuncios";

export function Anuncio({ alternativo }: { alternativo: ReactNode }) {
  const decisao = useSyncExternalStore(assinarConsentimento, lerConsentimento, () => null);
  const permitido = ANUNCIOS_ATIVO && !!decisao?.publicidade;
  const [vazio, setVazio] = useState(false);
  const bloco = useRef<HTMLModElement>(null);

  useEffect(() => {
    const el = bloco.current;
    if (!permitido || !el) return;
    carregarAdsense();
    try { (window.adsbygoogle ??= []).push({}); } catch {}
    // O AdSense marca data-ad-status="unfilled" quando não há anúncio: aí o cartão de compartilhar volta.
    const obs = new MutationObserver(() => { if (el.getAttribute("data-ad-status") === "unfilled") setVazio(true); });
    obs.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => obs.disconnect();
  }, [permitido]);

  if (!permitido || vazio) return <>{alternativo}</>;
  return (
    <aside className="cartao apoio anuncio" aria-label="Publicidade">
      <span className="apoio-rotulo">Publicidade</span>
      <ins ref={bloco} className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENTE_ADSENSE} data-ad-slot={SLOT_ADSENSE} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
