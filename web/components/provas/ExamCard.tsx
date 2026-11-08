"use client";
// Cartão de um caderno na biblioteca: capa, metadados conferidos e ações (ler, baixar, fonte oficial).
import type { Prova } from "@/lib/provas-tipos";
import { AREA_ROTULO, IDIOMA_ROTULO, VARIANTE_ROTULO, megas } from "@/lib/provas-tipos";
import { registrar } from "@/lib/analytics";
import { ExamCover } from "./ExamCover";

export function ExamCard({ p, indice = 0, favorita, aoFavoritar }: { p: Prova; indice?: number; favorita: boolean; aoFavoritar: (id: string) => void }) {
  const href = `/provas/${p.id}/`;
  const areas = p.areas.map((a) => AREA_ROTULO[a]).join(" e ") + (p.redacao ? " + Redação" : "");
  return (
    <article className="prova-card" style={{ ["--atraso" as string]: `${Math.min(indice, 12) * 35}ms`, ["--cor-caderno" as string]: p.corHex }}>
      <a href={href} className="prova-card-capa" tabIndex={-1} aria-hidden="true"><ExamCover p={p} /></a>
      <div className="prova-card-corpo">
        <h3 className="prova-card-titulo">
          <a href={href}>Caderno {p.caderno} · {p.corRotulo}{p.variante ? ` (${VARIANTE_ROTULO[p.variante]})` : ""}{p.idioma ? ` · ${IDIOMA_ROTULO[p.idioma]}` : ""}</a>
        </h3>
        <p className="prova-card-meta">{p.dia}º dia · {areas}</p>
        <ul className="prova-card-selos" aria-label="Detalhes">
          <li>{p.questoes} questões</li>
          {p.gabarito ? <li className="ok">Gabarito oficial</li> : <li className="falta" title="O link do gabarito na página do Inep está fora do ar">Gabarito indisponível</li>}
          {p.versoes.length > 0 && <li>Versões acessíveis</li>}
        </ul>
      </div>
      <div className="prova-card-acoes">
        <a className="botao botao-pequeno" href={`${href}#ler`}>Ler prova</a>
        <a className="botao botao-contorno botao-pequeno" href={p.prova.url} target="_blank" rel="noopener" download
          onClick={() => registrar("enem_pdf_baixado", { prova: p.id, arquivo: "prova", origem: "biblioteca" })}
          aria-label={`Baixar PDF da prova (${megas(p.prova.bytes)}, abre o arquivo oficial do Inep)`}>
          PDF <span className="miudo">{megas(p.prova.bytes)}</span>
        </a>
        <button type="button" className={`botao-icone${favorita ? " ativo" : ""}`} aria-pressed={favorita}
          aria-label={favorita ? "Remover dos salvos" : "Salvar para depois"} title={favorita ? "Remover dos salvos" : "Salvar para depois"}
          onClick={() => aoFavoritar(p.id)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={favorita ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
        </button>
      </div>
    </article>
  );
}

