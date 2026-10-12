const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const reg: any = await import('../../semantic/src/registry.ts');
for (const l of sem.getSupportedLanguages()) {
  const pats = (reg.getPatternsForLanguage?.(l) ?? reg.getPatterns?.(l) ?? []) as any[];
  const fused = pats.filter(p => p.command === 'on' && p.extraction?.action?.value === 'repeat').map(p => `${p.id}(${p.priority})`);
  if (fused.length) L(l, fused.join(' '));
}
L('done'); process.exit(0);
