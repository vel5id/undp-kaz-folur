/* Тест-движок платформы FOLUR (клиентский, Этап 2).
 *
 * Находит fenced-блоки ```quiz (JSON-массив вопросов), заменяет их интерактивным
 * тестом. Индивидуальный вариант: из банка берётся подвыборка вопросов и порядок
 * опций, детерминированно зависящие от идентификатора слушателя (анти-списывание:
 * у соседей разные варианты, а преподаватель может воспроизвести любой вариант).
 * Порог зачёта — 75% (политика платформы). Работает на GitHub Pages без сервера.
 *
 * На страницах /assessment/ после сдачи всех квизов с итогом ≥ 75% доступен
 * сертификат с QR-кодом верификации (см. страницу «Проверка сертификата»).
 */
(function () {
  "use strict";

  var PASS_THRESHOLD = 0.75;
  var SUBSET = 0.8; // доля банка в индивидуальном варианте (мин. 3 вопроса)
  var CERT_SALT = "folur-kaz-2026-v1";
  // режим аттестации: ?mode=pre — входной тест (другой детерминированный вариант
  // того же банка; сертификат недоступен, только код результата для реестра)
  var MODE = new URLSearchParams(location.search).get("mode") === "pre" ? "pre" : "final";

  // FNV-1a: детерминированный хэш (Math.imul — точная 32-битная арифметика,
  // иначе h*prime теряет биты за пределами 2^53 и не совпадает с эталонным FNV)
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) >>> 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function getStudentId() {
    var id = localStorage.getItem("folur-student-id");
    if (!id) {
      id = prompt("Введите ваш идентификатор слушателя (ФИО или номер из реестра) — от него зависит ваш индивидуальный вариант:") || "anonymous";
      localStorage.setItem("folur-student-id", id.trim());
    }
    return localStorage.getItem("folur-student-id");
  }

  function buildVariant(bank, studentId, quizKey) {
    var rnd = mulberry32(hash(studentId + "|" + quizKey));
    var n = Math.max(3, Math.min(bank.length, Math.round(bank.length * SUBSET)));
    return shuffled(bank, rnd).slice(0, n).map(function (q) {
      var order = shuffled(q.options.map(function (_, i) { return i; }), rnd);
      return {
        q: q.q,
        options: order.map(function (i) { return q.options[i]; }),
        answer: order.indexOf(q.answer),
        explain: q.explain || "",
      };
    });
  }

  /* ---- Сертификат с QR-верификацией ------------------------------------
   * Ограничение MVP (задокументировано на странице «Проверка сертификата»):
   * контрольная сумма защищает код от опечаток и порчи, но не является
   * криптографической подписью; Open Badges — при передаче платформы ПРООН. */

  function certCode(payload) {
    var k = hash(JSON.stringify(payload) + CERT_SALT).toString(16);
    return btoa(unescape(encodeURIComponent(JSON.stringify({ j: payload, k: k }))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function openCertificate(studentId, share) {
    var h1 = document.querySelector("h1");
    var payload = {
      v: 1,
      s: studentId,
      m: h1 ? h1.textContent.replace(/¶/g, "").trim() : document.title,
      p: Math.round(share * 100),
      d: new Date().toISOString().slice(0, 10),
    };
    var code = certCode(payload);
    var base = location.pathname.split("/modules/")[0] || "";
    var url = location.origin + base + "/verify/?c=" + code;
    var svg = "";
    if (window.qrcode) {
      var qr = window.qrcode(0, "M");
      qr.addData(url);
      qr.make();
      svg = qr.createSvgTag({ cellSize: 3, margin: 2 });
    }
    var w = window.open("", "_blank");
    w.document.write(
      '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Сертификат</title>' +
      "<style>body{font-family:Georgia,serif;max-width:760px;margin:2rem auto;padding:2rem;" +
      "border:6px double #2e7d32;text-align:center}h1{color:#2e7d32;margin:.2rem 0}" +
      ".muted{color:#555;font-size:.9rem}.name{font-size:1.6rem;margin:1rem 0}" +
      ".qr{margin-top:1rem}.code{font-size:.65rem;color:#777;word-break:break-all;margin-top:1rem}" +
      "button{margin-top:1.2rem;padding:.5rem 1.4rem;font-size:1rem}@media print{button{display:none}}" +
      "</style></head><body>" +
      '<div class="muted">Учебная платформа проекта UNDP-KAZ FOLUR · КРУ им. А. Байтұрсынұлы</div>' +
      "<h1>СЕРТИФИКАТ</h1>" +
      '<div>подтверждает, что</div><div class="name">' + payload.s.replace(/</g, "&lt;") + "</div>" +
      "<div>успешно прошёл(а) аттестацию</div><p><strong>" + payload.m.replace(/</g, "&lt;") + "</strong></p>" +
      "<div>с результатом <strong>" + payload.p + "%</strong> (порог " + Math.round(PASS_THRESHOLD * 100) + "%) · " + payload.d + "</div>" +
      '<div class="qr">' + svg + "</div>" +
      '<div class="muted">Проверка подлинности: отсканируйте QR или введите код на странице «Проверка сертификата»</div>' +
      '<div class="code">' + code + "</div>" +
      "<button onclick=\"window.print()\">Печать / Сохранить в PDF</button>" +
      "</body></html>");
    w.document.close();
  }

  // Код результата для KPI-реестра: формируется после ЛЮБОЙ полной сдачи
  // аттестации (pre и final, любой процент). Слушатель передаёт код
  // координатору; батч-проверка — tools/registry_check.py.
  function resultCode(studentId, sum, all) {
    var h1 = document.querySelector("h1");
    return certCode({
      v: 2,
      t: "result",
      mode: MODE,
      s: studentId,
      m: h1 ? h1.textContent.replace(/¶/g, "").trim() : document.title,
      p: Math.round((sum / all) * 100),
      r: sum + "/" + all,
      d: new Date().toISOString().slice(0, 10),
    });
  }

  // Наблюдатель аттестации: собирает результаты всех квизов страницы /assessment/
  function makeCertWatcher(total) {
    if (!/\/assessment\//.test(location.pathname) || total === 0) return function () {};
    var scores = new Array(total).fill(null);
    return function (idx, correct, n, lastForm) {
      scores[idx] = { correct: correct, n: n };
      if (scores.some(function (s) { return s === null; })) return;
      var sum = scores.reduce(function (a, s) { return a + s.correct; }, 0);
      var all = scores.reduce(function (a, s) { return a + s.n; }, 0);
      var share = sum / all;
      var box = document.querySelector(".folur-cert");
      if (!box) {
        box = document.createElement("div");
        box.className = "folur-cert";
        lastForm.parentNode.insertBefore(box, lastForm.nextSibling);
      }
      var label = MODE === "pre" ? "Итог входного (pre) теста" : "Итог аттестации";
      box.innerHTML = "<strong>" + label + ": " + sum + "/" + all + " (" +
        Math.round(share * 100) + "%)</strong>";
      if (MODE === "final" && share >= PASS_THRESHOLD) {
        var btn = document.createElement("button");
        btn.className = "md-button md-button--primary";
        btn.textContent = "Сформировать сертификат (PDF)";
        btn.addEventListener("click", function () {
          openCertificate(getStudentId(), share);
        });
        box.appendChild(btn);
      } else if (MODE === "final") {
        box.appendChild(document.createTextNode(" — ниже порога " +
          Math.round(PASS_THRESHOLD * 100) + "%. Повторите материал и пройдите аттестацию снова."));
      }
      var codeDiv = document.createElement("div");
      codeDiv.className = "folur-result-code";
      var code = resultCode(getStudentId(), sum, all);
      codeDiv.innerHTML = "<em>Код результата для реестра (передайте координатору):</em>" +
        '<code class="folur-code-text">' + code + "</code>";
      var copy = document.createElement("button");
      copy.className = "md-button";
      copy.textContent = "Копировать код";
      copy.addEventListener("click", function () {
        navigator.clipboard && navigator.clipboard.writeText(code);
        copy.textContent = "Скопировано ✓";
      });
      codeDiv.appendChild(copy);
      box.appendChild(codeDiv);
    };
  }

  function render(container, bank, quizKey, onSubmit) {
    var studentId = getStudentId();
    var variant = buildVariant(bank, studentId, quizKey);
    var form = document.createElement("form");
    form.className = "folur-quiz";
    form.innerHTML =
      '<div class="folur-quiz-head">Самопроверка · вариант слушателя <code>' +
      studentId.replace(/</g, "&lt;") + "</code> · вопросов: " + variant.length +
      " · порог зачёта: " + Math.round(PASS_THRESHOLD * 100) + "%</div>";

    variant.forEach(function (q, qi) {
      var fs = document.createElement("fieldset");
      var html = "<legend>" + (qi + 1) + ". " + q.q + "</legend>";
      q.options.forEach(function (opt, oi) {
        html += '<label><input type="radio" name="q' + qi + '" value="' + oi + '"> ' + opt + "</label>";
      });
      fs.innerHTML = html;
      form.appendChild(fs);
    });

    var btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "md-button md-button--primary";
    btn.textContent = "Проверить";
    form.appendChild(btn);
    var out = document.createElement("div");
    out.className = "folur-quiz-result";
    form.appendChild(out);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var correct = 0;
      variant.forEach(function (q, qi) {
        var fs = form.querySelectorAll("fieldset")[qi];
        var chosen = form.querySelector('input[name="q' + qi + '"]:checked');
        var ok = chosen && parseInt(chosen.value, 10) === q.answer;
        if (ok) correct++;
        fs.className = ok ? "folur-ok" : "folur-bad";
        var exp = fs.querySelector(".folur-explain");
        if (!exp) {
          exp = document.createElement("div");
          exp.className = "folur-explain";
          fs.appendChild(exp);
        }
        exp.textContent = (ok ? "✓ Верно. " : "✗ Неверно. ") + q.explain;
      });
      var share = correct / variant.length;
      out.innerHTML = "<strong>Результат: " + correct + "/" + variant.length +
        " (" + Math.round(share * 100) + "%) — " +
        (share >= PASS_THRESHOLD ? "зачёт ✓" : "ниже порога, повторите материал") + "</strong>";
      if (onSubmit) onSubmit(correct, variant.length, form);
    });

    container.replaceWith(form);
  }

  function init() {
    var codes = document.querySelectorAll(
      "pre.quiz > code, div.quiz pre > code, pre > code.language-quiz, pre > code.quiz"
    );
    var parsed = [];
    codes.forEach(function (code) {
      try {
        parsed.push({ code: code, bank: JSON.parse(code.textContent) });
      } catch (err) {
        // сломанный JSON ловит validate_content.py на сборке
      }
    });
    var watcher = makeCertWatcher(parsed.length);
    parsed.forEach(function (item, idx) {
      // MODE в сиде: у pre- и final-теста разные детерминированные варианты
      var key = location.pathname + "#" + MODE + "#quiz" + idx;
      var host = item.code.closest("div.quiz") || item.code.closest("pre");
      render(host, item.bank, key, function (correct, n, form) {
        watcher(idx, correct, n, form);
      });
    });
  }

  // совместимость с мгновенной навигацией Material
  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
