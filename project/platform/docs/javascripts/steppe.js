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

  /* ── Элементы модуля из навигации (в порядке следования) ────────────── */
  function moduleItems(code) {
    var seen = new Set(), items = [];
    var re = new RegExp("/modules/" + code + "/(lectures|practicum|ai-assistant|assessment)");
    document.querySelectorAll(".md-nav__link[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var abs = new URL(href, location.href).pathname;
      if (!re.test(abs) || seen.has(abs)) return;
      seen.add(abs);
      items.push({ url: abs, title: (a.textContent || "").trim() });
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

  /* ── Степ-бар модуля (Stepik-стиль): квадратики уроков сверху ─────────── */
  function stepsBar() {
    var code = pathCode();
    if (!code || !/\/(lectures|practicum|ai-assistant|assessment)\//.test(location.pathname)) return;
    var article = document.querySelector("article.md-content__inner, article");
    if (!article || article.querySelector(".folur-steps")) return;
    var items = moduleItems(code);
    if (items.length < 2) return;
    markVisited(location.pathname);
    var done = visited();
    var bar = document.createElement("nav");
    bar.className = "folur-steps";
    bar.setAttribute("aria-label", "Шаги модуля " + code.toUpperCase());
    var label = document.createElement("span");
    label.className = "folur-steps__label";
    bar.appendChild(label);
    var doneCount = 0;
    items.forEach(function (it, i) {
      var a = document.createElement("a");
      var isDone = done.indexOf(it.url) !== -1;
      var isCur = it.url === location.pathname;
      if (isDone) doneCount++;
      a.className = "folur-step" + (isDone ? " folur-step--done" : "") +
        (isCur ? " folur-step--current" : "") +
        (/\/assessment\//.test(it.url) ? " folur-step--assessment" : "");
      a.href = it.url;
      a.title = it.title;
      a.textContent = /\/assessment\//.test(it.url) ? "✓" : String(i + 1);
      bar.appendChild(a);
    });
    label.textContent = "Модуль " + (moduleCode() || "") + " · пройдено " + doneCount + " из " + items.length;
    article.insertBefore(bar, article.firstChild);
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
        'Начните с <a href="modules/professional/">профессиональных модулей</a> ' +
        'или <a href="modules/">общего каталога</a>.</p>';
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
        '<a class="folur-mylearn__title" href="modules/' + code + '/">' + title.replace(/</g, "&lt;") + "</a>" +
        '<div class="folur-card-progress__bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="folur-card-progress__label">пройдено ' + n + " из " + total + (resHtml ? " · " : "") + resHtml + "</div>" +
        "</div>" +
        '<a class="md-button' + (n < total ? " md-button--primary" : "") + '" href="modules/' + code + '/">' +
        (n < total ? "Продолжить" : "Открыть") + "</a>" +
        "</div>";
    });
    html += "</div>";
    box.innerHTML = html;
  }

  /* ── Строгий сайдбар модуля: внутри А1 не показываем А2, А3, П… ─────────── */
  function pruneSidebarToModule() {
    var code = pathCode();
    if (!code) return;
    var mine = "/modules/" + code + "/";
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
  }

  function init() {
    readbar();
    lessonHead();
    bloomPills();
    stepsBar();
    courseLanding();
    cardCovers();
    myLearning();
    pruneSidebarToModule();
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
