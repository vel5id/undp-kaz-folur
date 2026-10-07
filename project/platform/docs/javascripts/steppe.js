/* Слой оформления «Степь» (перенос со старой платформы, без манифеста):
 * 1) полоса прогресса чтения;
 * 2) карточка-шапка урока (чип модуля · «Урок N из M» · трудозатраты) —
 *    собирается из первого blockquote лекции и навигации, сам blockquote
 *    скрывается (его текст остаётся в DOM для поиска);
 * 3) Bloom-пилюли: **[Bloom: знать]** → цветной бейдж таксономии.
 */
(function () {
  "use strict";

  var BLOOM = {
    "знать": "know",
    "понимать": "understand",
    "применять": "apply",
    "анализировать": "analyze",
  };

  function readbar() {
    if (document.querySelector(".folur-readbar")) return;
    var bar = document.createElement("div");
    bar.className = "folur-readbar";
    bar.innerHTML = '<div class="folur-readbar__fill"></div>';
    document.body.appendChild(bar);
    var fill = bar.firstChild;
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      fill.style.width = max > 0 ? (100 * h.scrollTop / max) + "%" : "0";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function moduleCode() {
    var m = location.pathname.match(/\/modules\/([ap]\d+)\//);
    if (!m) return null;
    return m[1].replace("a", "А").replace("p", "П");
  }

  function lessonHead() {
    var m = location.pathname.match(/\/(lectures|practicum)\/(\d+)[^/]*\/?$/);
    var article = document.querySelector("article.md-content__inner, article");
    if (!m || !article) return;
    var bq = article.querySelector("blockquote");
    if (!bq || bq.textContent.indexOf("Трудозатраты") === -1) return;

    var text = bq.textContent.replace(/\s+/g, " ");
    // «урок N из M» обычно указан в самой шапке; иначе — номер из имени файла
    var n = parseInt(m[2], 10), total = 0;
    var nm = text.match(/урок\s+(\d+)\s+из\s+(\d+)/i);
    if (nm) { n = parseInt(nm[1], 10); total = parseInt(nm[2], 10); }

    // трудозатраты: до начала следующего смыслового блока («Модуль …» / точка)
    var time = "";
    // NB: JS \b не работает с кириллицей — границу задаём явным пробелом
    var tm = text.match(/Трудозатраты:\s*(.*?)(?=\s+Модуль\s|\.\s|$)/);
    if (tm) time = tm[1].trim().replace(/[.,;]$/, "");

    var head = document.createElement("div");
    head.className = "folur-lesson-head";
    var kind = m[1] === "practicum" ? "Практикум" : "Урок";
    head.innerHTML =
      '<span class="folur-badge">' + (moduleCode() || "") + "</span>" +
      "<span>" + kind + " " + n + (total ? " из " + total : "") + "</span>" +
      '<span class="folur-meta">⏱ ' + time.replace(/</g, "&lt;") + "</span>";
    bq.parentNode.insertBefore(head, bq);
    bq.style.display = "none";
  }

  function bloomPills() {
    document.querySelectorAll("article strong, article b").forEach(function (el) {
      var m = el.textContent.match(/^\[Bloom:\s*(знать|понимать|применять|анализировать)\]$/);
      if (!m) return;
      var span = document.createElement("span");
      span.className = "bloom bloom--" + BLOOM[m[1]];
      span.textContent = m[1];
      el.replaceWith(span);
    });
  }

  /* ── Внешние ссылки и редактор Python открываются в новой вкладке:
   * слушатель не теряет место в уроке. ───────────────────────────────────── */
  function externalLinks() {
    document.querySelectorAll("article a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var ext = /^https?:\/\//i.test(href) && a.host !== location.host;
      if (!ext && !/\/python-lab\/editor\.html/.test(href)) return;
      a.target = "_blank";
      a.rel = "noopener";
      if (ext && !a.querySelector("img, svg") && !a.classList.contains("md-button")) a.classList.add("folur-ext");
    });
  }

  /* ── Визуальный ритм текста урока ────────────────────────────────────────
   * Уроки пришли из Word сплошными абзацами. Здесь по устойчивым признакам
   * текста собираются списки, выноски, определения и инлайн-код. Текст не
   * переписывается: меняется только разметка. Должно выполняться ДО stepsBar,
   * потому что тот запоминает ссылки на блоки статьи. ────────────────────── */
  var CALLOUTS = [
    [/^границы/i, "limits"],
    [/^разбор/i, "solution"],
    [/^(региональный кейс|кейс|ситуация)/i, "case"],
    [/^(что дальше|подробнее)/i, "next"],
    [/^(закрепление|самостоятельно|задани|задач|самопроверка|работа)/i, "task"],
    [/^(ожидаемый результат|получить|собрать)/i, "result"],
    [/^что это да[её]т/i, "benefit"],
  ];
  var KEY_LEAD = /^(Практический вывод|Практическое правило|Важная деталь|Обратите внимание|Важно|Вывод|Правило|Главное|Итог|Запомните)\s*(?:[:.]|—|–)\s*/;
  var POINT_LEAD = /^([A-ZА-ЯЁ][^.!?:;,()«»—–]{2,44})\.\s+(?=[A-ZА-ЯЁ«0-9])/;
  var DEF_LEAD = /^([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9\-./ ]{0,48}?(?:\s\([^)]{2,60}\))?)\s[—–]\s(?=[а-яё])/;
  var NOT_TERM = /^(В|Во|На|Для|При|По|С|Со|К|Из|От|У|О|Об|Если|Когда|Но|И|А|Это|Этот|Эта|Эти|Так|Как|Что|Чем|Без|Про|За|Над|Под|После|До|Через|Здесь|Там|Тогда|Затем|Наш|Ваш|Их|Его|Её)\s/;
  var FILE_EXT ="csv|json|geojson|tif|tiff|gpkg|shp|py|ipynb|xlsx|xls|qgz|qgs|kml|kmz|las|laz|txt|zip|png|jpg|jpeg|pdf|md|yml|yaml|tfw|nc|parquet|docx|gpx|dbf|prj|html";
  // 1 — граница слева; 2 — то, что оборачивается в <code>
  var CODE_RE = new RegExp("(^|[^A-Za-z0-9_./@\\-])(" +
    "\\*?[A-Za-z0-9_][A-Za-z0-9_\\-]*(?:\\.[A-Za-z0-9_\\-]+)*\\.(?:" + FILE_EXT + ")(?![A-Za-z0-9_\\-])" +      // имя файла
    "|[A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)*\\([^()А-Яа-яЁё]{0,40}\\)" +                         // вызов()
    "|(?:[A-Za-z0-9]+\\/)*[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+" +                                          // snake_case, ID коллекций
    "|EPSG:\\d{4,5}" +
    ")", "g");
  var NO_CODE = "a, code, pre, kbd, h1, h2, h3, h4, button, label, figure, svg, .mermaid, .folur-formula, .folur-quiz, .folur-steps, .folur-pager, .folur-gate, .md-button";

  function firstText(p) {
    var n = p.firstChild;
    return n && n.nodeType === 3 ? n : null;
  }
  function plainP(el) {
    return el && el.tagName === "P" && !el.className;
  }
  // обернуть первые len символов абзаца в элемент tag.cls (остальное не трогаем)
  function wrapLead(p, len, tag, cls, strip) {
    var t = firstText(p);
    var lead = document.createElement(tag);
    lead.className = cls;
    lead.textContent = t.data.slice(0, len).replace(/\s+$/, "");
    t.data = t.data.slice(len + (strip || 0));
    p.insertBefore(lead, t);
    if (t.data.charAt(0) !== " ") p.insertBefore(document.createTextNode(" "), t);
    return lead;
  }
  function toList(run, tag, cls) {
    var list = document.createElement(tag);
    list.className = cls;
    run[0].parentNode.insertBefore(list, run[0]);
    run.forEach(function (p) {
      var li = document.createElement("li");
      while (p.firstChild) li.appendChild(p.firstChild);
      list.appendChild(li);
      p.remove();
    });
    return list;
  }

  function enrichProse() {
    var article = pathCode() && document.querySelector("article.md-content__inner, article");
    if (!article || article.hasAttribute("data-folur-prose")) return;
    article.setAttribute("data-folur-prose", "");
    var lesson = /\/(lectures|practicum)\//.test(location.pathname);
    var kids = Array.prototype.slice.call(article.children);

    // 0) номер раздела («2.», «2.3») — отдельный шильдик; точка остаётся в тексте
    //    (невидимой), чтобы заголовок читался и искался как прежде
    kids.forEach(function (h) {
      if (!/^H[23]$/.test(h.tagName)) return;
      var t = firstText(h), m = t && t.data.match(/^(\d+(?:\.\d+)*)(\.?)(\s+)/);
      if (!m) return;
      var num = document.createElement("span");
      num.className = "folur-hnum";
      num.textContent = m[1];
      var dot = document.createElement("span");
      dot.className = "folur-hnum-dot";
      dot.textContent = m[2] + m[3];
      t.data = t.data.slice(m[0].length);
      h.insertBefore(dot, t);
      h.insertBefore(num, dot);
      h.classList.add("folur-numbered");
    });

    // 1) выноски: абзац начинается с метки курсивом/полужирным («Разбор:», «Границы лекции.»)
    kids.forEach(function (p) {
      if (!plainP(p)) return;
      var first = p.firstChild;
      while (first && first.nodeType === 3 && !first.data.trim()) first = first.nextSibling;
      if (!first || first.nodeType !== 1 || !/^(EM|STRONG)$/.test(first.tagName)) return;
      var tag = first.tagName, nodes = [], n = first;
      while (n && ((n.nodeType === 1 && n.tagName === tag) || (n.nodeType === 3 && !n.data.trim()))) { nodes.push(n); n = n.nextSibling; }
      var label = nodes.map(function (x) { return x.textContent; }).join("").replace(/\s+/g, " ").replace(/[\s.:]+$/, "").trim();
      if (!n && nodes.length === 1 && label.length > 45 && tag === "EM" &&
          p.previousElementSibling && p.previousElementSibling.classList.contains("upgraded-caption")) {
        p.className = "upgraded-caption upgraded-caption--desc"; // словесное описание рисунка
        return;
      }
      if (label.length < 3 || label.length > 45 || /^\[/.test(label)) return;
      if (!n) { p.className = "folur-subhead"; return; } // абзац целиком из метки — подзаголовок
      var bloom = BLOOM[label.toLowerCase()] || (/^[А-ЯЁ][а-яё]+ть$/.test(label) ? "apply" : null);
      if (bloom || /^[а-яё]/.test(label)) {
        // цель обучения: «Знать: …» → пилюля; «перечислять …» → глагол-акцент
        p.className = "folur-objective";
        if (bloom) {
          var pill = document.createElement("span");
          pill.className = "bloom bloom--" + bloom;
          pill.textContent = label.toLowerCase();
          p.insertBefore(pill, nodes[0]);
          nodes.forEach(function (x) { x.remove(); });
        }
        return;
      }
      var type = "note";
      CALLOUTS.some(function (c) { if (c[0].test(label)) { type = c[1]; return true; } return false; });
      var cap = document.createElement("span");
      cap.className = "folur-callout__label";
      cap.textContent = label;
      p.insertBefore(cap, nodes[0]);
      nodes.forEach(function (x) { x.remove(); });
      p.className = "folur-callout folur-callout--" + type;
    });

    // 2) цель урока — крупнее основного текста
    kids.forEach(function (h) {
      if (h.tagName === "H2" && /^Цел[ьи]\s/.test(h.textContent) && plainP(h.nextElementSibling)) {
        h.nextElementSibling.className = "folur-goal";
      }
    });

    // 3) ключевые выводы и определения в рамке
    kids.forEach(function (p) {
      var t = plainP(p) && firstText(p);
      if (!t) return;
      var m = t.data.match(KEY_LEAD);
      if (m) {
        wrapLead(p, m[1].length, "span", "folur-callout__label", m[0].length - m[1].length);
        p.className = "folur-callout folur-callout--key";
        return;
      }
      m = lesson && t.data.match(DEF_LEAD);
      if (m && m[1].replace(/\s\(.*$/, "").split(/\s+/).length <= 4 && !NOT_TERM.test(m[1]) &&
          (/[A-Za-z]/.test(m[1]) || /^это\s/.test(t.data.slice(m[0].length)))) {
        wrapLead(p, m[1].length, "dfn", "folur-def__term");
        p.className = "folur-def";
      }
    });

    // 4) серии абзацев → списки: цели, «Заголовок. Пояснение», «1) вопрос»
    var run = [], mode = null;
    function flush() {
      if (mode === "objective" && run.length > 1) toList(run, "ul", "folur-objectives");
      else if (mode === "num" && run.length > 1) {
        run.forEach(function (p) { var t = firstText(p); t.data = t.data.replace(/^\s*\d{1,2}\)\s*/, ""); });
        toList(run, "ol", "folur-questions");
      } else if (mode === "point") {
        var prev = run[0].previousElementSibling;
        var asked = prev && prev.tagName === "P" && /:\s*$/.test(prev.textContent);
        if (run.length >= 3 || (run.length === 2 && asked)) {
          run.forEach(function (p) {
            var m = firstText(p).data.match(POINT_LEAD);
            wrapLead(p, m[1].length + 1, "strong", "folur-points__lead");
          });
          toList(run, "ul", "folur-points");
        }
      }
      run = []; mode = null;
    }
    kids.forEach(function (el) {
      var k = null, t;
      if (el.tagName === "P" && el.className === "folur-objective") k = "objective";
      else if (plainP(el) && (t = firstText(el))) {
        var m = t.data.match(POINT_LEAD);
        if (/^\s*\d{1,2}\)\s+\S/.test(t.data)) k = "num";
        else if (m && m[1].split(/\s+/).length <= 5) k = "point";
      }
      if (k !== mode) flush();
      if (k) { mode = k; run.push(el); }
    });
    flush();

    // 5) имена файлов, вызовы функций и идентификаторы → инлайн-код
    var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null);
    var texts = [], node;
    while ((node = walker.nextNode())) {
      if (node.data.length > 3 && /[A-Za-z]/.test(node.data) && !node.parentNode.closest(NO_CODE)) texts.push(node);
    }
    texts.forEach(function (tn) {
      var s = tn.data, last = 0, m, frag = null;
      CODE_RE.lastIndex = 0;
      while ((m = CODE_RE.exec(s))) {
        var start = m.index + m[1].length;
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(s.slice(last, start)));
        var code = document.createElement("code");
        code.textContent = m[2];
        frag.appendChild(code);
        last = start + m[2].length;
      }
      if (!frag) return;
      frag.appendChild(document.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });

    glossTerms(article);
  }

  /* ── Пояснения терминов: первое упоминание термина в каждом разделе урока
   * подчёркнуто пунктиром, по наведению или фокусу — пояснение простыми словами.
   * Словарь — window.FOLUR_GLOSSARY (glossary.js). ─────────────────────────── */
  function glossTerms(article) {
    var G = window.FOLUR_GLOSSARY;
    if (!G || !G.length) return;
    var exact = {}, lower = {}, alts = [];
    G.forEach(function (g) {
      [g[0]].concat(g[2] ? g[2].split("|") : []).forEach(function (f) {
        exact[f] = g;
        if (/[а-яё]/.test(f)) lower[f.toLowerCase()] = g; // русские слова — без учёта регистра
        alts.push(f);
      });
    });
    alts.sort(function (a, b) { return b.length - a.length; });
    var re = new RegExp("(^|[^A-Za-zА-Яа-яЁё0-9_])(" +
      alts.map(function (a) { return a.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&"); }).join("|") +
      ")(?![A-Za-zА-Яа-яЁё0-9_-])", "gi");
    var skip = NO_CODE + ", abbr, table, .bloom, .folur-callout__label, .folur-def__term, .folur-python-practice, .admonition, .folur-lesson-head, .folur-gate";
    var seen = {};
    Array.prototype.slice.call(article.children).forEach(function (block) {
      if (block.tagName === "H2") { seen = {}; return; }
      if (!/^(P|UL|OL)$/.test(block.tagName)) return;
      var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = walker.nextNode())) if (n.data.length > 2 && !n.parentNode.closest(skip)) nodes.push(n);
      nodes.forEach(function (tn) {
        var s = tn.data, last = 0, frag = null, m;
        re.lastIndex = 0;
        while ((m = re.exec(s))) {
          var g = exact[m[2]] || lower[m[2].toLowerCase()];
          if (!g || seen[g[0]]) continue;
          seen[g[0]] = true;
          var start = m.index + m[1].length;
          frag = frag || document.createDocumentFragment();
          frag.appendChild(document.createTextNode(s.slice(last, start)));
          var ab = document.createElement("abbr");
          ab.className = "folur-term";
          ab.tabIndex = 0;
          ab.setAttribute("data-tip", g[1]);
          ab.setAttribute("aria-description", g[1]);
          ab.textContent = m[2];
          frag.appendChild(ab);
          last = start + m[2].length;
        }
        if (!frag) return;
        frag.appendChild(document.createTextNode(s.slice(last)));
        tn.parentNode.replaceChild(frag, tn);
      });
    });
  }

  function glossaryPage() {
    var box = document.getElementById("folur-glossary"), G = window.FOLUR_GLOSSARY;
    if (!box || !G || box.getAttribute("data-ready")) return;
    box.setAttribute("data-ready", "");
    box.textContent = "";
    var dl = document.createElement("dl");
    dl.className = "folur-glossary";
    G.slice().sort(function (a, b) { return a[0].localeCompare(b[0], "ru", { sensitivity: "base" }); }).forEach(function (g) {
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = g[0];
      dd.textContent = g[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    box.appendChild(dl);
  }

  /* ── Подсказка для первого захода в урок: как устроена страница ─────────── */
  var HINT_KEY = "folur-hint-lesson";
  function lessonHint(bar) {
    try { if (localStorage.getItem(HINT_KEY)) return; } catch (e) { return; }
    var note = document.createElement("div");
    note.className = "folur-hint";
    note.setAttribute("role", "note");
    var text = document.createElement("p");
    text.textContent = "Как устроен урок. Он разбит на шаги — это квадратики с номерами над заголовком. " +
      "Читайте шаг и переходите кнопкой «Дальше» внизу страницы. Шаг «Практика в Python» — запуск примера прямо на сайте, " +
      "последний шаг — проверка знаний. Слова, подчёркнутые пунктиром, можно навести мышью: появится пояснение.";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "Понятно";
    ok.addEventListener("click", function () {
      try { localStorage.setItem(HINT_KEY, "1"); } catch (e) {}
      note.remove();
    });
    note.appendChild(text); note.appendChild(ok);
    bar.parentNode.insertBefore(note, bar.nextSibling);
  }

  /* ── Элементы модуля из навигации (в порядке следования) ────────────── */
  function moduleItems(code) {
    var seen = new Set(), items = [];
    var re = new RegExp("/modules/" + code + "/(lectures|practicum|ai-assistant|assessment)");
    document.querySelectorAll(".md-nav__link[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var abs = new URL(href, location.href).pathname;
      if (!re.test(abs) || seen.has(abs)) return;
      seen.add(abs);
      var label = a.querySelector(".md-ellipsis") || a;
      items.push({ url: abs, title: a.getAttribute("title") || (label.textContent || "").trim() });
    });
    return items;
  }

  function pathCode() {
    var m = location.pathname.match(/\/modules\/([ap]\d+)\//);
    return m ? m[1] : null;
  }

  var VISITED_KEY = "folur-visited";
  function visited() {
    try { return JSON.parse(localStorage.getItem(VISITED_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function markVisited(path) {
    var v = visited();
    if (v.indexOf(path) === -1) { v.push(path); localStorage.setItem(VISITED_KEY, JSON.stringify(v)); }
  }

  /* ── Последовательный доступ к шагам модуля ──────────────────────────────
   * Шаг «пройден», когда слушатель дошёл до его последнего раздела. Следующий
   * шаг открывается только после этого. Состояние — в localStorage, сервера
   * нет, поэтому замок мягкий: на закрытой странице есть «Открыть без
   * ограничений» (другой браузер, преподаватель, очищенное хранилище). ───── */
  var DONE_KEY = "folur-done", GATE_OFF_KEY = "folur-gate-off";
  var GATED = false; // текущая страница закрыта — прогресс на ней не засчитываем
  function readList(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function doneList() {
    try {
      // первый запуск после включения замка: уже открытые шаги считаем пройденными
      if (localStorage.getItem(DONE_KEY) === null) localStorage.setItem(DONE_KEY, JSON.stringify(visited()));
    } catch (e) {}
    return readList(DONE_KEY);
  }
  function markDone(path) {
    if (GATED) return;
    var d = doneList();
    if (d.indexOf(path) !== -1) return;
    d.push(path);
    try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) {}
    lessonGate(); // следующий шаг открылся — обновить замки в сайдбаре
  }
  function gateOff(code) {
    return !!window.__FOLUR_PDF__ || readList(GATE_OFF_KEY).indexOf(code) !== -1;
  }
  // индекс первого непройденного шага; всё, что после него, закрыто
  function frontier(items, code) {
    if (gateOff(code)) return items.length;
    var d = doneList();
    for (var i = 0; i < items.length; i++) if (d.indexOf(items[i].url) === -1) return i;
    return items.length;
  }

  function lessonGate() {
    var code = pathCode();
    if (!code) return;
    var items = moduleItems(code);
    if (!items.length) return;
    var open = frontier(items, code), d = doneList(), here = -1;
    items.forEach(function (it, i) { if (it.url === location.pathname) here = i; });

    document.querySelectorAll(".md-sidebar--primary .md-nav__link[href]").forEach(function (a) {
      var p = new URL(a.getAttribute("href"), location.href).pathname, idx = -1;
      items.forEach(function (it, i) { if (it.url === p) idx = i; });
      if (idx === -1) return;
      var locked = idx > open;
      a.classList.toggle("folur-nav-locked", locked);
      a.classList.toggle("folur-nav-done", d.indexOf(p) !== -1);
      if (locked) a.setAttribute("aria-description", "Откроется после шага " + (open + 1));
      else a.removeAttribute("aria-description");
    });

    var article = document.querySelector("article.md-content__inner, article");
    if (!article || article.querySelector(".folur-gate")) return;
    GATED = here > open;
    if (!GATED) return;
    var cur = items[open];
    var gate = document.createElement("div");
    gate.className = "folur-gate";
    gate.setAttribute("role", "status");
    var h = document.createElement("div");
    h.className = "folur-gate__title";
    h.textContent = "Шаг " + (here + 1) + " пока закрыт";
    var p = document.createElement("p");
    p.textContent = "Шаги модуля открываются по порядку. Сначала завершите шаг " + (open + 1) +
      " — «" + cur.title + "»: дойдите до его последнего раздела.";
    var go = document.createElement("a");
    go.className = "md-button md-button--primary";
    go.href = cur.url;
    go.textContent = "Перейти к шагу " + (open + 1) + " →";
    var skip = document.createElement("button");
    skip.type = "button";
    skip.className = "folur-gate__skip";
    skip.textContent = "Открыть без ограничений";
    skip.title = "Если вы уже проходили модуль в другом браузере или ведёте занятие";
    skip.addEventListener("click", function () {
      var off = readList(GATE_OFF_KEY);
      if (off.indexOf(code) === -1) off.push(code);
      try { localStorage.setItem(GATE_OFF_KEY, JSON.stringify(off)); } catch (e) {}
      location.reload();
    });
    var row = document.createElement("div");
    row.className = "folur-gate__actions";
    row.appendChild(go); row.appendChild(skip);
    gate.appendChild(h); gate.appendChild(p); gate.appendChild(row);
    var h1 = article.querySelector("h1");
    if (h1 && h1.parentNode === article) article.insertBefore(gate, h1.nextSibling);
    else article.insertBefore(gate, article.firstChild);
    article.classList.add("folur-gated");
  }

  /* ── Шаги урока (Stepik-стиль): связанные подразделы объединены по смыслу.
   * Квадратики и хэш-URL переключают активный раздел; внизу «Назад/Дальше».
   * Печать/PDF видят весь урок целиком (скрытие — классом, print его снимает,
   * а в режиме генерации PDF пагинация не включается вовсе). ─────────────── */
  function isContent(el) {
    return !/^H[1-6]$/.test(el.tagName) && el.tagName !== "HR" &&
      !/^Программа модуля\s*·\s*Данные и условия использования$/.test(el.textContent.trim()) &&
      !!(el.textContent.trim() || el.matches("img, iframe, canvas, video, input") ||
         el.querySelector("img, iframe, canvas, video, input"));
  }

  // H2 describes text structure, not necessarily a separate lesson screen.
  function groupLessonSections(sections) {
    function text(s) { return s.title || s.head.textContent.replace(/¶/g, "").trim(); }
    function kind(s) {
      if (s.lab) return "lab";
      if (s.kindHint) return s.kindHint;
      var t = text(s);
      if (/^(Цел[ьи].*(урока|лекции)|Место в модуле|После изучения)/i.test(t)) return "intro";
      if (/Региональный кейс/i.test(t)) return "case";
      if (/(Контроль знаний|Контрольные вопросы|Тестовые вопросы|Проверь себя|(?:^|\. )Контроль$)/i.test(t)) return "check";
      if (/^(Закрепление и применение|Практикум)/i.test(t)) return "practice";
      if (/^Лекционный блок/i.test(t)) return "lecture";
      if (/^\d+\.\s/.test(t)) return "topic";
      if (/Словарь урока/i.test(t)) return "glossary";
      if (/^Код для выполнения задания/i.test(t)) return "code";
      return "detail";
    }
    function hasContent(s) { return s.els.some(isContent); }
    var groups = [], pending = [], pendingTopic = null;
    sections.forEach(function (s) {
      var k = kind(s), last = groups[groups.length - 1];
      // Empty wrappers travel with the next section that actually has content.
      if (!hasContent(s)) {
        pending = pending.concat(s.els);
        if (/^(lecture|practice|check)$/.test(k)) {
          s.head.classList.add("folur-empty-section-label");
          document.querySelectorAll('.md-nav--secondary a[href="#' + s.head.id + '"]').forEach(function (a) {
            var item = a.closest("li"); if (item) item.classList.add("folur-empty-section-label");
          });
        }
        if (k !== "detail") pendingTopic = s;
        return;
      }
      var parent = pendingTopic && k === "detail" ? pendingTopic : s;
      if (parent !== s) k = kind(parent);
      var merge = last && (k === "detail" ||
        (k === last.kind && /^(intro|check|practice)$/.test(k)));
      if (merge) last.els = last.els.concat(pending, s.els);
      else groups.push({ head: parent.head, els: pending.concat(s.els), kind: k,
        title: k === "intro" ? "Введение" : k === "check" ? "Проверка знаний" : text(parent) });
      pending = []; pendingTopic = null;
    });
    if (pending.length && groups.length) groups[groups.length - 1].els = groups[groups.length - 1].els.concat(pending);
    return groups.length ? groups : sections;
  }

  function stepsBar() {
    var code = pathCode();
    if (!code || !/\/(lectures|practicum|ai-assistant|assessment)\//.test(location.pathname + "/")) return;
    var article = document.querySelector("article.md-content__inner, article");
    if (!article || article.querySelector(".folur-steps")) return;
    if (!GATED) markVisited(location.pathname);
    if (window.__FOLUR_PDF__) return; // конспект печатается сплошным текстом

    var heads = Array.prototype.slice.call(article.querySelectorAll("h2[id]"));
    if (heads.length < 2) { markDone(location.pathname); return; }

    // разбивка: раздел = h2 + все top-level блоки до следующего h2;
    // встроенный редактор Python — отдельный шаг со своим названием
    var sections = [], cur = null;
    Array.prototype.slice.call(article.children).forEach(function (el) {
      if (heads.indexOf(el) !== -1) { cur = { head: el, els: [el] }; sections.push(cur); return; }
      if (!cur) return;
      if (el.id && el.classList.contains("folur-python-practice")) {
        cur = { head: el, els: [el], title: "Практика в Python", lab: true };
        sections.push(cur);
        return;
      }
      if (cur.lab) { cur = { head: el, els: [], tail: true }; sections.push(cur); }
      cur.els.push(el);
    });
    // то, что в исходнике идёт после редактора до следующего заголовка, остаётся
    // после него отдельным шагом (порядок материала не меняется)
    sections = sections.filter(function (s, i) {
      if (!s.tail) return true;
      if (!s.els.some(isContent)) { sections[i - 1].els = sections[i - 1].els.concat(s.els); return false; }
      var quiz = s.els.some(function (el) {
        return el.matches(".folur-quiz, .quiz") || el.querySelector(".folur-quiz, .quiz");
      });
      s.title = quiz ? "Проверка знаний" : "Закрепление и применение";
      s.kindHint = quiz ? "check" : "practice";
      if (!s.head.id) s.head.id = "after-practice";
      return true;
    });
    if (sections.length < 2) { markDone(location.pathname); return; }

    if (/\/lectures\//.test(location.pathname)) sections = groupLessonSections(sections);

    // подпись «шаг N из M модуля»
    var items = moduleItems(code);
    var pos = 0;
    items.forEach(function (it, i) { if (it.url === location.pathname) pos = i + 1; });
    var next = items[pos] || null; // следующий шаг модуля (pos 1-базный)
    var kind = /\/assessment\//.test(location.pathname) ? "Оценивание"
      : /\/practicum\//.test(location.pathname) ? "Практикум"
      : /\/ai-assistant\//.test(location.pathname) ? "ИИ-задание" : "Урок";

    var bar = document.createElement("nav");
    bar.className = "folur-steps";
    bar.setAttribute("aria-label", "Разделы: " + document.title);
    var label = document.createElement("span");
    label.className = "folur-steps__label";
    label.textContent = (moduleCode() || "") + " · " + kind +
      (pos && items.length ? " · шаг " + pos + " из " + items.length : "") +
      " · разделы:";
    bar.appendChild(label);
    var squares = sections.map(function (s, i) {
      var a = document.createElement("a");
      a.className = "folur-step";
      a.href = "#" + s.head.id;
      var t = s.title || s.head.textContent.replace(/¶/g, "").trim();
      a.title = t;
      a.setAttribute("aria-label", "Раздел " + (i + 1) + ": " + t);
      a.textContent = String(i + 1);
      bar.appendChild(a);
      return a;
    });
    article.insertBefore(bar, article.firstChild);
    document.body.classList.add("folur-stepped"); // «Содержание» следует за шагом, а не за прокруткой
    if (/\/lectures\//.test(location.pathname) && !GATED) lessonHint(bar);

    // пейджер внизу
    var pager = document.createElement("nav");
    pager.className = "folur-pager";
    var prevBtn = document.createElement("a");
    prevBtn.className = "md-button folur-pager__prev";
    prevBtn.textContent = "← Назад";
    var nextBtn = document.createElement("a");
    nextBtn.className = "md-button md-button--primary folur-pager__next";
    var title = document.createElement("span");
    title.className = "folur-pager__title";
    pager.appendChild(prevBtn); pager.appendChild(title); pager.appendChild(nextBtn);
    article.appendChild(pager);

    var seen = {};
    var current = 0;

    function idToIndex(id) {
      if (!id) return 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].head.id === id) return i;
        for (var j = 0; j < sections[i].els.length; j++) {
          if (sections[i].els[j].id === id || sections[i].els[j].querySelector("#" + CSS.escape(id))) return i;
        }
      }
      return 0;
    }

    function show(i, scrollTop) {
      current = Math.max(0, Math.min(sections.length - 1, i));
      seen[current] = true;
      sections.forEach(function (s, j) {
        s.els.forEach(function (el) { el.classList.toggle("folur-step-hidden", j !== current); });
      });
      squares.forEach(function (sq, j) {
        sq.classList.toggle("folur-step--current", j === current);
        sq.classList.toggle("folur-step--done", !!seen[j] && j !== current);
      });
      title.textContent = "Раздел " + (current + 1) + " из " + sections.length + ": " +
        (sections[current].title || sections[current].head.textContent.replace(/¶/g, "").trim());
      // «Содержание» справа: подпункты раскрыты только у текущего раздела
      document.querySelectorAll(".md-nav--secondary > .md-nav__list > .md-nav__item").forEach(function (li) {
        var a = li.querySelector("a[href]");
        var id = a ? decodeURIComponent((a.getAttribute("href") || "").replace(/^[^#]*#/, "")) : "";
        li.classList.toggle("folur-toc-current", !!id && idToIndex(id) === current);
      });
      if (current === sections.length - 1) markDone(location.pathname);
      prevBtn.style.visibility = current === 0 ? "hidden" : "visible";
      prevBtn.href = current > 0 ? "#" + sections[current - 1].head.id : "#";
      if (current < sections.length - 1) {
        nextBtn.textContent = "Дальше →";
        nextBtn.href = "#" + sections[current + 1].head.id;
      } else if (next) {
        nextBtn.textContent = "Следующий шаг модуля →";
        nextBtn.href = next.url;
      } else {
        nextBtn.textContent = "К странице модуля →";
        nextBtn.href = "/".concat("modules/", code, "/").replace("//", "/");
        nextBtn.href = location.pathname.split("/modules/")[0] + "/modules/" + code + "/";
      }
      if (scrollTop !== false) {
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }
    }

    window.addEventListener("hashchange", function () {
      var id = decodeURIComponent(location.hash.slice(1));
      var i = idToIndex(id);
      show(i, false);
      // если якорь — подраздел (h3) внутри секции, доскроллить к нему
      var target = id && document.getElementById(id);
      if (target && target.classList.contains("folur-empty-section-label")) sections[i].head.scrollIntoView();
      else if (target && target !== sections[i].head) target.scrollIntoView();
      else window.scrollTo({ top: 0 });
    });

    show(idToIndex(decodeURIComponent(location.hash.slice(1))), false);
  }

  /* ── Лендинг курса (Coursera-стиль) на странице модуля ─────────────────── */
  function courseLanding() {
    var code = pathCode();
    if (!code || !/\/modules\/[ap]\d+\/(index\.html)?$/.test(location.pathname)) return;
    var article = document.querySelector("article.md-content__inner, article");
    var h1 = article && article.querySelector("h1");
    if (!h1 || article.querySelector(".folur-course-hero")) return;

    var items = moduleItems(code);
    var lectures = items.filter(function (i) { return /\/lectures\//.test(i.url); });
    var assessment = items.filter(function (i) { return /\/assessment\//.test(i.url); })[0];
    var firstLesson = lectures[0] || items[0];
    if (!firstLesson) return;

    // Coursera-паттерн «продолжить с места остановки»
    var done = visited();
    var doneCount = items.filter(function (i) { return done.indexOf(i.url) !== -1; }).length;
    var nextItem = items.filter(function (i) { return done.indexOf(i.url) === -1; })[0];
    var ctaText = "Начать обучение →", ctaHref = firstLesson.url, ctaNote = "";
    if (doneCount > 0 && nextItem) {
      ctaText = "Продолжить обучение →";
      ctaHref = nextItem.url;
      ctaNote = "пройдено " + doneCount + " из " + items.length + " · далее: " + nextItem.title;
    } else if (doneCount > 0 && !nextItem) {
      ctaText = "Повторить материал →";
      ctaNote = "все " + items.length + " шагов модуля пройдены";
    }

    // описание: первый абзац после h1
    var desc = "";
    var el = h1.nextElementSibling;
    while (el && !desc) {
      if (el.tagName === "P" && el.textContent.trim().length > 60) desc = el.textContent.trim();
      el = el.nextElementSibling;
    }
    // суммарное время: все «~N мин» на странице программы
    var mins = 0;
    (article.textContent.match(/~\s?(\d+)(?=\s*(?:–|-)?\s*мин)/g) || []).forEach(function (s) {
      mins += parseInt(s.replace(/[^\d]/g, ""), 10) || 0;
    });
    var hours = mins ? Math.max(1, Math.round(mins / 60)) : null;
    var isAcademic = code.charAt(0) === "a";

    var hero = document.createElement("div");
    hero.className = "folur-course-hero";
    hero.innerHTML =
      '<div class="folur-course-hero__kicker">' +
      (isAcademic ? "Академический модуль · уровень pro-code" : "Профессиональный модуль · 16–40 ак. часов") +
      "</div>" +
      (desc ? '<p class="folur-course-hero__desc">' + desc.replace(/</g, "&lt;") + "</p>" : "") +
      '<div class="folur-course-hero__cta">' +
      '<a class="md-button md-button--primary" href="' + ctaHref + '">' + ctaText + "</a>" +
      (assessment ? '<a class="md-button" href="' + assessment.url + '">Аттестация</a>' : "") +
      "</div>" +
      (ctaNote ? '<div class="folur-course-hero__note">' + ctaNote.replace(/</g, "&lt;") + "</div>" : "");

    var band = document.createElement("div");
    band.className = "folur-course-band";
    var cells = [
      [String(lectures.length || items.length), "уроков в серии + практикум и ИИ-задание"],
      [hours ? "~" + hours + " ч" : "самостоятельный темп", "суммарная трудозатрата по программе"],
      [isAcademic ? "Академический" : "Профессиональный", isAcademic ? "бакалавриат и магистратура" : "фермеры, специалисты, МСБ"],
      ["≥ 75%", "порог аттестации — сертификат с QR-проверкой"],
    ];
    band.innerHTML = cells.map(function (c) {
      return '<div class="folur-course-band__cell"><div class="folur-course-band__num">' + c[0] +
        '</div><div class="folur-course-band__label">' + c[1] + "</div></div>";
    }).join("");

    h1.parentNode.insertBefore(hero, h1.nextSibling);
    hero.parentNode.insertBefore(band, hero.nextSibling);
    learnBlock(article, band);
  }

  /* ── Карт-обложки карточек (подпись дизайна): детерминированные SVG-изолинии
   * от кода модуля. А-серия — зелень «земля», П-серия — «вода». ────────────── */
  // FNV-1a (локальная копия: quiz-engine.js — отдельный IIFE)
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function seedRand(str) {
    var s = hash(str);
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function coverSvg(code, prof) {
    var rnd = seedRand("cover|" + code);
    var W = 360, H = 96;
    var cx = 70 + rnd() * 220, cy = 20 + rnd() * 56;
    var rings = [];
    var base = 10 + rnd() * 8;
    for (var k = 0; k < 5; k++) {
      var r = base + k * (13 + rnd() * 5);
      var pts = [];
      var n = 10;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 2 * Math.PI;
        var rr = r * (0.82 + rnd() * 0.4);
        pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a) * 0.62]);
      }
      var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
      for (var j = 1; j <= n; j++) {
        var p = pts[j % n], q = pts[(j - 1) % n];
        var mx = ((p[0] + q[0]) / 2).toFixed(1), my = ((p[1] + q[1]) / 2).toFixed(1);
        d += " Q" + q[0].toFixed(1) + " " + q[1].toFixed(1) + " " + mx + " " + my;
      }
      rings.push('<path d="' + d + 'Z" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="1.1"/>');
    }
    var g1 = prof ? "#1F7A6E" : "#134029";
    var g2 = prof ? "#2A9D8F" : "#1B5E3A";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + g1 + '"/><stop offset="1" stop-color="' + g2 + '"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>' + rings.join("") +
      '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.2" fill="#D4A24E"/>' +
      "</svg>";
  }

  // число шагов модуля: из манифеста (генерится gen_nav.py); фолбэк — по типу
  function moduleTotal(codePath) {
    var m = window.FOLUR_MODULES && window.FOLUR_MODULES[codePath];
    if (m && m.total) return m.total;
    return codePath.charAt(0) === "a" ? 7 : 6;
  }

  function cardCovers() {
    document.querySelectorAll(".grid.cards li").forEach(function (li) {
      if (li.querySelector(".folur-cover")) return;
      var chip = li.querySelector(".folur-code");
      var link = li.querySelector('a[href*="index"], p:last-child a');
      if (!chip || !link) return;
      var m = (link.getAttribute("href") || "").match(/([ap]\d+)\//);
      var codePath = m ? m[1] : chip.textContent.trim().toLowerCase();
      var prof = chip.classList.contains("folur-code--prof");

      var cover = document.createElement("a");
      cover.className = "folur-cover";
      cover.href = link.getAttribute("href");
      cover.setAttribute("tabindex", "-1");
      cover.setAttribute("aria-hidden", "true");
      cover.innerHTML = coverSvg(chip.textContent.trim(), prof);
      li.insertBefore(cover, li.firstChild);

      // Stepik-прогресс: «пройдено N из M» + полоса
      var done = visited().filter(function (p) {
        return p.indexOf("/modules/" + codePath + "/") !== -1;
      }).length;
      if (done > 0) {
        var total = moduleTotal(codePath);
        var pct = Math.min(100, Math.round(100 * done / total));
        var prog = document.createElement("div");
        prog.className = "folur-card-progress";
        prog.innerHTML = '<div class="folur-card-progress__bar"><span style="width:' + pct + '%"></span></div>' +
          '<div class="folur-card-progress__label">пройдено ' + Math.min(done, total) + " из " + total + "</div>";
        li.appendChild(prog);
      }
    });
  }

  /* ── «Что вы освоите» (Coursera) — выжимка первых Bloom-целей модуля ────── */
  function learnBlock(article, band) {
    if (article.querySelector(".folur-learn")) return;
    var ol = null;
    article.querySelectorAll("ol").forEach(function (o) {
      if (!ol && o.querySelector(".bloom")) ol = o;
    });
    if (!ol) return;
    var items = [];
    ol.querySelectorAll(":scope > li").forEach(function (li) {
      if (items.length >= 4) return;
      var c = li.cloneNode(true);
      c.querySelectorAll(".bloom").forEach(function (b) { b.remove(); });
      var t = c.textContent.replace(/\s+/g, " ").trim();
      t = t.charAt(0).toUpperCase() + t.slice(1);
      if (t.length > 160) t = t.slice(0, 157).replace(/[,;\s]+\S*$/, "") + "…";
      items.push(t);
    });
    if (items.length < 2) return;
    var block = document.createElement("div");
    block.className = "folur-learn";
    block.innerHTML = '<div class="folur-learn__title">Что вы освоите</div>' +
      '<ul class="folur-learn__grid">' +
      items.map(function (t) { return "<li>" + t.replace(/</g, "&lt;") + "</li>"; }).join("") +
      "</ul>";
    band.parentNode.insertBefore(block, band.nextSibling);
  }

  /* ── «Моё обучение»: сводка прогресса из localStorage ─────────────────── */
  function moduleTitleFromNav(codePath) {
    var m = window.FOLUR_MODULES && window.FOLUR_MODULES[codePath];
    if (m && m.title) return m.title;
    return codePath.replace("a", "А").replace("p", "П").toUpperCase();
  }

  function myLearning() {
    var box = document.getElementById("folur-my-learning");
    if (!box) return;
    // страница живёт в /my-learning/, поэтому ссылки на модули строим от корня сайта:
    // относительное «modules/a1/» уводило на несуществующий /my-learning/modules/a1/
    var root = location.pathname.replace(/my-learning(?:\/(?:index\.html)?)?$/, "");

    var done = visited();
    var results = {};
    try { results = JSON.parse(localStorage.getItem("folur-results") || "{}"); } catch (e) {}

    // сгруппировать пройденные шаги по модулям
    var byModule = {};
    done.forEach(function (p) {
      var m = p.match(/\/modules\/([ap]\d+)\//);
      if (m) (byModule[m[1]] = byModule[m[1]] || []).push(p);
    });
    var codes = Object.keys(byModule).sort(function (a, b) {
      var ka = (a[0] === "a" ? 0 : 100) + parseInt(a.slice(1), 10);
      var kb = (b[0] === "a" ? 0 : 100) + parseInt(b.slice(1), 10);
      return ka - kb;
    });

    if (!codes.length) {
      box.innerHTML = "<p>Вы ещё не открывали уроки в этом браузере. " +
        'Начните с <a href="' + root + 'modules/professional/">профессиональных модулей</a> ' +
        'или <a href="' + root + 'modules/">общего каталога</a>.</p>';
      return;
    }

    // сводные показатели
    var steps = done.length;
    var passed = 0;
    Object.keys(results).forEach(function (p) {
      if (results[p].mode === "final" && results[p].p >= 75) passed++;
    });

    var html = '<div class="folur-stats" style="margin-top:0">' +
      '<div class="folur-stat"><div class="folur-stat__num">' + codes.length + '</div><div class="folur-stat__label">модулей начато</div></div>' +
      '<div class="folur-stat"><div class="folur-stat__num">' + steps + '</div><div class="folur-stat__label">шагов пройдено</div></div>' +
      '<div class="folur-stat"><div class="folur-stat__num">' + passed + '</div><div class="folur-stat__label">аттестаций сдано (≥75%)</div></div>' +
      "</div>";

    html += '<div class="folur-mylearn">';
    codes.forEach(function (code) {
      var total = moduleTotal(code);
      var n = Math.min(byModule[code].length, total);
      var pct = Math.round(100 * n / total);
      var title = moduleTitleFromNav(code);
      var badge = code.replace("a", "А").replace("p", "П").toUpperCase();
      // результат аттестации этого модуля (final)
      var res = null;
      Object.keys(results).forEach(function (p) {
        if (p.indexOf("/modules/" + code + "/assessment/") !== -1 && results[p].mode === "final") res = results[p];
      });
      var resHtml = res
        ? '<span class="folur-mylearn__res ' + (res.p >= 75 ? "ok" : "no") + '">аттестация: ' + res.p + "%" + (res.p >= 75 ? " ✓" : "") + "</span>"
        : "";
      html += '<div class="folur-mylearn__row">' +
        '<span class="folur-badge">' + badge + "</span>" +
        '<div class="folur-mylearn__main">' +
        '<a class="folur-mylearn__title" href="' + root + "modules/" + code + '/">' + title.replace(/</g, "&lt;") + "</a>" +
        '<div class="folur-card-progress__bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="folur-card-progress__label">пройдено ' + n + " из " + total + (resHtml ? " · " : "") + resHtml + "</div>" +
        "</div>" +
        '<a class="md-button' + (n < total ? " md-button--primary" : "") + '" href="' + root + "modules/" + code + '/">' +
        (n < total ? "Продолжить" : "Открыть") + "</a>" +
        "</div>";
    });
    html += "</div>";
    box.innerHTML = html;
  }

  /* ── Строгий сайдбар модуля: внутри А1 не показываем А2, А3, П…;
   * уроки своего модуля — пронумерованные карточки-шаги. ─────────────────── */
  function pruneSidebarToModule() {
    var code = pathCode();
    if (!code) return;
    document.querySelectorAll(".md-sidebar--primary .md-nav__item").forEach(function (item) {
      var links = item.querySelectorAll("a[href]");
      if (!links.length) return;
      var hasOther = false, hasMine = false;
      links.forEach(function (a) {
        var p = new URL(a.getAttribute("href"), location.href).pathname;
        var m = p.match(/\/modules\/([ap]\d+)\//);
        if (!m) return;
        if (m[1] === code) hasMine = true; else hasOther = true;
      });
      if (hasOther && !hasMine) item.style.display = "none";
    });

    // нумерация шагов своего модуля (карточки в сайдбаре)
    var seen = new Set(), n = 0;
    var re = new RegExp("/modules/" + code + "/(lectures|practicum|ai-assistant|assessment)");
    document.querySelectorAll('.md-sidebar--primary .md-nav__link[href]').forEach(function (a) {
      var p = new URL(a.getAttribute("href"), location.href).pathname;
      var item = a.closest(".md-nav__item");
      if (!item) return;
      if (p === "/") return;
      if (re.test(p)) {
        if (seen.has(p)) return;
        seen.add(p);
        n++;
        item.classList.add("folur-nav-step");
        if (!a.querySelector(".folur-nav-num")) {
          var chip = document.createElement("span");
          chip.className = "folur-nav-num";
          chip.textContent = n;
          a.insertBefore(chip, a.firstChild);
          // короткое название в карточке шага: в nav заголовок записан как
          // «Действие — уточнение»; уточнение уходит в подсказку
          var label = a.querySelector(".md-ellipsis");
          var full = label ? label.textContent.trim() : "";
          var parts = full.split(" — ");
          if (label && parts.length > 1) {
            label.textContent = parts[0].length < 14 ? parts[0] + ": " + parts[1] : parts[0];
            a.title = full;
          }
        }
      } else if (p.replace(/index\.html$/, "") === "/modules/" + code + "/" ||
                 p.endsWith("/modules/" + code + "/")) {
        item.classList.add("folur-nav-home");
      }
    });
  }

  /* ── Скролл-реявл (squidfunk-стиль): плавное появление блоков лендинга
   * при прокрутке. Только главная и страницы модулей (courseLanding()).
   * Скрытие задаётся ТОЛЬКО через JS-класс .folur-anim на <html> — без JS
   * или без IntersectionObserver всё остаётся видимым (см. requirement #3). */
  function scrollReveal() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.__FOLUR_PDF__ || reduce) return; // печать/PDF и reduced-motion — всё видно сразу, класс не добавляем

    var isHome = /^\/(index\.html)?$/.test(location.pathname);
    var isModuleLanding = /\/modules\/[ap]\d+\/(index\.html)?$/.test(location.pathname);
    if (!isHome && !isModuleLanding) return;

    var article = document.querySelector("article.md-content__inner, article");
    if (!article) return;

    // группы: каждая — свой стаггер-счётчик, чтобы длинная страница не «тянулась»
    var groups = [];
    var hero = article.querySelector(".folur-hero, .folur-course-hero");
    if (hero) groups.push([hero]);
    var band = article.querySelector(".folur-course-band");
    if (band) groups.push([band]);
    var stats = article.querySelector(".folur-stats");
    if (stats) groups.push(Array.prototype.slice.call(stats.querySelectorAll(".folur-stat")));
    var learn = article.querySelector(".folur-learn");
    if (learn) groups.push([learn]);
    article.querySelectorAll(".folur-block-head").forEach(function (h) { groups.push([h]); });
    article.querySelectorAll(".grid.cards").forEach(function (grid) {
      groups.push(Array.prototype.slice.call(grid.querySelectorAll(":scope > :is(ul,ol) > li")));
    });

    var targets = [];
    groups.forEach(function (group) {
      group.forEach(function (el, i) {
        if (!el || el.classList.contains("folur-reveal-item")) return; // idempotent: не переинициализировать
        el.classList.add("folur-reveal-item");
        el.style.setProperty("--i", String(i));
        targets.push(el);
      });
    });
    if (!targets.length) return;

    document.documentElement.classList.add("folur-anim");

    if (!("IntersectionObserver" in window)) {
      // нет наблюдателя — не прячем контент вовсе (без .folur-anim прячущий CSS не сработает,
      // но подстрахуемся явным снятием класса)
      document.documentElement.classList.remove("folur-anim");
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("folur-reveal-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    // фокус клавиатурой на ещё не раскрытом элементе — раскрыть немедленно.
    // Слушатель вешаем ОДИН раз: init()/scrollReveal() вызывается на каждой
    // instant-nav смене страницы, иначе слушатели focusin копились бы (утечка).
    if (!scrollReveal._focusBound) {
      scrollReveal._focusBound = true;
      document.addEventListener("focusin", function (e) {
        var el = e.target && e.target.closest && e.target.closest(".folur-reveal-item:not(.folur-reveal-in)");
        if (el) el.classList.add("folur-reveal-in");
      });
    }
  }

  /* ── Левое меню можно скрыть и вернуть (выбор запоминается в браузере).
   * Только на широком экране: на узком меню и так живёт в выдвижной панели. ── */
  var NAV_KEY = "folur-nav-collapsed";
  function sidebarToggle() {
    var inner = document.querySelector(".md-sidebar--primary .md-sidebar__inner");
    if (!inner || document.querySelector(".folur-nav-toggle")) return;
    function make(cls, text, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "folur-nav-toggle " + cls;
      b.textContent = text;
      b.setAttribute("aria-label", label);
      b.addEventListener("click", function () { set(!document.body.classList.contains("folur-nav-collapsed")); });
      return b;
    }
    var hide = make("folur-nav-toggle--hide", "‹ Скрыть", "Скрыть меню модуля");
    var show = make("folur-nav-toggle--show", "Раскрыть ›", "Раскрыть меню модуля");
    function set(collapsed) {
      document.body.classList.toggle("folur-nav-collapsed", collapsed);
      hide.setAttribute("aria-expanded", String(!collapsed));
      show.setAttribute("aria-expanded", String(!collapsed));
      try { localStorage.setItem(NAV_KEY, collapsed ? "1" : "0"); } catch (e) {}
    }
    inner.insertBefore(hide, inner.firstChild);
    document.body.appendChild(show);
    var saved = null;
    try { saved = localStorage.getItem(NAV_KEY); } catch (e) {}
    set(saved === "1");
  }

  function init() {
    sidebarToggle();
    readbar();
    lessonHead();
    bloomPills();
    externalLinks();
    enrichProse();
    lessonGate();
    stepsBar();
    courseLanding();
    cardCovers();
    myLearning();
    glossaryPage();
    pruneSidebarToModule();
    scrollReveal();
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
