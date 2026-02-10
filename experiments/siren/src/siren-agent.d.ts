/** Type declarations for optional siren-agent dependency */
declare module 'siren-agent/siren-tools' {
  export function parseSirenResponse(
    response: Response,
    opts?: { maxResponseSize?: number }
  ): Promise<Record<string, unknown> | null>;
}
