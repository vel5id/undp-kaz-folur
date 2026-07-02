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

  function init() {
    readbar();
    lessonHead();
    bloomPills();
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
