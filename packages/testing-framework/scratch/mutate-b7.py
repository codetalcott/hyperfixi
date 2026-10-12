import subprocess, re, os
os.chdir(os.path.expanduser('~/projects/hf-m2/packages/semantic'))
F='src/tokenizers/if-not-split.ts'
orig=open(F).read()
M=[
 ('no document operand', lambda s: s.replace("  'body',\n  'document',\n","  'body',\n",1)),
 ('no window operand', lambda s: s.replace("  'document',\n  'window',\n]);","  'document',\n]);",1)),
 ('normalized only', lambda s: s.replace("(token.normalized ?? token.value).toLowerCase()","(token.normalized ?? '').toLowerCase()",1)),
]
env=dict(os.environ, PATH=os.getcwd()+'/node_modules/.bin:'+os.environ['PATH'], VITEST_TIMEOUT='900', VITEST_QUIET='1')
try:
  for name,mut in M:
    new=mut(orig)
    if new==orig: print('NOT APPLIED', name, flush=True); continue
    open(F,'w').write(new)
    r=subprocess.run('bash ../../scripts/vitest-run.sh --reporter=dot', shell=True, capture_output=True, text=True, env=env)
    out=r.stdout+r.stderr
    tests=[l.strip() for l in out.splitlines() if re.search(r'Tests\s', l)]
    failed=[l.strip() for l in out.splitlines() if 'FAIL' in l][:8]
    print(name, '| exit', r.returncode, '|', tests, flush=True)
    for l in failed: print('   ', re.sub(r'\x1b\[[0-9;]*m','',l), flush=True)
    open(F,'w').write(orig)
finally:
  open(F,'w').write(orig)
