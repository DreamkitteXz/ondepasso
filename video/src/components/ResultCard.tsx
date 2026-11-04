// Cartões de resultado do site: cartão do campus no mapa, cortes por cota, últimas edições e linha de opção.
import React from "react";
import dados from "../data/dados.json";
import { COR, COR_STATUS, SERIF, nota, type Status } from "../lib/tema";
import { Pilula, SeloStatus } from "./ui";

const o = dados.oferta;

/** Cartão do campus (web: CartaoPonto). `numeros` 0→1 revela os três números em sequência. */
export const CartaoCampus: React.FC<{ numeros: number; largura?: number }> = ({ numeros, largura = 380 }) => {
  const n = (i: number) => Math.max(0, Math.min(1, numeros * 3 - i));
  const caixa = (rot: string, val: React.ReactNode, i: number, cor?: string) => (
    <div style={{ background: COR.panel, borderRadius: 8, padding: "8px 10px", opacity: 0.25 + 0.75 * n(i), translate: `0px ${(1 - n(i)) * 6}px` }}>
      <span style={{ display: "block", fontSize: 11, color: COR.fg4 }}>{rot}</span>
      <strong style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: cor }}>{val}</strong>
    </div>
  );
  return (
    <div style={{ width: largura, background: COR.panel3, border: `1px solid ${COR.linha2}`, borderRadius: 12, padding: 14, display: "grid", gap: 10, boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{o.curso} · {o.ies}</div>
          <div style={{ fontSize: 12, color: COR.fg3, marginTop: 2 }}>{o.cidade} · {o.turno}</div>
        </div>
        <SeloStatus s="supera" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {caixa("Corte", nota(o.corte), 0)}
        {caixa("Você", nota(dados.nota), 1)}
        {caixa("Diferença", `+${nota(o.diferenca)}`, 2, COR.verde)}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: COR.fg2 }}>
        Sua nota supera o corte do Sisu {dados.ano}. O corte muda de um ano para o outro, então não é garantia.
      </p>
    </div>
  );
};

/** Topo da página da opção: nota de corte grande + a sua média. */
export const CartaoCorte: React.FC<{ largura?: number; numero: React.ReactNode }> = ({ largura = 560, numero }) => (
  <div style={{ width: largura, background: COR.panel, border: `1px solid ${COR.linha1}`, borderRadius: 14, padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", color: COR.fg3 }}>NOTA DE CORTE · SISU {dados.ano} · AMPLA</div>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 6 }}>
      <div>
        <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>{numero}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6, background: COR.vermelhoTinta, color: COR.vermelho }}>▲ {nota(o.variacao)} vs. {dados.ano - 1}</span>
          <span style={{ fontSize: 11, color: COR.fg3 }}>chamada regular · MEC</span>
        </div>
      </div>
      <div style={{ background: COR.panel2, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6, maxWidth: 230 }}>
        <span style={{ fontSize: 13, color: COR.fg2 }}>Sua média <b style={{ color: COR.fg1 }}>{nota(dados.nota)}</b></span>
        <span style={{ justifySelf: "start", fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: COR.verdeTinta, color: COR.verde }}>Supera o corte</span>
        <span style={{ fontSize: 12, color: COR.fg3, lineHeight: 1.4 }}>{nota(o.diferenca)} pontos acima do corte de {dados.ano} (não é garantia)</span>
      </div>
    </div>
  </div>
);

/** Cortes por cota (primeiras linhas). `linhas` 0→1 faz as linhas entrarem em cascata. */
export const TabelaCotas: React.FC<{ linhas: number; largura?: number; max?: number }> = ({ linhas, largura = 560, max = 5 }) => {
  const cotas = o.cotas.slice(0, max);
  return (
    <div style={{ width: largura, background: COR.panel, border: `1px solid ${COR.linha1}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 20px 10px" }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Cortes por cota · {dados.ano}</span>
        <span style={{ fontSize: 12, color: COR.fg3 }}>{o.cotas.length} modalidades</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 54px 74px 78px", padding: "8px 20px", fontSize: 12, color: COR.fg3, borderBottom: `1px solid ${COR.linha1}` }}>
        <span>Modalidade</span><span style={{ textAlign: "right" }}>Vagas</span><span style={{ textAlign: "right" }}>Inscritos</span><span style={{ textAlign: "right" }}>Corte</span>
      </div>
      {cotas.map((c, i) => {
        const k = Math.max(0, Math.min(1, linhas * (cotas.length + 1) - i));
        return (
          <div key={c.cod} style={{
            display: "grid", gridTemplateColumns: "1fr 54px 74px 78px", padding: "11px 20px", fontSize: 13.5, alignItems: "center",
            borderBottom: i < cotas.length - 1 ? `1px solid ${COR.linha1}` : "none", background: i === 0 ? COR.panel2 : undefined,
            opacity: k, translate: `${(1 - k) * 24}px 0px`,
          }}>
            <span style={{ fontWeight: i === 0 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nome}</span>
            <span style={{ textAlign: "right", color: COR.fg2 }}>{c.vagas}</span>
            <span style={{ textAlign: "right", color: COR.fg2 }}>{c.inscritos.toLocaleString("pt-BR")}</span>
            <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{nota(c.corte)}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Últimas edições · ampla (barras do histórico). `barras` 0→1 faz as barras crescerem. */
export const Historico: React.FC<{ barras: number; largura?: number }> = ({ barras, largura = 400 }) => {
  const vals = o.historico.map((h) => h.corte ?? 0);
  const piso = Math.floor(Math.min(...vals) / 50) * 50 - 50, teto = Math.max(...vals);
  return (
    <div style={{ width: largura, background: COR.panel, border: `1px solid ${COR.linha1}`, borderRadius: 14, padding: 20, boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Últimas edições · ampla</div>
      <div style={{ display: "grid", gap: 12 }}>
        {o.historico.map((h, i) => {
          const k = Math.max(0, Math.min(1, barras * 3.2 - i * 0.9));
          const ult = i === o.historico.length - 1;
          return (
            <div key={h.ano} style={{ display: "grid", gridTemplateColumns: "40px 1fr 62px", gap: 10, alignItems: "center", fontSize: 13 }}>
              <span style={{ color: ult ? COR.fg1 : COR.fg3 }}>{h.ano}</span>
              <div style={{ height: 8, background: COR.panel3, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(((h.corte ?? piso) - piso) / (teto - piso)) * 100 * k}%`, background: ult ? COR.fg1 : COR.fg4, borderRadius: 4 }} />
              </div>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: ult ? 600 : 400, color: ult ? COR.fg1 : COR.fg2, opacity: k }}>{h.corte != null ? nota(h.corte) : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Linha de opção (web: LinhaPonto) com o status. */
export const LinhaOpcao: React.FC<{ titulo: string; meta: string; corte: number; s: Status; largura?: number; destaque?: number }> = ({ titulo, meta, corte, s, largura = 420, destaque = 0 }) => (
  <div style={{
    width: largura, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", background: COR.panel,
    border: `1px solid ${destaque > 0 ? COR_STATUS[s] : COR.linha1}`, borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,.4)",
  }}>
    <div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{titulo}</div>
      <div style={{ fontSize: 13, color: COR.fg3, marginTop: 2 }}>{meta}</div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 19, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{nota(corte)}</div>
      <div style={{ fontSize: 12, color: COR_STATUS[s], marginTop: 2 }}>{s === "supera" ? "Supera o corte" : s === "pouco" ? "Por pouco" : "Abaixo do corte"}</div>
    </div>
  </div>
);

export { Pilula, SERIF };
