declare global {
  namespace Hyperscript {
    interface Commands {
      fetch(url: string, ...args: any[]): Promise<any>;
    }
  }
}