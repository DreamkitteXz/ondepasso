"use client";
// Controles da biblioteca: ano e dia (o que quase todo mundo usa), busca, aplicação e versões acessíveis.
// Tudo por metadados oficiais. Disciplina depende de um índice de questões revisado e ainda não entra aqui.
import type { Filtros, InfoVestibular, Modalidade } from "@/lib/provas-tipos";

const MODALIDADES: { id: Modalidade; rotulo: string }[] = [
  { id: "regular", rotulo: "Regular" },
  { id: "reaplicacao", rotulo: "Reaplicação e PPL" },
  { id: "digital", rotulo: "Digital" },
  { id: "belem", rotulo: "Belém" },
];

export function ExamFilters({ f, anos, anosEnem = [], vestibulares, mudar }: { f: Filtros; anos: number[]; anosEnem?: number[]; vestibulares: InfoVestibular[]; mudar: (p: Partial<Filtros>, filtro: string) => void }) {
  const anosDe = (v: string) => (v === "enem" ? anosEnem : vestibulares.find((x) => x.id === v)?.edicoes ?? []);
  const dia = f.dia ?? (f.area === "linguagens" || f.area === "humanas" ? 1 : f.area ? 2 : null);
  return (
    <div className={`controles${vestibulares.length ? " com-vestibular" : ""}`} role="search" aria-label="Filtrar provas">
      {vestibulares.length > 0 && (
        <div className="controle-vest">
          <div className="controle-dias" role="group" aria-label="Vestibular">
            <button type="button" aria-pressed={f.vestibular == null} onClick={() => mudar({ vestibular: null }, "vestibular")}>Todos</button>
            <button type="button" aria-pressed={f.vestibular === "enem"} onClick={() => mudar({ vestibular: "enem", fase: null, ...(f.ano != null && !anosDe("enem").includes(f.ano) ? { ano: null } : {}) }, "vestibular")}>Enem</button>
            {vestibulares.map((v) => v.estado === "catalogado"
              ? <button key={v.id} type="button" aria-pressed={f.vestibular === v.id} onClick={() => mudar({ vestibular: v.id, cor: null, area: null, modalidade: null, acessivel: false, ...(f.ano != null && !anosDe(v.id).includes(f.ano) ? { ano: null } : {}) }, "vestibular")}>{v.nome}</button>
              : <button key={v.id} type="button" disabled title={v.pendencia}>{v.nome} <small>em preparação</small></button>)}
          </div>
          {f.vestibular !== "enem" && (
            <div className="controle-dias" role="group" aria-label="Fase">
              <button type="button" aria-pressed={f.fase == null} onClick={() => mudar({ fase: null }, "fase")}>Todas as fases</button>
              <button type="button" aria-pressed={f.fase === 1} onClick={() => mudar({ fase: 1 }, "fase")}>1ª fase</button>
              <button type="button" aria-pressed={f.fase === 2} onClick={() => mudar({ fase: 2 }, "fase")}>2ª fase</button>
            </div>
          )}
        </div>
      )}
      <div className="controle-anos" role="group" aria-label="Ano">
        <button type="button" aria-pressed={f.ano == null} onClick={() => mudar({ ano: null }, "ano")}>{vestibulares.length ? "Todas as edições" : "Todos os anos"}</button>
        {anos.map((a) => <button key={a} type="button" aria-pressed={f.ano === a} onClick={() => mudar({ ano: f.ano === a ? null : a }, "ano")}>{a}</button>)}
      </div>
        <div className="controle-dias" role="group" aria-label="Dia">
          <button type="button" aria-pressed={dia == null} onClick={() => mudar({ dia: null, area: null }, "dia")}>Os dois dias</button>
          <button type="button" aria-pressed={dia === 1} onClick={() => mudar({ dia: 1, area: null }, "dia")} title={f.vestibular === "enem" || !vestibulares.length ? "Linguagens, Ciências Humanas e Redação" : undefined}>1º dia</button>
          <button type="button" aria-pressed={dia === 2} onClick={() => mudar({ dia: 2, area: null }, "dia")} title={f.vestibular === "enem" || !vestibulares.length ? "Ciências da Natureza e Matemática" : undefined}>2º dia</button>
        </div>
        <label className="controle-busca">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M10.08 17.42a7.33 7.33 0 1 0 0-14.67 7.33 7.33 0 0 0 0 14.67Z" /><path d="m19.25 19.25-3.94-3.94" /></svg>
          <span className="sr-only">Buscar</span>
          <input type="search" value={f.busca} placeholder={vestibulares.length ? "Buscar ano, cor, versão, fase…" : "Buscar cor, ano, Libras…"} maxLength={80} onChange={(e) => mudar({ busca: e.target.value }, "busca")} />
        </label>
        {(f.vestibular == null || f.vestibular === "enem") && (
        <div className="controle-extra">
        <label className="controle-select">
          <span>Aplicação{vestibulares.length ? " do Enem" : ""}</span>
          <select value={f.modalidade ?? ""} onChange={(e) => mudar({ modalidade: (e.target.value || null) as Modalidade | null }, "modalidade")}>
            <option value="">Todas</option>
            {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
          </select>
        </label>
        <label className="controle-check">
          <input type="checkbox" checked={f.acessivel} onChange={(e) => mudar({ acessivel: e.target.checked }, "acessivel")} />
          Versões acessíveis{vestibulares.length ? " (Enem)" : ""}
        </label>
        </div>
        )}
    </div>
  );
}
