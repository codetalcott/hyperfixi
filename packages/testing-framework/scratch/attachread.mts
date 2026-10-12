import { translate } from '../../semantic/src/index';
const rows: [string,string][] = [
  ['ja','クリック で "x"を #outに 置く'],['ja','クリック で .activeを 切り替え'],['ja','クリック で #bに .aを 追加'],['ja','クリック で 自分から .aを 削除'],['ja','クリック で $xを 5に 設定'],['ja','クリック で :nを 2 増加'],['ja','クリック で <p/>の中 自分を 隠す'],['ja','クリックで "x"を#outに置く'],
  ['ko','클릭 할 때 "x"를 #out에 넣다'],['ko','클릭 할 때 .active를 토글'],['ko','클릭 할 때 #b에 .a를 추가'],['ko','클릭 할 때 나에서 .a를 제거'],['ko','클릭 할 때 $x를 5에 설정'],['ko','클릭 할 때 :n을 2 증가'],['ko','클릭 할 때 나를 숨기다'],['ko','클릭 할 때 #m을 숨기다'],
  ['bn','ক্লিক তে "x"কে #outএ রাখুন'],['bn','ক্লিক তে .activeকে টগল করুন'],['bn','ক্লিক তে #bতে .aকে যোগ'],['bn','ক্লিক তে $xকে 5তে সেট'],['bn','ক্লিকে "x"কে #outএ রাখুন'],['bn','ক্লিক তে #m কে লুকান'],
  ['tr',"tıklama i üzerinde \"x\"'i #out'a koy"],['tr',"tıklama i üzerinde .active'i değiştir"],['tr',"tıklama i üzerinde #b'ye .a'yı ekle"],['tr',"tıklama i üzerinde $x'i 5'e ayarla"],
  ['qu','maykama ñitiy "x"ta #outman churay'],['qu','maykama ñitiy .activeta t\'ikray'],['qu','maykama ñitiy .ata #bman yapay'],
];
for (const [l, s] of rows) { let b; try { b = translate(s, l, 'en'); } catch (e: any) { b = 'REFUSED ' + String(e.message).slice(0,100); } console.log(l, s, '=>', b); }
