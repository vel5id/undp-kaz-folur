/* Тест-движок платформы FOLUR (клиентский, MVP Этапа 2).
 *
 * Находит fenced-блоки ```quiz (JSON-массив вопросов), заменяет их интерактивным
 * тестом. Индивидуальный вариант: из банка берётся подвыборка вопросов и порядок
 * опций, детерминированно зависящие от идентификатора слушателя (анти-списывание:
 * у соседей разные варианты, а преподаватель может воспроизвести любой вариант).
 * Порог зачёта — 75% (политика платформы). Работает на GitHub Pages без сервера.
 */
(function () {
  "use strict";

  var PASS_THRESHOLD = 0.75;
  var SUBSET = 0.8; // доля банка в индивидуальном варианте (мин. 3 вопроса)

  // FNV-1a: детерминированный хэш идентификатора слушателя
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
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

  function render(container, bank, quizKey) {
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
    });

    container.replaceWith(form);
  }

  function init() {
    var blocks = document.querySelectorAll(
      "pre.quiz > code, div.quiz pre > code, pre > code.language-quiz, pre > code.quiz"
    );
    var idx = 0;
    blocks.forEach(function (code) {
      var bank;
      try {
        bank = JSON.parse(code.textContent);
      } catch (err) {
        return; // сломанный JSON ловит validate_content.py на сборке
      }
      var key = location.pathname + "#quiz" + idx++;
      var host = code.closest("div.quiz") || code.closest("pre");
      render(host, bank, key);
    });
  }

  // совместимость с мгновенной навигацией Material
  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
