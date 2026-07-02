/* Проверка кода сертификата (страница «Проверка сертификата»).
 * Контрольная сумма выявляет опечатки и порчу кода; это НЕ криптографическая
 * подпись (ограничение задокументировано на самой странице). */
(function () {
  "use strict";

  var CERT_SALT = "folur-kaz-30c9f7cea8ba8869";

  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function decode(code) {
    var b64 = code.trim().replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var obj = JSON.parse(decodeURIComponent(escape(atob(b64))));
    var ok = hash(JSON.stringify(obj.j) + CERT_SALT).toString(16) === obj.k;
    return { ok: ok, data: obj.j };
  }

  function esc(s) {
    return String(s).replace(/</g, "&lt;");
  }

  function show(box, code) {
    var res;
    try {
      res = decode(code);
    } catch (err) {
      box.innerHTML = '<p><strong>✗ Код не читается</strong> — он повреждён или неполон.</p>';
      return;
    }
    if (!res.ok) {
      box.innerHTML = '<p><strong>✗ Контрольная сумма не сходится</strong> — код изменён или повреждён.</p>';
      return;
    }
    var d = res.data;
    var kind = d.t === "result"
      ? (d.mode === "pre" ? "Код результата входного (pre) теста" : "Код результата аттестации")
      : "Сертификат";
    box.innerHTML =
      "<p><strong>✓ Код целостен.</strong> Тип: " + kind + ".</p>" +
      "<table><tbody>" +
      "<tr><td>Слушатель</td><td><strong>" + esc(d.s) + "</strong></td></tr>" +
      "<tr><td>Аттестация</td><td>" + esc(d.m) + "</td></tr>" +
      "<tr><td>Результат</td><td>" + esc(d.p) + "%" + (d.r ? " (" + esc(d.r) + ")" : "") +
      (d.t === "result" ? "" : " (порог 75%)") + "</td></tr>" +
      "<tr><td>Дата</td><td>" + esc(d.d) + "</td></tr>" +
      "</tbody></table>" +
      "<p class='folur-verify-note'>Сверьте слушателя с реестром проекта (KPI-журнал). " +
      "Контрольная сумма подтверждает целостность кода, но не заменяет реестр.</p>";
  }

  function init() {
    var box = document.getElementById("folur-verify");
    if (!box) return;
    box.innerHTML =
      '<p><label>Код сертификата:<br><textarea id="folur-verify-input" rows="4" style="width:100%"></textarea></label></p>' +
      '<p><button id="folur-verify-btn" class="md-button md-button--primary">Проверить</button></p>' +
      '<div id="folur-verify-result"></div>';
    var out = document.getElementById("folur-verify-result");
    document.getElementById("folur-verify-btn").addEventListener("click", function () {
      show(out, document.getElementById("folur-verify-input").value);
    });
    var c = new URLSearchParams(location.search).get("c");
    if (c) {
      document.getElementById("folur-verify-input").value = c;
      show(out, c);
    }
  }

  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
