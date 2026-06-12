import { Request, Response, NextFunction } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
}

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "An unexpected server error occurred." });
}
