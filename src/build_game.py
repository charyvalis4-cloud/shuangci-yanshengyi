# -*- coding: utf-8 -*-
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content as C
import build as B

WORDS = [dict(w=x['w'], p=[[c, t] for c, t in x['parts']], k=x['kind'], d=x['d'], s=x['s'], x=x['ex'],
              g=sorted(B.group_of(x['w']) - {x['w']})) for x in C.W]
CLUE = {w: c for c, w in C.CLUE}
for x in C.W:
    if x['w'] not in CLUE:
        (c1, t1), (c2, t2) = x['parts']
        CLUE[x['w']] = "一字%s，另一字%s。" % (t1.rstrip('，'), t2.rstrip('，'))
CLUE = {w: (c if c.endswith("。") else c + "。") + "這個詞語是：" if not c.endswith("這個詞語是：") else c for w, c in CLUE.items()}
CLUE = {w: c.replace("。。", "。") for w, c in CLUE.items()}
# 手寫題的 clue 已含「。」，統一補上句尾
GL = [dict(w=w, q=q, a=a, o=o) for w, q, a, o in C.GLYPH_GAME]
MCQ = [dict(s=s, c=c, w=w, x=x) for s, c, w, x in C.MC]

DATA = json.dumps(dict(W=WORDS, CLUE=CLUE, GL=GL, MCQ=MCQ), ensure_ascii=False)

GAME_JS = r"""
const {esc,sh,pick}=GameUtil;
const WM=Object.fromEntries(D.W.map(x=>[x.w,x]));
const ex=w=>{const x=WM[w];return '<b>'+esc(w)+'</b>：'+x.p.map(p=>esc(p[0])+'，'+esc(p[1])).join('；')+'。'+esc(x.k)+'「'+esc(x.d.split('。')[0])+'」。'};
const others=w=>D.W.filter(x=>x.w!==w&&!WM[w].g.includes(x.w));
const mk=(s,a,wr,e,fx)=>{const o=sh([a,...wr]);return {s,o,a,e}};
const qGlyph=g=>mk('請選出符合注音的正確字形：<b>'+esc(g.q)+'</b>',g.a,g.o,ex(g.w));
const qClue=w=>mk(esc(D.CLUE[w]),w,pick(others(w),3).map(x=>x.w),ex(w));
const qMean=w=>{const x=WM[w],seen=new Set([x.s]),wr=[];sh(others(w)).forEach(y=>{if(wr.length<3&&!seen.has(y.s)){seen.add(y.s);wr.push(y.s)}});return mk('「<b>'+esc(w)+'</b>」的衍生義（引申義）是：',x.s,wr,ex(w))};
const qCloze=w=>mk(esc(WM[w].x.replace(w,'＿＿'))+'<br><small>選出最適合填入的詞語：</small>',w,pick(others(w),3).map(x=>x.w),ex(w));
const qRev=w=>{const x=WM[w];return mk('下列哪一個詞語，引申為「<b>'+esc(x.s)+'</b>」？',w,pick(others(w).filter(y=>y.s!==x.s),3).map(y=>y.w),ex(w))};
const qMc=m=>mk(esc(m.s),m.c,m.w,esc(m.x));
const ws=D.W.map(x=>x.w);
const P={1:()=>D.GL.map(qGlyph),2:()=>ws.map(qClue),3:()=>ws.map(qMean),4:()=>ws.map(qCloze),5:()=>[...ws.map(qRev),...D.MCQ.map(qMc)]};
window.GAME={pfx:"shuangci_game",home:"📚 雙詞衍生義闖關站",sub:"雙詞・本義與衍生義（題庫取自〈雙詞衍生義〉講義，每次出題都不同）",title:"雙詞衍生義",quiz:"雙詞衍生義・闖關",win:"太強了！雙詞衍生義難不倒你 🎉",hint:"💡 看提示",
 levels:[{k:1,n:"關卡一",t:"字形大對決",e:"🔍",c:"#e8590c"},{k:2,n:"關卡二",t:"本義線索・猜猜我是誰",e:"🧩",c:"#1c7ed6"},{k:3,n:"關卡三",t:"衍生義大挑戰",e:"🎯",c:"#2f9e44"},{k:4,n:"偵探關",t:"例句填空",e:"🕵️",c:"#2b6f87"},{k:5,n:"挑戰關",t:"反向思考・綜合題",e:"🎲",c:"#c8512b"},{k:6,n:"Boss 關",t:"雙詞總決戰",e:"👑",c:"#9c36b5"}],
 gen(k,n){let pool;if(k==6){pool=[];[1,2,3,4,5].forEach(j=>pool.push(...P[j]()))}else pool=P[k]();return pick(pool,n)}};
"""

HEAD = {
 "review": ('<link rel="stylesheet" href="/assets/review-game.css">\n<script src="/assets/quiz-auth.js" defer></script>\n<script src="/assets/game-score.js" defer></script>\n<script src="/assets/page-qr.js" defer></script>',
            '<nav class="topnav noprint"><a href="../">← 總複習</a>　<a href="../shuangci-1/">互動版（雙詞衍生義）</a>　<a href="../shuangci-1/shuangci-handout.docx">📄 Word 講義</a>　<a href="../shuangci-1/shuangci-handout-color.docx">🎨 Word 講義（彩色版）</a></nav>', True, "/assets/review-game.js"),
 "book1": ('<link rel="stylesheet" href="/assets/review-game.css">\n<script src="/assets/quiz-auth.js" defer></script>\n<script src="/assets/game-score.js" defer></script>\n<script src="/assets/page-qr.js" defer></script>',
           '<nav class="topnav noprint"><a href="../">← 雙詞衍生義（互動版）</a>　<a href="../../">心囚　課文與字音字形</a>　<a href="../shuangci-handout.docx">📄 Word 講義</a>　<a href="../shuangci-handout-color.docx">🎨 Word 講義（彩色版）</a></nav>', True, "/assets/review-game.js"),
 "standalone": ('<link rel="stylesheet" href="review-game.css">',
                '<nav class="topnav noprint"><a href="../">← 雙詞衍生義（互動版）</a>　<a href="../shuangci-handout.docx">📄 Word 講義</a>　<a href="../shuangci-handout-color.docx">🎨 Word 講義（彩色版）</a></nav>', False, "review-game.js"),
}
WHO = ('<div id="who" class="noprint" role="group" aria-label="學生資料（登入後闖關成績會送給老師）">\n  <label>班級 <input id="f-cls" maxlength="8" placeholder="例：711" autocomplete="off"></label>\n'
       '  <label>座號 <input id="f-seat" maxlength="2" inputmode="numeric" placeholder="例：5" autocomplete="off"></label>\n  <label>姓名 <input id="f-name" maxlength="10" autocomplete="off"></label>\n</div>\n')


def build(variant):
    head, nav, who, js = HEAD[variant]
    h = ('<!DOCTYPE html>\n<html lang="zh-Hant"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
         '<title>雙詞衍生義闖關站（遊戲版）</title>\n' + head + '</head><body>\n' + nav + '\n' + (WHO if who else '') +
         '<main id="app"></main>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>\n<script>\nconst D=' + DATA + ';\n'
         + GAME_JS + '\n</script>\n<script src="' + js + '"></script>\n</body></html>\n')
    return h


if __name__ == "__main__":
    out = sys.argv[1]
    for v in HEAD:
        os.makedirs(os.path.join(out, v), exist_ok=True)
        open(os.path.join(out, v, "quiz.html"), "w", encoding="utf-8").write(build(v))
    print("ok", len(DATA))
