const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const [lang, ...srcs] = process.argv.slice(2);
const show = (n: any): any => n && ({ kind: n.kind, action: n.action, roles: n.roles ? Object.fromEntries([...n.roles].map(([k, v]: any) => [k, v])) : undefined, body: n.body?.map(show), commands: n.commands?.map(show), mods: n.eventModifiers, ...(n.doNotThrow ? { dnt: true } : {}) });
for (const s of srcs) L(s, JSON.stringify(show(sem.parse(s, lang)), null, 1));
process.exit(0);
