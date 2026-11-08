"use client";
import { usePathname } from "next/navigation";
// Navegação do site: no desktop fica na Topbar (Topbar web), no celular vira a Tabbar fixa embaixo.
// Ao vivo ainda não existe: aparecem como no Figma, mas desativadas.
const ICONES = {
  buscar: <><path d="M10.08 17.42a7.33 7.33 0 1 0 0-14.67 7.33 7.33 0 0 0 0 14.67Z" /><path d="m19.25 19.25-3.94-3.94" /></>,
  aovivo: <path d="M20.17 11H16.5l-2.75 8.25-5.5-16.5L5.5 11H1.83" />,
  calcular: <><path d="M16.5 1.83h-11c-1.01 0-1.83.82-1.83 1.84v14.66c0 1.02.82 1.84 1.83 1.84h11c1.01 0 1.83-.82 1.83-1.84V3.67c0-1.02-.82-1.84-1.83-1.84Z" /><path d="M7.33 5.5h7.34M7.33 9.17h.01M11 9.17h.01M14.67 9.17h.01M7.33 12.83h.01M11 12.83h.01M7.33 16.5h.01M11 16.5h.01M14.67 12.83v3.67" /></>,
  universidades: <path d="M2.75 20.17h16.5M5.5 16.5v-6.42M9.17 16.5v-6.42M12.83 16.5v-6.42M16.5 16.5v-6.42M11 1.83l7.33 4.59H3.67L11 1.83Z" />,
  provas: <><path d="M11 5.5C9.17 4.12 6.42 3.67 2.75 3.67v13.75c3.67 0 6.42.46 8.25 1.83 1.83-1.37 4.58-1.83 8.25-1.83V3.67c-3.67 0-6.42.45-8.25 1.83Z" /><path d="M11 5.5v13.75" /></>,
};
/** Aba atual pelo caminho: /calcular é Calcular, /provas é Provas; o resto (home, cursos) é Buscar. */
function useAtual() {
  const p = usePathname() ?? "/";
  return p.startsWith("/ao-vivo") ? "aovivo" : p.startsWith("/calcular") ? "calcular" : p.startsWith("/universidades") ? "universidades" : p.startsWith("/provas") ? "provas" : "buscar";
}

const ITENS: { chave: keyof typeof ICONES; rotulo: string; href?: string }[] = [
  { chave: "buscar", rotulo: "Buscar", href: "/" },
  { chave: "aovivo", rotulo: "Ao vivo", href: "/ao-vivo/" },
  { chave: "calcular", rotulo: "Calcular", href: "/calcular/" },
  { chave: "universidades", rotulo: "Universidades", href: "/universidades/" },
  { chave: "provas", rotulo: "Provas", href: "/provas/" },
];

export function NavTopo() {
  const atual = useAtual();
  return (
    <nav className="nav-topo" aria-label="Seções">
      {ITENS.map((i) => i.href
        ? <a key={i.chave} href={i.href} className={i.chave === atual ? "ativo" : undefined} aria-current={i.chave === atual ? "page" : undefined}>{i.rotulo}</a>
        : <span key={i.chave} aria-disabled="true" title="Em breve">{i.rotulo}</span>)}
    </nav>
  );
}

export function Tabbar() {
  const atual = useAtual();
  return (
    <nav className="tabbar" aria-label="Seções">
      {ITENS.map((i) => {
        const conteudo = (
          <>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONES[i.chave]}</svg>
            <span>{i.rotulo}</span>
          </>
        );
        return i.href
          ? <a key={i.chave} href={i.href} className={i.chave === atual ? "ativo" : undefined} aria-current={i.chave === atual ? "page" : undefined}>{conteudo}</a>
          : <span key={i.chave} aria-disabled="true" title="Em breve">{conteudo}</span>;
      })}
    </nav>
  );
}
