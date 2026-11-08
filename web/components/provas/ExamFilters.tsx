"use client";
// Filtros combináveis da biblioteca (todos por metadados oficiais do Inep). Disciplina depende do índice de questões
// revisado, que ainda não existe: aparece desativado, sem prometer nada.
import { useState } from "react";
import type { Area, Filtros, Modalidade } from "@/lib/provas-tipos";
import { AREA_ROTULO, MODALIDADE_CURTA } from "@/lib/provas-tipos";

type Opcoes = { anos: number[]; cores: { id: string; rotulo: string; hex: string; n: number }[]; modalidades: { id: Modalidade; n: number }[] };

function Grupo({ titulo, children, id }: { titulo: string; children: React.ReactNode; id: string }) {
  return (
    <div className="filtro-grupo" role="group" aria-labelledby={id}>
      <span className="filtro-titulo" id={id}>{titulo}</span>
      <div className="filtro-chips">{children}</div>
    </div>
  );
}

function Chip({ ativo, onClick, children, desativado, rotulo }: { ativo: boolean; onClick: () => void; children: React.ReactNode; desativado?: boolean; rotulo?: string }) {
  return (
    <button type="button" className={`chip${ativo ? " ativo" : ""}`} aria-pressed={ativo} onClick={onClick} disabled={desativado} aria-label={rotulo}>
      {children}
    </button>
  );
}

export function ExamFilters({ f, opcoes, mudar, limpar, ativos }: { f: Filtros; opcoes: Opcoes; mudar: (p: Partial<Filtros>, filtro: string) => void; limpar: () => void; ativos: number }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="filtros-provas" aria-label="Filtros da biblioteca">
      <div className="busca busca-provas">
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true"><path d="M10.08 17.42a7.33 7.33 0 1 0 0-14.67 7.33 7.33 0 0 0 0 14.67Z" /><path d="m19.25 19.25-3.94-3.94" /></svg>
        <input type="search" value={f.busca} placeholder="Buscar: 2023 azul, reaplicação, libras…" aria-label="Buscar provas"
          onChange={(e) => mudar({ busca: e.target.value }, "busca")} maxLength={80} />
      </div>
      <button type="button" className="botao botao-contorno filtros-alternar" aria-expanded={aberto} aria-controls="filtros-corpo" onClick={() => setAberto((v) => !v)}>
        Filtros{ativos > 0 ? ` (${ativos})` : ""}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ rotate: aberto ? "180deg" : "0deg", transition: "rotate .2s" }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div id="filtros-corpo" className={`filtros-corpo${aberto ? " aberto" : ""}`}>
        <Grupo titulo="Ano" id="f-ano">
          <Chip ativo={f.ano == null} onClick={() => mudar({ ano: null }, "ano")}>Todos</Chip>
          {opcoes.anos.map((a) => <Chip key={a} ativo={f.ano === a} onClick={() => mudar({ ano: f.ano === a ? null : a }, "ano")}>{a}</Chip>)}
        </Grupo>
        <Grupo titulo="Dia" id="f-dia">
          <Chip ativo={f.dia == null} onClick={() => mudar({ dia: null }, "dia")}>Os dois</Chip>
          <Chip ativo={f.dia === 1} onClick={() => mudar({ dia: f.dia === 1 ? null : 1, area: null }, "dia")}>1º dia</Chip>
          <Chip ativo={f.dia === 2} onClick={() => mudar({ dia: f.dia === 2 ? null : 2, area: null }, "dia")}>2º dia</Chip>
        </Grupo>
        <Grupo titulo="Área" id="f-area">
          {(Object.keys(AREA_ROTULO) as Area[]).map((a) => (
            <Chip key={a} ativo={f.area === a} onClick={() => mudar({ area: f.area === a ? null : a, dia: null }, "area")}>{AREA_ROTULO[a]}</Chip>
          ))}
        </Grupo>
        <Grupo titulo="Cor do caderno" id="f-cor">
          {opcoes.cores.map((c) => (
            <Chip key={c.id} ativo={f.cor === c.id} onClick={() => mudar({ cor: f.cor === c.id ? null : c.id }, "cor")} desativado={c.n === 0 && f.cor !== c.id}>
              <span className="bolinha" style={{ background: c.hex }} aria-hidden="true" />{c.rotulo}
            </Chip>
          ))}
        </Grupo>
        <Grupo titulo="Aplicação" id="f-mod">
          <Chip ativo={f.modalidade == null} onClick={() => mudar({ modalidade: null }, "modalidade")}>Todas</Chip>
          {opcoes.modalidades.map((m) => (
            <Chip key={m.id} ativo={f.modalidade === m.id} onClick={() => mudar({ modalidade: f.modalidade === m.id ? null : m.id }, "modalidade")} desativado={m.n === 0 && f.modalidade !== m.id}>
              {m.id === "reaplicacao" ? "Reaplicação / PPL" : MODALIDADE_CURTA[m.id]}
            </Chip>
          ))}
        </Grupo>
        <Grupo titulo="Acessibilidade" id="f-aces">
          <Chip ativo={f.acessivel} onClick={() => mudar({ acessivel: !f.acessivel }, "acessivel")}>Com versões acessíveis</Chip>
        </Grupo>
        <div className="filtro-grupo filtro-futuro">
          <span className="filtro-titulo">Disciplina</span>
          <div className="filtro-chips">
            <span className="chip" aria-disabled="true">Em preparação</span>
            <span className="miudo">Precisa do índice de questões revisado (português, física, história…). Por enquanto, filtre por área.</span>
          </div>
        </div>
        {ativos > 0 && <button type="button" className="limpar-filtros" onClick={limpar}>Limpar filtros</button>}
      </div>
    </section>
  );
}
