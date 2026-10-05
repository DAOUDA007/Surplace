import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Enveloppe un gestionnaire async : renvoie son résultat en JSON, transmet les erreurs. */
export function route(fn: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler {
  return async (req, res, next) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json(result ?? { ok: true });
    } catch (err) {
      next(err);
    }
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Requête invalide." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur." });
}
