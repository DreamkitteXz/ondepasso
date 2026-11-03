import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource/faustina/600.css";
import "./globals.css";
import { Logo } from "@/components/Logo";
import { BotaoTema, SCRIPT_TEMA } from "@/components/Tema";
import { NavTopo, Tabbar } from "@/components/Navegacao";
import { indice } from "@/lib/dados";

import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  alternates: { canonical: "/" },
  openGraph: { siteName: "onde passo", locale: "pt_BR", type: "website" },
  title: { default: "onde passo · notas de corte do Sisu", template: "%s · onde passo" },
  description: "Notas de corte do Sisu por curso, universidade, cota e ano. Grátis e sem cadastro.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }], apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { anos, atualizado } = indice();
  return (
    <html lang="pt-BR" className={GeistSans.variable} style={{ ["--font-faustina" as string]: "Faustina" }} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
      <body>
        <header className="topbar">
          <div className="wrap">
            <a href="/" aria-label="onde passo — início"><Logo /></a>
            <NavTopo />
            <div className="acoes">
              <span className="selo"><span className="ponto" /><span><span className="so-desktop-inline">Próximo Sisu: </span><span className="so-mobile-inline">Sisu </span>jan/{Math.max(...anos) + 1}</span></span>
              <BotaoTema />
            </div>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer>
          <div className="wrap">
            <p>Cortes do Sisu {anos[0]} a {anos[anos.length - 1]} (chamada regular), dados públicos do MEC. O onde passo não é oficial: confira sempre no <a href="https://acessounico.mec.gov.br/">portal do Sisu</a>.</p>
            <p><a href="/sobre-dados/">Fonte e metodologia</a></p>
            <p>Base atualizada em {atualizado.split("-").reverse().join("/")}. Suas notas nunca saem do seu navegador.</p>
          </div>
        </footer>
        <Tabbar />
      </body>
    </html>
  );
}
