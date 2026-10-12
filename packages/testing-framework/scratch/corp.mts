const pr: any = await import('@hyperfixi/patterns-reference');
const rows = await pr.getAllPatterns({ limit: 5000 });
const t = rows.filter((r: any) => /\btransition\b/.test(r.rawCode));
console.log('corpus rows with transition:', t.length);
for (const r of t) console.log(' ', r.id, '|', r.rawCode.replace(/\s+/g, ' ').slice(0, 110));
process.exit(0);
