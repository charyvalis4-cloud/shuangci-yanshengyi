// 總複習遊戲版共用程式：闖關、錯題本（複習／列印／下載 Word）、題庫抽題與下載、上課投影、成績送出。
// 頁面先定義 window.GAME，再引入本檔：
//   GAME = { pfx, home, sub, title, quiz, win, hint, links:[[文字, 網址]], levels:[{k,n,t,e,c}], gen(k, n) }
//   gen 回傳題目陣列：{ s: 題幹 HTML, o: [選項文字×4], a: 正解文字, e: 解析 HTML, h?: 提示文字, fx?: 1 表示選項順序固定（解析用到 (A)(B)…） }
// 需要 JSZip（下載 Word）、/assets/quiz-auth.js 與 /assets/game-score.js（成績送出）。
(function () {
  const G = window.GAME, PFX = G.pfx;
  const $ = s => document.querySelector(s), app = $("#app");
  const esc = s => String(s).replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  const hl = s => esc(s).replace(/「([^」]*)」/g, '<b>「$1」</b>');
  const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => sh(a).slice(0, n);
  const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const LV = Object.fromEntries(G.levels.map(l => [l.k, l]));
  const ORD = G.levels.map(l => l.k);
  const L = "ABCD";
  const ok4 = q => q && q.o && q.o.length === 4 && new Set(q.o).size === 4 && q.o.includes(q.a);
  const gen = (k, n = 10) => G.gen(k, n).filter(ok4).slice(0, n);
  const key = q => q.s + "|" + q.a;
  const stars = k => "★".repeat(k) + "☆".repeat(3 - k);
  const wbAll = () => LS.get(PFX + "_wb", {});
  window.GameUtil = { esc, hl, sh, pick };
  let S;

  function home() {
    document.body.classList.remove("big"); document.onkeydown = null;
    const st = LS.get(PFX + "_st", {}), nw = Object.keys(wbAll()).length;
    app.innerHTML = `<h1>${G.home}</h1><p class="sub">${G.sub}</p>` +
      ORD.map(k => { const v = LV[k]; return `<button class="card lv" style="--c:${v.c}" data-l="${k}"><span class="e">${v.e}</span><span><b>${v.n}：${v.t}</b><small>每關 10 題${v.d ? "・" + v.d : ""}</small></span><span class="st" aria-label="${st[k] || 0} 顆星">${stars(st[k] || 0)}</span></button>`; }).join("") +
      `<div class="card"><b>🧠 錯題本</b>（${nw} 題）<small class="mu">　答錯會自動收進來，連續答對 2 次才畢業</small><br>
       <button class="btn" id="rv" ${nw ? "" : "disabled"}>複習錯題</button><button class="btn g" id="sh" ${nw ? "" : "disabled"}>🖨 列印我的錯題卷</button><button class="btn g" id="wd" ${nw ? "" : "disabled"}>📄 下載錯題本 Word</button><p id="wmsg" class="mu" style="margin:4px 0 0"></p></div>
       <div class="card"><b>📥 題庫抽題與下載區</b><small class="mu">　自選範圍抽題，分「學生版／教師版」下載</small><br><button class="btn" id="bk">進入抽題區</button></div>
       <div class="card"><b>📽 上課投影模式</b><small class="mu">　大字、分組計分、按空白鍵揭曉</small><br>${ORD.map(k => `<button class="btn g" data-p="${k}">${LV[k].e} ${LV[k].n}</button>`).join("")}</div>`;
    app.querySelectorAll("[data-l]").forEach(b => b.onclick = () => start(gen(+b.dataset.l), +b.dataset.l));
    app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => proj(+b.dataset.p));
    $("#sh").onclick = sheet; $("#bk").onclick = bank;
    $("#wd").onclick = () => saveDocx(Object.values(wbAll()).map(x => x.q), "wb", "我的錯題本", $("#wmsg"));
    $("#rv").onclick = () => { const q = Object.values(wbAll()).map(x => ({ ...x.q, o: x.q.fx ? x.q.o : sh(x.q.o) })); start(pick(q, 10), 0); };
    window.scrollTo(0, 0);
  }

  // ---------- 闖關 ----------
  function start(qs, l) { S = { qs, l, i: 0, ok: 0, combo: 0, ans: "" }; ask(); }
  function ask() {
    const q = S.qs[S.i]; if (!q) return end();
    app.innerHTML = `<div class="top"><span>${S.i + 1}/${S.qs.length}</span><div class="bar"><i style="width:${S.i / S.qs.length * 100}%"></i></div><span>🔥${S.combo}　✅${S.ok}</span></div>
      <div class="card"><div class="stem">${q.s}</div>${q.o.map((t, i) => `<button class="o" data-i="${i}"><span>${L[i]}</span><i style="font-style:normal">${hl(t)}</i></button>`).join("")}
      ${q.h ? `<button class="btn g" id="hn">${G.hint || "💡 看提示"}</button> <span id="hv" class="mu"></span>` : ""}<div class="ex" id="ex" aria-live="polite"></div><button class="btn" id="nx" hidden>下一題 ➜</button></div>
      <button class="btn g" id="lv">離開</button>`;
    $("#lv").onclick = home;
    if ($("#hn")) $("#hn").onclick = () => { $("#hv").textContent = q.h; };
    app.querySelectorAll(".o").forEach(b => b.onclick = () => {
      const t = q.o[+b.dataset.i], good = t === q.a;
      app.querySelectorAll(".o").forEach(x => { x.disabled = true; if (q.o[+x.dataset.i] === q.a) x.classList.add("ok"); });
      const wb = wbAll(), k = key(q);
      if (good) { S.ok++; S.combo++; b.classList.add("pop"); if (wb[k]) { wb[k].n++; if (wb[k].n >= 2) delete wb[k]; } }
      else { b.classList.add("no"); S.combo = 0; wb[k] = { q: { s: q.s, o: q.o, a: q.a, e: q.e, fx: q.fx ? 1 : 0 }, n: 0 }; }
      S.ans += good ? "O" : "X";
      LS.set(PFX + "_wb", wb);
      $("#ex").innerHTML = (good ? "🎉 答對了！" : "💡 再記一次：") + "<br>" + q.e; $("#ex").classList.add("on");
      $("#nx").hidden = false; $("#nx").focus(); $("#nx").onclick = () => { S.i++; ask(); };
    });
  }
  function end() {
    const r = S.ok / Math.max(1, S.qs.length), k = r >= .9 ? 3 : r >= .7 ? 2 : r >= .5 ? 1 : 0;
    if (S.l) { const st = LS.get(PFX + "_st", {}); st[S.l] = Math.max(st[S.l] || 0, k); LS.set(PFX + "_st", st); }
    app.innerHTML = `<div class="card" style="text-align:center"><h1>${stars(k)}</h1><div class="stem">答對 ${S.ok} / ${S.qs.length}</div>
      <p>${k == 3 ? G.win : k ? "不錯喔，再玩一次衝三星！" : "沒關係，答錯的已收進錯題本，複習後再挑戰！"}</p>
      <p id="gs-msg" class="mu" style="font-size:14px"></p><button class="btn" id="hm">回首頁</button> <button class="btn g" id="ag">再玩一次</button></div>`;
    $("#hm").onclick = home;
    $("#ag").onclick = () => S.l ? start(gen(S.l), S.l) : home();
    if (S.l && window.GameScore) {
      const v = LV[S.l];
      GameScore.send({ quiz: G.quiz, mode: v.n.replace(/\s/g, ""), ok: S.ok, n: S.qs.length, answers: S.ans,
        detail: { 關卡: v.n + "：" + v.t, 答對: S.ok, 題數: S.qs.length } });
    } else if (!S.l) $("#gs-msg").textContent = "（錯題複習不計成績）";
  }

  // ---------- Word / 列印 ----------
  const tx = s => String(s).replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const XE = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // kind: "s" 學生版、"t" 教師版、"wb" 錯題本（題目＋解答）
  function docxXml(items, kind, title) {
    const F = '<w:rFonts w:ascii="Microsoft JhengHei" w:eastAsia="Microsoft JhengHei" w:hAnsi="Microsoft JhengHei"/>';
    const P = (t, o = {}) => `<w:p><w:pPr>${o.c ? '<w:jc w:val="center"/>' : ""}${o.ind ? '<w:ind w:left="400"/>' : ""}<w:spacing w:after="${o.ind ? 140 : 40}"/></w:pPr><w:r><w:rPr>${F}${o.b ? "<w:b/>" : ""}${o.col ? `<w:color w:val="${o.col}"/>` : ""}<w:sz w:val="${o.sz || 22}"/></w:rPr><w:t xml:space="preserve">${XE(t)}</w:t></w:r></w:p>`;
    const ans = kind !== "s";
    let b = P(title, { b: 1, sz: 36, col: "B3261E", c: 1 });
    b += P(kind === "t" ? `共 ${items.length} 題・含解答與解析` : `班級：＿＿＿＿　座號：＿＿＿＿　姓名：＿＿＿＿＿＿${kind === "s" ? "　得分：＿＿＿＿" : `　共 ${items.length} 題`}`, { col: "666666" });
    items.forEach((q, i) => { b += P(`（　）${i + 1}. ${tx(q.s)}`, { b: 1 }); q.o.forEach((t, j) => { b += P(`(${L[j]}) ${tx(t)}`, { ind: 1 }); }); });
    if (ans) {
      b += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' + P("解答與解析", { b: 1, sz: 32, col: "1E8A4C" });
      items.forEach((q, i) => { b += P(`${i + 1}. ${L[q.o.indexOf(q.a)]}　${tx(q.a)}　${tx(q.e)}`, { ind: 1 }); });
    }
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${b}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  }
  async function mkDocx(items, kind, title) {
    const z = new JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/document.xml", docxXml(items, kind, title));
    return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  async function saveDocx(items, kind, label, msg) {
    const title = G.title + "　" + label, fn = G.title + "_" + label + ".docx";
    if (!items.length) { if (msg) msg.textContent = "目前沒有題目可以下載。"; return; }
    try {
      if (!window.JSZip) throw 0;
      const bl = await mkDocx(items, kind, title), a = document.createElement("a");
      a.href = URL.createObjectURL(bl); a.download = fn; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      if (msg) msg.textContent = "✅ 已下載 " + fn;
    } catch (e) { if (msg) msg.textContent = "下載失敗，請改用「列印／存成 PDF」。"; }
  }
  const qCard = (q, i, mark) => `<div class="card"><div class="stem">${mark ? "（　）" : ""}${i + 1}. ${q.s}</div>${q.o.map((t, j) => `<div>（${L[j]}）${hl(t)}</div>`).join("")}</div>`;
  const ansList = it => `<h2 style="break-before:page">解答與解析</h2>` + it.map((q, i) => `<p>${i + 1}. ${L[q.o.indexOf(q.a)]}　${hl(q.a)}　${q.e}</p>`).join("");
  function sheet() {
    const w = Object.values(wbAll()).map(x => x.q);
    app.innerHTML = `<div class="noprint"><button class="btn" id="pp">🖨 列印／存成 PDF</button><button class="btn g" id="bb">返回</button></div><h1>${G.title}・我的錯題卷</h1><p>班級＿＿　座號＿＿　姓名＿＿</p>` + w.map((q, i) => qCard(q, i, 1)).join("") + ansList(w);
    $("#pp").onclick = () => print(); $("#bb").onclick = home; window.scrollTo(0, 0);
  }

  // ---------- 題庫抽題 ----------
  const BK = { sel: new Set(ORD), n: 20, items: null };
  function bank() {
    document.body.classList.remove("big");
    app.innerHTML = `<h1>📥 題庫抽題與下載區</h1><p class="sub">自選範圍與題數抽出一份題組，再分別下載「學生版」與「教師版」（兩份來自同一次抽題）</p>
      <div class="card"><b>① 選範圍</b>${ORD.map(k => `<label style="display:block;margin:4px 0"><input type="checkbox" data-k="${k}" ${BK.sel.has(k) ? "checked" : ""}> ${LV[k].e} ${LV[k].n}：${LV[k].t}</label>`).join("")}
      <b>② 題數</b> <input id="nn" type="number" min="5" max="60" value="${BK.n}" style="width:72px;font:inherit"> 題<br><button class="btn" id="dr">🎲 抽題</button><button class="btn g" id="bb">返回首頁</button></div><div id="out"></div>`;
    app.querySelectorAll("[data-k]").forEach(c => c.onchange = () => { c.checked ? BK.sel.add(+c.dataset.k) : BK.sel.delete(+c.dataset.k); });
    $("#dr").onclick = draw; $("#bb").onclick = home; if (BK.items) show(); window.scrollTo(0, 0);
  }
  function draw() {
    BK.n = Math.max(5, Math.min(60, +$("#nn").value || 20));
    const ks = ORD.filter(k => BK.sel.has(k));
    if (!ks.length) { $("#out").innerHTML = '<p class="card">請至少選一個範圍。</p>'; return; }
    const per = Math.ceil(BK.n / ks.length) + 3, seen = new Set; let all = [];
    ks.forEach(k => gen(k, per).forEach(q => { q.l = k; const id = key(q); if (!seen.has(id)) { seen.add(id); all.push(q); } }));
    BK.items = pick(all, BK.n).sort((a, b) => ks.indexOf(a.l) - ks.indexOf(b.l)); show();
  }
  function show() {
    const it = BK.items;
    $("#out").innerHTML = `<div class="card"><b>已抽出 ${it.length} 題</b>${it.length < BK.n ? `<small class="mu">（所選範圍題庫不足 ${BK.n} 題，已全部抽出）</small>` : ""}
      <div style="max-height:260px;overflow:auto;margin-top:8px;font-size:15px">${it.map((q, i) => `<p>${i + 1}. ${q.s}</p>`).join("")}</div></div>
      <div class="card" style="border-color:#1c7ed6"><b>🧒 學生版</b><small class="mu">　題目卷，答案欄空白，有姓名座號欄</small><br><button class="btn" data-d="s">下載 Word</button><button class="btn g" data-p="0">列印／存成 PDF</button></div>
      <div class="card" style="border-color:#c2255c"><b>👩‍🏫 教師版</b><small class="mu">　題目＋最後一頁解答與解析</small><br><button class="btn" data-d="t">下載 Word</button><button class="btn g" data-p="1">列印／存成 PDF</button></div><p id="msg" class="sub"></p>`;
    $("#out").querySelectorAll("[data-d]").forEach(b => b.onclick = () => saveDocx(BK.items, b.dataset.d, (b.dataset.d === "t" ? "抽題卷（教師版）" : "抽題卷（學生版）"), $("#msg")));
    $("#out").querySelectorAll("[data-p]").forEach(b => b.onclick = () => psheet(+b.dataset.p));
  }
  function psheet(tc) {
    const it = BK.items;
    app.innerHTML = `<div class="noprint"><button class="btn" id="pp">🖨 列印／存成 PDF</button><button class="btn g" id="bb">返回抽題區</button></div><h1>${G.title}　抽題卷（${tc ? "教師版" : "學生版"}）</h1><p>${tc ? "含解答與解析" : "班級＿＿　座號＿＿　姓名＿＿　得分＿＿"}</p>` + it.map((q, i) => qCard(q, i, 1)).join("") + (tc ? ansList(it) : "");
    $("#pp").onclick = () => print(); $("#bb").onclick = bank; window.scrollTo(0, 0);
  }

  // ---------- 上課投影 ----------
  function proj(l) {
    document.body.classList.add("big"); let qs = gen(l), i = 0, rev = 0; const tm = [0, 0, 0, 0, 0];
    const draw = () => {
      const q = qs[i];
      app.innerHTML = `<div class="top"><b>${LV[l].e} ${LV[l].n}：${LV[l].t}</b><span>第 ${i + 1} / ${qs.length} 題　［空白鍵／點下方按鈕］</span><button class="btn g" id="x">離開</button></div>
        <div class="card"><div class="stem">${q.s}</div>${q.o.map((t, j) => `<div class="o ${rev && t === q.a ? "ok" : ""}"><span>${L[j]}</span><i style="font-style:normal">${hl(t)}</i></div>`).join("")}<div class="ex ${rev ? "on" : ""}">${q.e}</div></div>
        <button class="btn" id="go">${rev ? "下一題 ➜" : "揭曉答案"}</button><div class="tm">${tm.map((v, j) => `<div>第${j + 1}組<b>${v}</b><button class="btn g" data-t="${j}">＋1</button><button class="btn g" data-m="${j}">－1</button></div>`).join("")}</div>`;
      $("#x").onclick = home; $("#go").onclick = nx;
      app.querySelectorAll("[data-t]").forEach(b => b.onclick = e => { e.stopPropagation(); tm[+b.dataset.t]++; draw(); });
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = e => { e.stopPropagation(); tm[+b.dataset.m]--; draw(); });
    };
    const nx = () => { if (!rev) rev = 1; else { rev = 0; i++; if (i >= qs.length) { qs = gen(l); i = 0; } } draw(); };
    document.onkeydown = e => { if (e.target.tagName === "INPUT") return; if (e.code === "Space" || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); nx(); } };
    draw(); window.scrollTo(0, 0);
  }

  home();
})();
