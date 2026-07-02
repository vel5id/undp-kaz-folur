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
      '<a class="md-button md-button--primary" href="' + firstLesson.url + '">Начать обучение →</a>' +
      (assessment ? '<a class="md-button" href="' + assessment.url + '">Аттестация</a>' : "") +
      "</div>";

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
  }

  function init() {
    readbar();
    lessonHead();
    bloomPills();
    stepsBar();
    courseLanding();
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
