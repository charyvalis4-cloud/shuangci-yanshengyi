# -*- coding: utf-8 -*-
"""雙詞衍生義闖關站：依 idioms/game/index.html 的版型改寫（單一題庫、五組投影計分）"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content as C
import build as B
import build_game as G1

SRC = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/guwen-site/guwen-site/idioms/game/index.html"

IDI = []
for x in C.W:
    IDI.append(dict(w=x['w'], s=x['s'], d=x['d'], k=x['kind'], e=x['ex'], p=[[c, t] for c, t in x['parts']],
                    g=sorted(B.group_of(x['w']) - {x['w']}), clue=G1.CLUE[x['w']]))
DATA = dict(n=1, idioms=IDI, glyph=[dict(w=w, q=q, a=a, o=o) for w, q, a, o in C.GLYPH_GAME],
            mc=[dict(s=s, c=c, w=w, x=x) for s, c, w, x in C.MC])

NEW_GEN = r"""
  function explain(it) { return it.w + '：' + it.p.map(function (p) { return p[0] + '，' + p[1]; }).join('；') + '。' + it.k + '「' + it.d.split('。')[0] + '」。'; }
  function poolOf(B, it) { return B.idioms.filter(function (y) { return y !== it && (it.g || []).indexOf(y.w) < 0; }); }
  function distinct(arr, key, ex, n) {
    var seen = [ex], o = [];
    shuffle(arr).forEach(function (y) { if (o.length < n && seen.indexOf(y[key]) < 0) { seen.push(y[key]); o.push(y); } });
    return o;
  }
  function byW(B, w) { return B.idioms.filter(function (y) { return y.w === w; })[0]; }
  function gen(B, lv) {
    var r = 0, I = B.idioms, out = [];
    if (lv === 'boss') {
      ['def', 'ex', 'clue', 'char', 'hand'].forEach(function (l) { out = out.concat(gen(B, l)); });
      return out;
    }
    if (lv === 'def') {
      I.forEach(function (it) {
        var m1 = distinct(poolOf(B, it), 's', it.s, 3);
        out.push(mk(r, lv, '「' + it.w + '」的衍生義（引申義）是：', [it.s].concat(m1.map(function (y) { return y.s; })), it.s, explain(it)));
        var m2 = distinct(poolOf(B, it), 's', it.s, 3);
        out.push(mk(r, lv, '哪一個詞語的衍生義是：「' + it.s + '」', [it.w].concat(m2.map(function (y) { return y.w; })), it.w, explain(it)));
      });
    } else if (lv === 'ex') {
      I.forEach(function (it) {
        if (it.e.indexOf(it.w) < 0) return;
        out.push(mk(r, lv, it.e.split(it.w).join('□□'), [it.w].concat(sample(poolOf(B, it), 3).map(function (y) { return y.w; })), it.w, explain(it)));
      });
    } else if (lv === 'clue') {
      I.forEach(function (it) {
        out.push(mk(r, lv, it.clue, [it.w].concat(sample(poolOf(B, it), 3).map(function (y) { return y.w; })), it.w, explain(it)));
      });
    } else if (lv === 'char') {
      B.glyph.forEach(function (g) {
        var it = byW(B, g.w), x = it ? explain(it) : '';
        out.push(mk(r, lv, '請選出符合注音的正確字形：' + g.q, [g.a].concat(g.o), g.a, x));
        out.push({ id: r + '|' + lv + '|' + g.q + '|fill', r: r, lv: lv, t: 'fill', s: '請寫出符合注音的正確字形：' + g.q, ans: g.a, alt: [], x: x, tag: '字形' });
      });
    } else {
      B.mc.forEach(function (m) {
        var q = mk(r, lv, m.s, [m.c].concat(m.w), m.c, m.x); q.tag = '綜合測驗'; out.push(q);
      });
      I.forEach(function (it) {
        var q = mk(r, lv, '下列哪一個詞語，引申為「' + it.s + '」？', [it.w].concat(distinct(poolOf(B, it), 's', it.s, 3).map(function (y) { return y.w; })), it.w, explain(it));
        q.tag = '反向思考'; out.push(q);
      });
    }
    return out;
  }
