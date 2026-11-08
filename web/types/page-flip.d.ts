// Tipos mínimos do StPageFlip (page-flip 2.0.7, MIT), que não publica .d.ts. Só o que o leitor usa.
declare module "page-flip/dist/js/page-flip.module.js" {
  export type PageFlipSettings = {
    width: number; height: number; size?: "fixed" | "stretch";
    minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number;
    drawShadow?: boolean; flippingTime?: number; usePortrait?: boolean; startZIndex?: number; autoSize?: boolean;
    maxShadowOpacity?: number; showCover?: boolean; mobileScrollSupport?: boolean; swipeDistance?: number;
    clickEventForward?: boolean; useMouseEvents?: boolean; showPageCorners?: boolean; disableFlipByClick?: boolean; startPage?: number;
  };
  export type PageFlipEvent<T = unknown> = { data: T; object: PageFlip };
  export class PageFlip {
    constructor(el: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    updateFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    on(evento: "flip", cb: (e: PageFlipEvent<number>) => void): PageFlip;
    on(evento: "changeOrientation", cb: (e: PageFlipEvent<"portrait" | "landscape">) => void): PageFlip;
    on(evento: "changeState", cb: (e: PageFlipEvent<"user_fold" | "fold_corner" | "flipping" | "read">) => void): PageFlip;
    on(evento: "init" | "update", cb: (e: PageFlipEvent<{ page: number; mode: "portrait" | "landscape" }>) => void): PageFlip;
    off(evento: string): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(pagina: number, corner?: "top" | "bottom"): void;
    turnToPage(pagina: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): "portrait" | "landscape";
    update(): void;
    destroy(): void;
  }
}
