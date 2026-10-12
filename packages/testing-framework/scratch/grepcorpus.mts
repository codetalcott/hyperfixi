const L = console.log; console.log = () => {};
const pr: any = await import('@hyperfixi/patterns-reference');
const rows = await pr.getAllPatterns({ limit: 5000 });
const re = new RegExp(process.argv[2], 'i');
for (const r of rows) if (re.test(r.rawCode)) L(r.id, '|', r.rawCode.replace(/\s+/g, ' ').slice(0, 120));
process.exit(0);
