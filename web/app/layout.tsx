import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource/faustina/600.css";
import "./globals.css";
import { Logo } from "@/components/Logo";
import { indice } from "@/lib/dados";

export const metadata: Metadata = {
  title: { default: "onde passo · notas de corte do Sisu", template: "%s · onde passo" },
  description: "Notas de corte do Sisu por curso, universidade, cota e ano. Grátis e sem cadastro.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }], apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { anos, atualizado } = indice();
  return (
    <html lang="pt-BR" className={GeistSans.variable} style={{ ["--font-faustina" as string]: "Faustina" }}>
      <body>
        <header className="topbar">
          <div className="wrap">
            <a href="/" aria-label="onde passo — início"><Logo /></a>
            <span className="selo"><span className="ponto" />Sisu {Math.max(...anos)}</span>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer>
          <div className="wrap">
            <p>Dados públicos do MEC (Sisu {anos[0]}–{anos[anos.length - 1]}, chamada regular). O onde passo não é um site oficial: confira sempre no portal do Sisu.</p>
            <p>Atualizado em {atualizado.split("-").reverse().join("/")}. Suas notas nunca saem do seu navegador.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
