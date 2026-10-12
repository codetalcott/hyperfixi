import subprocess
S='src/generators/command-schemas.ts'; V='src/parser/utils/value-extent.ts'
orig={S:open(S).read(), V:open(V).read()}
src_role_start=orig[S].index("    {\n      role: 'source',\n      description: 'The value to transition from")
src_role_end=orig[S].index("    {\n      role: 'goal',", src_role_start)
dest_role = """    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 3,
      sovPosition: 1,
    },
"""
dur_idx=orig[S].index("    {\n      role: 'duration',\n      description: 'Transition duration")
M=[
 ('no source role', S, lambda s: s[:src_role_start]+s[src_role_end:]),
 ('patient without property-path', S, lambda s: s.replace("expectedTypes: ['literal', 'expression', 'selector', 'property-path'],","expectedTypes: ['literal', 'expression', 'selector'],",1)),
 ('destination role back', S, lambda s: s[:dur_idx]+dest_role+s[dur_idx:]),
 ('style marker with', S, lambda s: s.replace("      markerOverride: { en: 'using' },\n","",1)),
 ('style refs as product', V, lambda s: s.replace("  body = styleRefsAsNames(body);\n","",1)),
]
try:
  for name,f,mut in M:
    new=mut(orig[f])
    if new==orig[f]: print('NOT APPLIED', name); continue
    open(f,'w').write(new)
    r=subprocess.run('timeout 300 npx vitest run test/transition-from.test.ts', shell=True, capture_output=True, text=True)
    fails=[l.strip() for l in r.stdout.splitlines() if 'Tests ' in l]
    print(('KILLED  ' if r.returncode!=0 else 'SURVIVED'), name, fails)
    open(f,'w').write(orig[f])
finally:
  for f,t in orig.items(): open(f,'w').write(t)
