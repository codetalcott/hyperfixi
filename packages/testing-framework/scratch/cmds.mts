import { commandSchemas, tryGetProfile } from '@lokascript/semantic';
const names = Object.keys(commandSchemas);
console.log(names.length, names.join(' '));
const p: any = tryGetProfile('es');
console.log(names.filter(n => !p.keywords[n]).join(' '));
console.log(Object.keys(p.keywords).filter(k => !names.includes(k)).join(' '));
console.log(JSON.stringify(p.roleMarkers));