"""

NEW_LEVELS = """var LEVELS = [
    { id: 'def', ic: '🔍', c: '#e0662f', name: '關卡一：衍生義配對', short: '關卡一' },
    { id: 'ex', ic: '✏️', c: '#3d7bd6', name: '關卡二：例句填空', short: '關卡二' },
    { id: 'clue', ic: '🧩', c: '#4a9c4f', name: '關卡三：本義線索', short: '關卡三' },
    { id: 'char', ic: '🕵️', c: '#2f6f80', name: '偵探關：字形偵探', short: '偵探關' },
    { id: 'hand', ic: '🎲', c: '#d0532a', name: '挑戰關：反向思考・綜合題', short: '挑戰關' },
    { id: 'boss', ic: '👑', c: '#8e3fb3', name: 'Boss 關：雙詞總決戰', short: 'Boss 關' }
  ];"""


def rep(s, old, new, count=1):
    assert s.count(old) >= 1, "missing: " + old[:60]
    return s.replace(old, new) if count == 0 else s.replace(old, new, count)


def build(variant):
    s = open(SRC, encoding='utf-8').read()
    site = variant != "standalone"
    # ---- head / header
    s = rep(s, '<title>成語闖關站</title>', '<title>雙詞衍生義闖關站（遊戲版）</title>')
    if not site:
        s = rep(s, '<script src="/assets/guwen-qr.js" defer></script>\n<script src="/assets/quiz-auth.js" defer></script>\n', '')
    nav = {"review": '<a href="../">← 總複習</a>　<a href="../shuangci-1/">互動版（雙詞衍生義）</a>　<a href="../shuangci-1/shuangci-handout.docx">📄 Word 講義</a>　<a href="../shuangci-1/shuangci-handout-color.docx">🎨 Word 講義（彩色版）</a>',
           "book1": '<a href="../">← 雙詞衍生義（互動版）</a>　<a href="../../">心囚　課文與字音字形</a>　<a href="../shuangci-handout.docx">📄 Word 講義</a>　<a href="../shuangci-handout-color.docx">🎨 Word 講義（彩色版）</a>',
           "standalone": '<a href="../">← 雙詞衍生義（互動版）</a>　<a href="../shuangci-handout.docx">📄 Word 講義</a>　<a href="../shuangci-handout-color.docx">🎨 Word 講義（彩色版）</a>'}[variant]
    s = rep(s, '<div class="crumb"><a href="../">← 成語典故</a>　<a id="toWork" href="../xizuo-6/">本回互動練習</a></div>', '<div class="crumb">' + nav + '</div>')
    s = rep(s, '<div id="page-qr" data-title="成語闖關站"></div><h1>📚 成語闖關站</h1>', ('<div id="page-qr" data-title="雙詞衍生義闖關站"></div>' if site else '') + '<h1>📚 雙詞衍生義闖關站</h1>')
    s = rep(s, '題庫取自成語習作講義與東興成語考試，每次出題都不同', '題庫取自〈雙詞衍生義〉講義（本義、衍生義、字形），每次出題都不同')
    s = rep(s, '<div class="toolbar">\n  <label>回次 <select id="round"></select></label>\n  <span id="loadMsg" class="crumb"></span>\n</div>', '<div class="toolbar"><span id="loadMsg" class="crumb"></span></div>')
    s = rep(s, '<p style="margin:.2em 0">回次（可複選）</p>\n      <div class="chips" id="pkRounds"></div>', '<div class="chips" id="pkRounds" style="display:none"></div>')
    s = rep(s, '<h2>📽️ 上課投影模式<small>大字、分組計分、按空白鍵揭曉</small></h2>', '<h2>📽️ 上課投影模式<small>大字、五組計分、按空白鍵揭曉</small></h2>')
    # ---- JS
    s = rep(s, 'var ROUNDS = 18, PER = 10;', 'var ROUNDS = 1, PER = 10;')
    i0 = s.index('var LEVELS = ['); i1 = s.index('];', i0) + 2
    s = s[:i0] + NEW_LEVELS + s[i1:]
    # load
    i0 = s.index('function load(n) {'); i1 = s.index('// 每個題目物件')
    s = s[:i0] + 'function load(n) { return Promise.resolve(DATA); }\n\n  ' + s[i1:]
    # gen
    i0 = s.index('  function others(B, it, n, key) {'); i1 = s.index('  function optText')
    s = s[:i0] + NEW_GEN + '\n' + s[i1:]
    s = s.replace("idiom-", "shuangci-")
    s = rep(s, "var R = +(new URLSearchParams(location.search).get('r') || store.get('shuangci-round', 6)) || 6;\n  var B = null;", "var R = 1;\n  var B = DATA;")
    # setRound + round selector
    i0 = s.index('  function setRound(n) {'); i1 = s.index("  ['f-cls', 'f-seat', 'f-name']")
    s = s[:i0] + "  function setRound() { document.title = '雙詞衍生義闖關站'; $('loadMsg').textContent = B.idioms.length + ' 個雙詞'; renderLevels(); }\n\n" + s[i1:]
    s = rep(s, "setRound(R);\n})();", "setRound();\n})();")
    s = rep(s, "'第' + R + '回　' + meta.name", "meta.name", 0)
    s = rep(s, "(cur.review ? '第' + q.r + '回 ' : '')", "''")
    s = rep(s, "'<li>〔第' + q.r + '回〕' + esc(q.s)", "'<li>' + esc(q.s)")
    s = rep(s, "(q.r ? '〔第' + q.r + '回〕' : '')", "''")
    # pick title
    i0 = s.index('function pkTitle()'); i1 = s.index('\n', i0)
    s = s[:i0] + "function pkTitle() { return '雙詞衍生義 抽題卷'; }" + s[i1:]
    s = rep(s, "[0, 0, 0, 0]", "[0, 0, 0, 0, 0]")
    s = rep(s, "'成語闖關第' + R + '回'", "'雙詞衍生義闖關'")
    s = rep(s, "'成語錯題卷'", "'雙詞錯題卷'"); s = rep(s, "'成語錯題本.doc'", "'雙詞錯題本.doc'"); s = rep(s, "'成語錯題本'", "'雙詞錯題本'")
    if not site:
        s = rep(s, "window._sendMsg = '（用學校帳號登入後，闖關成績會自動送給老師）'; return;", "window._sendMsg = ''; return;")
    # data
    s = rep(s, "<script>\n(function () {", "<script>\nvar DATA = " + json.dumps(DATA, ensure_ascii=False) + ";\n</script>\n<script>\n(function () {")
    return s


if __name__ == "__main__":
    out = sys.argv[1]
    for v in ("review", "book1", "standalone"):
        os.makedirs(os.path.join(out, v), exist_ok=True)
        open(os.path.join(out, v, "quiz2.html"), "w", encoding="utf-8").write(build(v))
    print("ok")
