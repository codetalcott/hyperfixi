/**
 * CLI Debugger — terminal-based interactive debugger for HyperFixi
 *
 * Connects to a browser running the HyperFixi debug overlay via WebSocket
 * and provides a REPL-style interface for stepping through execution.
 *
 * Usage:
 *   npx hyperfixi debug [ws://localhost:9229]
 *
 * Commands:
 *   continue (c)   Resume execution
 *   step (s)       Step over
 *   into (i)       Step into
 *   out (o)        Step out
 *   pause (p)      Pause at next command
 *   vars (v)       Show current variables
 *   history (h)    Show execution history
 *   break <cmd>    Set breakpoint on command name
 *   break .<cls>   Set breakpoint on element with class
 *   break #id      Set breakpoint on element with id
 *   unbreak <id>   Remove breakpoint
 *   breakpoints    List all breakpoints
 *   quit (q)       Disconnect and exit
 */

import { WebSocket } from 'ws';
import * as readline from 'readline';
import type { WSDebugMessage, SerializedSnapshot } from './ws-bridge';

export class CLIDebugger {
  private ws: WebSocket | null = null;
  private rl: readline.Interface | null = null;
  private currentSnapshot: SerializedSnapshot | null = null;
  private paused = false;
  private history: SerializedSnapshot[] = [];

  constructor(private url = 'ws://localhost:9229') {}

  async start(): Promise<void> {
    console.log(`\x1b[36mHyperFixi CLI Debugger\x1b[0m`);
    console.log(`Connecting to ${this.url}...`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log(`\x1b[32mConnected.\x1b[0m Type "help" for commands.\n`);
        this.startREPL();
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const msg: WSDebugMessage = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch {
          // Ignore malformed
        }
      });

      this.ws.on('close', () => {
        console.log('\n\x1b[33mDisconnected.\x1b[0m');
        this.cleanup();
      });

