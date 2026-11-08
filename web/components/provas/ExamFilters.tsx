"use client";
// Controles da biblioteca: ano e dia (o que quase todo mundo usa), busca, aplicação e versões acessíveis.
// Tudo por metadados oficiais. Disciplina depende de um índice de questões revisado e ainda não entra aqui.
import type { Filtros, Modalidade } from "@/lib/provas-tipos";

const MODALIDADES: { id: Modalidade; rotulo: string }[] = [
  { id: "regular", rotulo: "Regular" },
  { id: "reaplicacao", rotulo: "Reaplicação e PPL" },
  { id: "digital", rotulo: "Digital" },
  { id: "belem", rotulo: "Belém" },
];

export function ExamFilters({ f, anos, mudar }: { f: Filtros; anos: number[]; mudar: (p: Partial<Filtros>, filtro: string) => void }) {
  const dia = f.dia ?? (f.area === "linguagens" || f.area === "humanas" ? 1 : f.area ? 2 : null);
  return (
    <div className="controles" role="search" aria-label="Filtrar provas">
      <div className="controle-anos" role="group" aria-label="Ano">
        <button type="button" aria-pressed={f.ano == null} onClick={() => mudar({ ano: null }, "ano")}>Todos os anos</button>
        {anos.map((a) => <button key={a} type="button" aria-pressed={f.ano === a} onClick={() => mudar({ ano: f.ano === a ? null : a }, "ano")}>{a}</button>)}
      </div>
        <div className="controle-dias" role="group" aria-label="Dia">
          <button type="button" aria-pressed={dia == null} onClick={() => mudar({ dia: null, area: null }, "dia")}>Os dois dias</button>
          <button type="button" aria-pressed={dia === 1} onClick={() => mudar({ dia: 1, area: null }, "dia")} title="Linguagens, Ciências Humanas e Redação">1º dia</button>
          <button type="button" aria-pressed={dia === 2} onClick={() => mudar({ dia: 2, area: null }, "dia")} title="Ciências da Natureza e Matemática">2º dia</button>
        </div>
        <label className="controle-busca">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M10.08 17.42a7.33 7.33 0 1 0 0-14.67 7.33 7.33 0 0 0 0 14.67Z" /><path d="m19.25 19.25-3.94-3.94" /></svg>
          <span className="sr-only">Buscar</span>
          <input type="search" value={f.busca} placeholder="Buscar cor, ano, Libras…" maxLength={80} onChange={(e) => mudar({ busca: e.target.value }, "busca")} />
        </label>
        <div className="controle-extra">
        <label className="controle-select">
          <span>Aplicação</span>
          <select value={f.modalidade ?? ""} onChange={(e) => mudar({ modalidade: (e.target.value || null) as Modalidade | null }, "modalidade")}>
            <option value="">Todas</option>
            {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
          </select>
        </label>
        <label className="controle-check">
          <input type="checkbox" checked={f.acessivel} onChange={(e) => mudar({ acessivel: e.target.checked }, "acessivel")} />
          Versões acessíveis
        </label>
        </div>
    </div>
  );
}
