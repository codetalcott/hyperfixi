import subprocess, sys
P='src/multilingual/english-leaks.ts'
orig=open(P).read()
M=[
 ('native homograph filter', "if (!/^[A-Za-z]+$/.test(word) || lang.native.has(word)) continue;", "if (!/^[A-Za-z]+$/.test(word)) continue;"),
 ('grammar count cap', "        (grammar ? grammarLeft : propsLeft).set(word, (grammar ? grammarLeft : propsLeft).get(word)! - 1);\n", ""),
 ('name guard', "        if (!grammar && !prop) continue;\n", ""),
 ('js body strip', "    text = text.replace(new RegExp(`${list}${escapeRegExp(body)}`, 'g'), blank);", ""),
 ('js params strip', "const list = params ?", "const list = false ?"),
 ('brace blanking', "  return blankBraces(text)", "  return text"),
 ('possessive quote', "(?<![\\p{L}\\p{N}])'(?:", "'(?:"),
 ("'s strip", ".replace(/'s$/, '')", ""),
 ('event needs lexicon word', "if (lang.events.has(word)) findings.push", "findings.push"),
 ('event denylist', " && !denied?.has(english)", ""),
 ('case languages', "if (CASE_LANGUAGES.has(language) && lang.me) {", "if (lang.me) {"),
 ('case marker before', "(before && lang.markersBefore.has(before)) || ", ""),
 ('case marker after', " || (after && lang.markersAfter.has(after))", ""),
 ('property needs a word', "(propsLeft.get(word) ?? 0) > 0 && lang.translated.has(word);", "(propsLeft.get(word) ?? 0) > 0;"),
 ('clause context', "info.clauseWords.has(word)\n          ? 'clause'", "false\n          ? 'clause'"),
 ('bracket context', "if (kind === '[') spans.push([start, i, 'bracket']);", ""),
 ('references merged', "for (const [word, n] of references) grammar.set(word, Math.max(grammar.get(word) ?? 0, n));", ""),
 ('possessive keywords native-only', "for (const n of Object.keys(profile?.possessive?.keywords ?? {})) for (const w of wordsOf(n)) native.add(w);", "for (const [n, e] of Object.entries(profile?.possessive?.keywords ?? {})) for (const w of [...wordsOf(n), ...wordsOf(e)]) native.add(w);"),
 ('diff: gone side', "      const gone = minus(listed, got);", "      const gone: string[] = [];"),
 ('diff: no render counts as empty', "    if (!findings) continue;\n      doc.renders++;", "    doc.renders++;\n      if (!findings) continue;"),
]
survivors=[]
try:
  for name,a,b in M:
    if orig.count(a)!=1: print('NOT FOUND', name, orig.count(a)); survivors.append(name+' (not applied)'); continue
    open(P,'w').write(orig.replace(a,b))
    r=subprocess.run('timeout 300 npx vitest run src/multilingual/english-leaks.test.ts', shell=True, capture_output=True, text=True)
    killed = r.returncode!=0
    print(('KILLED  ' if killed else 'SURVIVED'), name)
    if not killed: survivors.append(name)
finally:
  open(P,'w').write(orig)
print('survivors:', survivors)