      this.ws.on('error', (err: Error) => {
        console.error(`\x1b[31mConnection failed:\x1b[0m ${err.message}`);
        reject(err);
      });
    });
  }

  private handleMessage(msg: WSDebugMessage): void {
    switch (msg.type) {
      case 'paused':
        this.paused = true;
        this.currentSnapshot = msg.snapshot;
        this.printPaused(msg.snapshot);
        break;

      case 'resumed':
        this.paused = false;
        this.currentSnapshot = null;
        console.log('\x1b[32m  Running...\x1b[0m');
        break;

      case 'snapshot':
        this.history.push(msg.snapshot);
        // Keep last 200
        if (this.history.length > 200) this.history.shift();
        break;

      case 'state':
        console.log(JSON.stringify(msg.state, null, 2));
        break;
    }

    this.showPrompt();
  }

  private printPaused(snapshot: SerializedSnapshot): void {
    console.log('');
    console.log(
      `\x1b[33m  Paused at:\x1b[0m \x1b[1m${snapshot.commandName}\x1b[0m (step ${snapshot.index})`
    );
    if (snapshot.element) {
      console.log(`\x1b[36m  Element:\x1b[0m  ${snapshot.element}`);
    }
    console.log(`\x1b[36m  Depth:\x1b[0m    ${snapshot.depth}`);

    // Show key variables
    const vars = snapshot.variables;
    const interesting = Object.entries(vars).filter(([k]) => !k.startsWith('__'));
    if (interesting.length > 0) {
      console.log(`\x1b[36m  Variables:\x1b[0m`);
      for (const [name, value] of interesting) {
        console.log(`    \x1b[33m${name}\x1b[0m = \x1b[32m${formatValue(value)}\x1b[0m`);
      }
    }
  }

  private startREPL(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.showPrompt();

    this.rl.on('line', (line: string) => {
      this.handleCommand(line.trim());
      this.showPrompt();
    });

    this.rl.on('close', () => {
      this.cleanup();
    });
  }

  private showPrompt(): void {
    if (this.rl) {
      const status = this.paused ? '\x1b[33m(paused)\x1b[0m' : '\x1b[32m(running)\x1b[0m';
      this.rl.setPrompt(`hfx-debug ${status} > `);
      this.rl.prompt();
    }
  }

  private handleCommand(input: string): void {
    if (!input) return;

    const [cmd, ...args] = input.split(/\s+/);

    switch (cmd.toLowerCase()) {
      case 'continue':
      case 'c':
        this.send({ type: 'continue' });
        break;

      case 'step':
      case 's':
        this.send({ type: 'stepOver' });
        break;

      case 'into':
      case 'i':
        this.send({ type: 'stepInto' });
        break;

      case 'out':
      case 'o':
        this.send({ type: 'stepOut' });
        break;

      case 'pause':
      case 'p':
        this.send({ type: 'pause' });
        break;

      case 'vars':
      case 'v':
        if (this.currentSnapshot) {
          console.log('\x1b[36mVariables:\x1b[0m');
          for (const [name, value] of Object.entries(this.currentSnapshot.variables)) {
            if (!name.startsWith('__')) {
              console.log(`  \x1b[33m${name}\x1b[0m = \x1b[32m${formatValue(value)}\x1b[0m`);
            }
          }
        } else {
          console.log('Not paused — no variables to show.');
        }
        break;

      case 'history':
      case 'h': {
        const count = Math.min(this.history.length, 20);
        const recent = this.history.slice(-count);
        if (recent.length === 0) {
          console.log('No execution history yet.');
        } else {
          console.log(`\x1b[36mLast ${count} commands:\x1b[0m`);
          for (const s of recent) {
            const marker = this.currentSnapshot?.index === s.index ? '\x1b[33m>\x1b[0m' : ' ';
            console.log(
              `${marker} [${s.index}] ${s.commandName}${s.element ? ` on ${s.element}` : ''}`
            );
          }
        }
        break;
      }

      case 'break':
      case 'b': {
        const value = args.join(' ');
        if (!value) {
          console.log('Usage: break <commandName> | break .className | break #id');
          break;
        }
        const bpType = value.startsWith('.') || value.startsWith('#') ? 'element' : 'command';
        this.send({
          type: 'setBreakpoint',
          breakpoint: { type: bpType, value, enabled: true },
        });
        console.log(`Breakpoint set: ${bpType} = ${value}`);
        break;
      }

      case 'unbreak':
      case 'ub': {
        const id = args[0];
        if (!id) {
          console.log('Usage: unbreak <breakpointId>');
          break;
        }
        this.send({ type: 'removeBreakpoint', id });
        console.log(`Breakpoint removed: ${id}`);
        break;
      }

      case 'state':
        this.send({ type: 'getState' });
        break;

      case 'help':
      case '?':
        this.printHelp();
        break;

      case 'quit':
      case 'q':
        this.cleanup();
        process.exit(0);
        break;

      default:
        console.log(`Unknown command: ${cmd}. Type "help" for commands.`);
    }
  }

  private printHelp(): void {
    console.log(`
\x1b[36mHyperFixi CLI Debugger Commands:\x1b[0m

  \x1b[1mcontinue\x1b[0m (c)   Resume execution, stop at breakpoints
  \x1b[1mstep\x1b[0m (s)       Step over — execute current, pause at next
  \x1b[1minto\x1b[0m (i)       Step into — pause at next command (any depth)
  \x1b[1mout\x1b[0m (o)        Step out — resume until returning to caller
  \x1b[1mpause\x1b[0m (p)      Pause at next command

  \x1b[1mvars\x1b[0m (v)       Show current variables
  \x1b[1mhistory\x1b[0m (h)    Show recent execution history
  \x1b[1mstate\x1b[0m          Show debug controller state

  \x1b[1mbreak\x1b[0m (b) <x>  Set breakpoint (command name, .class, or #id)
  \x1b[1munbreak\x1b[0m <id>   Remove breakpoint

  \x1b[1mhelp\x1b[0m (?)       Show this help
  \x1b[1mquit\x1b[0m (q)       Exit debugger
`);
  }

  private send(msg: WSDebugMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.log('\x1b[31mNot connected.\x1b[0m');
    }
  }

  private cleanup(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return v.length > 60 ? `"${v.slice(0, 57)}..."` : `"${v}"`;
  return String(v);
}
