// Entrada do Cloudflare Worker. Toda a lógica está em nucleo.ts.
import { tratar, type Ambiente } from "./nucleo";

export default { fetch: (req: Request, amb: Ambiente) => tratar(req, amb) };
