import subprocess, re
S='src/generators/command-schemas.ts'; P='src/parser/pattern-matcher.ts'; W='src/patterns/when-condition.ts'
orig={f:open(f).read() for f in (S,P,W)}
guard_start=orig[P].index("        // Nor is a condition operator")
guard_end=orig[P].index("        )) ||", guard_start)
M=[
 ('no operator guard', P, lambda s: s[:guard_start].rstrip(' &\n')+'\n' + s[guard_end:] if False else s.replace(""" &&
        // Nor is a condition operator: where the pronoun `it` also heads a
        // possessive (qu `chay`, ms `ia`), `chay tupan .doh` (it matches .doh)
        // read as `it`'s property `tupan`, in a command's `when` condition.
        !(
          propertyToken.normalized &&
          PatternMatcher.CONDITION_OPERATOR_WORDS.has(propertyToken.normalized.toLowerCase())
        )) ||""", ")) ||",1)),
 ('handcrafted unchanged', W, lambda s: s.replace("  if (!spec || !profile || patterns.length === 0) return patterns;","  return patterns;",1)),
 ('always append', W, lambda s: s.replace("const first = profile.wordOrder === 'SOV';","const first = false;",1)),
 ('no variants', S, lambda s: s.replace("""    markerVariants: {
      ja: ['ときに'],
      tr: ['durumunda', 'olduğunda'],
      he: ['כש'],
    },
""","",1)),
 ('condition last in SOV', S, lambda s: s.replace("    svoPosition,\n    sovPosition: 0,\n","    svoPosition,\n",1)),
 ('no condition on hide', S, lambda s: s.replace("""      sovPosition: 2,
    },
    whenConditionRole(3),
  ],
};""","""      sovPosition: 2,
    },
  ],
};""",1)),
]
try:
  for name,f,mut in M:
    new=mut(orig[f])
    if new==orig[f]: print('NOT APPLIED', name); continue
    open(f,'w').write(new)
    r=subprocess.run('timeout 400 npx vitest run test/when-condition.test.ts', shell=True, capture_output=True, text=True, cwd='.')
    fails=[l.strip() for l in r.stdout.splitlines() if 'Tests ' in l]
    print(('KILLED  ' if r.returncode not in (0,124) else 'SURVIVED'), name, fails, flush=True)
    open(f,'w').write(orig[f])
finally:
  for f,t in orig.items(): open(f,'w').write(t)
