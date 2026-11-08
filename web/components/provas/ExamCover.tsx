// Capa ilustrativa de um caderno (desenho do onde passo, não a capa oficial): lombada na cor do caderno, ano e dia.
import type { Prova } from "@/lib/provas-tipos";
import { MODALIDADE_CURTA } from "@/lib/provas-tipos";

export function ExamCover({ p, tamanho = "normal" }: { p: Prova; tamanho?: "normal" | "grande" }) {
  const claro = p.cor === "branco" || p.cor === "amarelo";
  return (
    <div className={`capa-caderno capa-${tamanho}`} style={{ ["--cor-caderno" as string]: p.corHex }} aria-hidden="true">
      <span className="capa-lombada" />
      <span className="capa-faixa" style={{ color: claro ? "#1b1a17" : "#fff" }}>{p.corRotulo}</span>
      <span className="capa-ano">{p.ano}</span>
      <span className="capa-dia">{p.dia}º dia</span>
      <span className="capa-cad">Caderno {p.caderno}</span>
      {p.modalidade !== "regular" && <span className="capa-mod">{MODALIDADE_CURTA[p.modalidade]}</span>}
      <span className="capa-linhas"><i /><i /><i /></span>
    </div>
  );
}
