import express, { type NextFunction, type Request, type Response } from "express";
import { criarFila, isTipo, type Resultado } from "./fila.js";

function responder(res: Response, r: Resultado): void {
  if (r.ok) res.json(r.senha);
  else res.status(r.http).json({ erro: r.erro });
}

export function criarApp() {
  const app = express();
  const fila = criarFila();
  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/senhas", (req, res) => {
    const tipo = (req.body as { tipo?: unknown } | undefined)?.tipo;
    if (!isTipo(tipo)) {
      res.status(422).json({ erro: "tipo_invalido" });
      return;
    }
    res.status(201).json(fila.emitir(tipo));
  });

  app.get("/senhas/proxima", (_req, res) => {
    const senha = fila.chamarProxima();
    if (!senha) {
      res.status(404).json({ erro: "fila_vazia" });
      return;
    }
    res.json(senha);
  });

  app.post("/senhas/:codigo/concluir", (req, res) => responder(res, fila.concluir(req.params.codigo)));
  app.post("/senhas/:codigo/rechamar", (req, res) => responder(res, fila.rechamar(req.params.codigo)));
  app.post("/senhas/:codigo/cancelar", (req, res) => responder(res, fila.cancelar(req.params.codigo)));

  app.get("/painel", (_req, res) => {
    res.json({ chamadas: fila.painel() });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ erro: "rota_nao_encontrada" });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && req.method === "POST" && req.path === "/senhas") {
      res.status(422).json({ erro: "tipo_invalido" });
      return;
    }
    const status = (err as { status?: number }).status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      res.status(status).json({ erro: "requisicao_invalida" });
      return;
    }
    console.error(err);
    res.status(500).json({ erro: "erro_interno" });
  });

  return app;
}