// Tokenize each proposed B-row word in its language: a keyword with another meaning collides.
const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const W: Record<string, [string, string, string, string]> = {
  ar: ['للخلف', 'خارجا', 'فهرس', 'ابدأ'], bn: ['পিছনে', 'বাইরে', 'সূচক', 'শুরু'],
  de: ['zurück', 'außerhalb', 'index', 'starte'], es: ['atrás', 'fuera', 'índice', 'iniciar'],
  fr: ['arrière', 'ailleurs', 'indice', 'démarrer'], he: ['אחורה', 'בחוץ', 'אינדקס', 'התחל'],
  hi: ['पीछे', 'बाहर', 'सूचकांक', 'शुरू'], id: ['kembali', 'di luar', 'indeks', 'mulai'],
  it: ['indietro', 'altrove', 'indice', 'avvia'], ja: ['戻る', '外側', 'インデックス', '開始'],
  ko: ['뒤로', '바깥', '인덱스', '시작'], ms: ['kembali', 'di luar', 'indeks', 'mulakan'],
  pl: ['wstecz', 'gdzie indziej', 'indeks', 'rozpocznij'], pt: ['atrás', 'fora', 'índice', 'iniciar'],
  qu: ['kutiy', 'hawapi', 'yupay', 'qallariy'], ru: ['назад', 'снаружи', 'индекс', 'начать'],
  sw: ['nyuma', 'nje', 'faharasa', 'anza'], th: ['กลับ', 'ภายนอก', 'ดัชนี', 'เริ่ม'],
  tl: ['pabalik', 'labas', 'indeks', 'simulan'], tr: ['geri', 'dışarıda', 'indeks', 'başlat'],
  uk: ['назад', 'ззовні', 'індекс', 'почати'], vi: ['lùi', 'bên ngoài', 'chỉ số', 'bắt đầu'],
  zh: ['后退', '外部', '索引', '开始'],
};
const names = ['back', 'outside', 'index', 'start'];
for (const [l, ws] of Object.entries(W)) {
  const row = ws.map((w, i) => {
    const toks = sem.tokenize(w, l).tokens.map((t: any) => `${t.value}<${t.kind}${t.normalized && t.normalized !== t.value ? ':' + t.normalized : ''}>`);
    return `${names[i]}=${toks.join(' ')}`;
  });
  L(`${l}: ${row.join('  ')}`);
}
process.exit(0);
