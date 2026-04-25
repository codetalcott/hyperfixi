/** Type stub for optional peer dependency siren-agent */
declare module 'siren-agent' {
  export class OODAAgent {
    constructor(url: string, opts: Record<string, unknown>);
    run(): Promise<{
      status: 'stopped' | 'error' | 'maxSteps';
      reason: string;
      result?: unknown;
      steps: number;
      history: Array<Record<string, unknown>>;
    }>;
  }
  export function compileWorkflow(steps: Array<Record<string, unknown>>): unknown;
}
