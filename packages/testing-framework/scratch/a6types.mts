import { getSchema } from '../../semantic/src/generators/command-schemas';
for (const c of ['add', 'remove', 'toggle', 'take']) console.log(c, JSON.stringify((getSchema(c as any) as any).roles.find((r: any) => r.role === 'patient').expectedTypes));
