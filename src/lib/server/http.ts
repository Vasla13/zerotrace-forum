import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );
  }

  console.error(error);

  return NextResponse.json(
    { message: "Erreur serveur." },
    { status: 500 },
  );
}
