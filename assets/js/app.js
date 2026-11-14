/* Vámosi Tamás – weboldal működése
   - nyelvválasztó (HU / EN / DE)
   - festmények betöltése a data/paintings.json fájlból
   - galéria évszám szerint, eladó művek, nagyító
   A tartalmat az admin felület (admin/) írja, kézzel nem kell szerkeszteni. */
(function () {
  "use strict";

  /* ---------- Fordítások ---------- */
  var I18N = {
    hu: {
      skip: "Ugrás a tartalomra",
      "nav.home": "Kezdőlap", "nav.paintings": "Festmények", "nav.sale": "Eladó művek",
      "footer.rights": "Minden jog fenntartva.",
      "home.eyebrow": "Festőművész · Tetoválóművész",
      "home.portraitAlt": "Vámosi Tamás festménye",
      "home.ctaPaintings": "Festmények", "home.ctaSale": "Eladó művek",
      "home.commissionTitle": "Portré fénykép alapján",
      "home.contactTitle": "Kapcsolat",
      "home.contactLead": "Kérdése van egy festménnyel kapcsolatban, vagy megrendelné a saját portréját? Írjon nekem e-mailt!",
      "paintings.title": "Festmények",
      "paintings.lead": "Válogatás munkáimból, évek szerint. Kattintson egy képre a nagyobb nézethez.",
      "sale.title": "Eladó művek",
      "sale.lead": "Ha szeretné valamelyik festményt megvásárolni, írjon nekem e-mailt – szívesen válaszolok minden kérdésére.",
      sold: "Eladva", forSale: "Eladó", ask: "Érdeklődöm", priceOnRequest: "Ár érdeklődésre",
      mailSubject: "Érdeklődés festmény iránt", empty: "Hamarosan új festmények érkeznek.",
      emptySale: "Jelenleg nincs eladó festmény. Érdeklődjön e-mailben!",
      loadError: "A festmények nem töltődtek be. (Helyi gépen a fájlt webszerveren keresztül kell megnyitni.)",
      close: "Bezárás", prev: "Előző", next: "Következő", untitled: "Cím nélkül", years: "Évszámok"
    },
    en: {
      skip: "Skip to content",
      "nav.home": "Home", "nav.paintings": "Paintings", "nav.sale": "For sale",
      "footer.rights": "All rights reserved.",
      "home.eyebrow": "Painter · Tattoo artist",
      "home.portraitAlt": "A painting by Tamás Vámosi",
      "home.ctaPaintings": "Paintings", "home.ctaSale": "For sale",
      "home.commissionTitle": "Portraits from photographs",
      "home.contactTitle": "Contact",
      "home.contactLead": "Have a question about a painting, or would you like to commission a portrait? Send me an e-mail!",
      "paintings.title": "Paintings",
      "paintings.lead": "A selection of my work, arranged by year. Click on an image to view it larger.",
      "sale.title": "Paintings for sale",
      "sale.lead": "If you would like to buy one of the paintings, just send me an e-mail – I'm happy to answer any questions.",
      sold: "Sold", forSale: "For sale", ask: "Enquire", priceOnRequest: "Price on request",
      mailSubject: "Enquiry about a painting", empty: "New paintings coming soon.",
      emptySale: "There are no paintings for sale at the moment. Feel free to ask by e-mail!",
      loadError: "The paintings could not be loaded.",
      close: "Close", prev: "Previous", next: "Next", untitled: "Untitled", years: "Years"
    },
    de: {
      skip: "Zum Inhalt springen",
      "nav.home": "Startseite", "nav.paintings": "Gemälde", "nav.sale": "Zu verkaufen",
      "footer.rights": "Alle Rechte vorbehalten.",
      "home.eyebrow": "Maler · Tätowierer",
      "home.portraitAlt": "Ein Gemälde von Tamás Vámosi",
      "home.ctaPaintings": "Gemälde", "home.ctaSale": "Zu verkaufen",
      "home.commissionTitle": "Porträts nach Fotovorlage",
      "home.contactTitle": "Kontakt",
      "home.contactLead": "Haben Sie eine Frage zu einem Gemälde oder möchten Sie ein Porträt in Auftrag geben? Schreiben Sie mir eine E-Mail!",
      "paintings.title": "Gemälde",
      "paintings.lead": "Eine Auswahl meiner Arbeiten, nach Jahren geordnet. Klicken Sie auf ein Bild, um es zu vergrößern.",
      "sale.title": "Gemälde zu verkaufen",
      "sale.lead": "Wenn Sie eines der Gemälde erwerben möchten, schreiben Sie mir einfach eine E-Mail – ich beantworte gerne alle Ihre Fragen.",
      sold: "Verkauft", forSale: "Zu verkaufen", ask: "Anfragen", priceOnRequest: "Preis auf Anfrage",
      mailSubject: "Anfrage zu einem Gemälde", empty: "Neue Gemälde folgen in Kürze.",
      emptySale: "Derzeit sind keine Gemälde zu verkaufen. Fragen Sie gerne per E-Mail an!",
      loadError: "Die Gemälde konnten nicht geladen werden.",
      close: "Schließen", prev: "Zurück", next: "Weiter", untitled: "Ohne Titel", years: "Jahre"
    }
  };
  var LANGS = ["hu", "en", "de"];
  var page = document.body.getAttribute("data-page");
  var ROOT = document.body.getAttribute("data-root") || ""; // "../" az /en/ és /de/ oldalakon
  function src(p) { return !p ? "" : /^(https?:)?\/\//.test(p) || p.charAt(0) === "/" ? p : ROOT + p; }
  var state = { lang: "hu", site: null, paintings: [], lbList: [], lbIndex: 0 };

  /* ---------- Segédfüggvények ---------- */
  function t(key) { return (I18N[state.lang] && I18N[state.lang][key]) || I18N.hu[key] || key; }
  function loc(obj) { // többnyelvű mező: ha nincs fordítás, magyar
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return (obj[state.lang] && obj[state.lang].trim()) || obj.hu || obj.en || obj.de || "";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function getJSON(url) {
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function titleOf(p) { return loc(p.title) || t("untitled"); }
  function metaOf(p) { return [p.year, p.size, loc(p.technique)].filter(Boolean).join(" · "); }
  function priceOf(p) {
    if (p.price && String(p.price).trim()) return { text: String(p.price).trim(), note: false };
    return { text: loc(p.priceNote) || t("priceOnRequest"), note: true };
  }
  function mailto(p) {
    var email = (state.site && state.site.email) || "vamosifestmenyek@gmail.com";
    var subj = t("mailSubject") + (p ? ": " + titleOf(p) + " (" + p.year + ")" : "");
    return "mailto:" + email + "?subject=" + encodeURIComponent(subj);
  }

  /* ---------- Nyelv: az oldal címe határozza meg (/, /en/, /de/) ---------- */
  function applyLabels() {
    var lb = $("#lightbox");
    if (lb) {
      $(".lb-close", lb).setAttribute("aria-label", t("close"));
      $(".lb-prev", lb).setAttribute("aria-label", t("prev"));
      $(".lb-next", lb).setAttribute("aria-label", t("next"));
    }
  }

  /* ---------- Oldalak kirajzolása ---------- */
  function render() {
    if (page === "home") renderHome();
    if (page === "paintings") renderGallery();
    if (page === "sale") renderSale();
    $all(".js-mail").forEach(function (a) {
      var e = (state.site && state.site.email) || "vamosifestmenyek@gmail.com";
      a.href = "mailto:" + e; a.textContent = e;
    });
    var y = $(".js-year"); if (y) y.textContent = new Date().getFullYear();
    observeReveal();
  }

  function renderHome() {
    if (!state.site) return;
    var intro = $(".js-intro");
    if (intro) intro.innerHTML = loc(state.site.intro).split(/\n\s*\n/).map(function (p) {
      return "<p>" + esc(p.trim()).replace(/\n/g, "<br>") + "</p>";
    }).join("");
    var c = $(".js-commission"); if (c) c.textContent = loc(state.site.commission);
    var sg = $(".js-signature");
    if (sg && state.site.signature && sg.getAttribute("src") !== src(state.site.signature)) sg.src = src(state.site.signature);
    var hi = $(".js-home-image");
    if (hi && state.site.homeImage && hi.getAttribute("src") !== src(state.site.homeImage)) {
      hi.src = src(state.site.homeImage);
      if (state.site.homeImageWidth) { hi.width = state.site.homeImageWidth; hi.height = state.site.homeImageHeight; }
    }
    var ig = $(".js-instagram");
    if (ig) { if (state.site.instagram) { ig.href = state.site.instagram; ig.hidden = false; } else ig.hidden = true; }
  }

  function sorted(list) {
    return list.slice().sort(function (a, b) {
      return (a.year - b.year) || String(a.added || "").localeCompare(String(b.added || "")); // növekvő évszám
    });
  }

  function tileHTML(p, i) {
    var w = p.width || 800, h = p.height || 1000;
    return '<button class="tile reveal" type="button" data-i="' + i + '">' +
      '<div class="frame"><img loading="lazy" decoding="async" src="' + esc(src(p.thumb || p.image)) + '" width="' + w + '" height="' + h + '" alt="' + esc(titleOf(p)) + '"></div>' +
      '<div class="cap"><span class="t">' + esc(titleOf(p)) + "</span>" +
      '<span class="m">' + esc([p.size].filter(Boolean).join("")) + "</span></div></button>";
  }

  function renderGallery() {
    var box = $(".js-gallery"); if (!box || !state.ready) return;
    var list = sorted(state.paintings);
    state.lbList = list;
    if (!list.length) { box.innerHTML = '<p class="empty">' + esc(t("empty")) + "</p>"; return; }
    var groups = [], cur = null;
    list.forEach(function (p, i) {
      if (!cur || cur.year !== p.year) { cur = { year: p.year, items: [] }; groups.push(cur); }
      cur.items.push(tileHTML(p, i));
    });
    box.innerHTML = groups.map(function (g) {
      return '<section class="year-group" id="ev-' + g.year + '"><h2 class="year-title">' + g.year + "</h2>" +
        '<div class="masonry">' + g.items.join("") + "</div></section>";
    }).join("");
    var nav = $(".js-year-nav");
    if (nav) {
      nav.setAttribute("aria-label", t("years"));
      nav.innerHTML = groups.length > 1 ? groups.map(function (g) { return '<a href="#ev-' + g.year + '">' + g.year + "</a>"; }).join("") : "";
    }
    $all(".tile", box).forEach(function (b) { b.addEventListener("click", function () { openLB(+b.dataset.i); }); });
  }

  function renderSale() {
    var box = $(".js-sale"); if (!box || !state.ready) return;
    var list = sorted(state.paintings.filter(function (p) { return p.forSale; }));
    list.sort(function (a, b) { return (a.sold ? 1 : 0) - (b.sold ? 1 : 0); }); // stabil: eladottak a végére
    state.lbList = list;
    if (!list.length) { box.innerHTML = '<p class="empty" style="grid-column:1/-1">' + esc(t("emptySale")) + "</p>"; return; }
    box.innerHTML = list.map(function (p, i) {
      var pr = priceOf(p);
      return '<article class="card reveal' + (p.sold ? " sold" : "") + '">' +
        '<button class="img-btn" type="button" data-i="' + i + '" aria-label="' + esc(titleOf(p)) + '">' +
        (p.sold ? '<span class="badge">' + esc(t("sold")) + "</span>" : "") +
        '<div class="img-wrap"><img loading="lazy" decoding="async" src="' + esc(src(p.thumb || p.image)) + '" alt="' + esc(titleOf(p)) + '"></div></button>' +
        "<h3>" + esc(titleOf(p)) + "</h3>" +
        '<p class="meta">' + esc(metaOf(p)) + "</p>" +
        (p.sold ? '<p class="price note">' + esc(t("sold")) + "</p>"
          : '<p class="price' + (pr.note ? " note" : "") + '">' + esc(pr.text) + "</p>" +
            '<a class="btn teal" href="' + esc(mailto(p)) + '">' + esc(t("ask")) + "</a>") +
        "</article>";
    }).join("");
    $all(".img-btn", box).forEach(function (b) { b.addEventListener("click", function () { openLB(+b.dataset.i); }); });
  }

  /* ---------- Impressum / Datenschutz: üzemeltetői adatok a data/impressum.json-ból ---------- */
  var IMPL = {
    de: { email: "E-Mail", phone: "Telefon", vatH: "Umsatzsteuer-ID", vat: "Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz", missing: "Die Anbieterangaben werden derzeit ergänzt." },
    en: { email: "E-mail", phone: "Phone", vatH: "VAT ID", vat: "VAT identification number (§ 27a UStG)", missing: "The provider details are being updated." },
    hu: { email: "E-mail", phone: "Telefon", vatH: "Adószám", vat: "Közösségi adószám (USt-IdNr.)", missing: "Az üzemeltetői adatok feltöltése folyamatban." }
  };
  function renderImp(d) {
    var L = IMPL[state.lang] || IMPL.de;
    var html = {
      address: function () {
        if (!d.street) return '<p class="imp-missing">' + esc(L.missing) + "</p>";
        var lines = [d.name, d.activity, d.co, d.street, [d.zip, d.city].filter(Boolean).join(" "), d.country]
          .filter(function (x) { return x && String(x).trim(); });
        return "<p>" + lines.map(esc).join("<br>") + "</p>";
      },
      contact: function () {
        var o = [];
        if (d.email) o.push(esc(L.email) + ': <a href="mailto:' + esc(d.email) + '">' + esc(d.email) + "</a>");
        if (d.phone) o.push(esc(L.phone) + ": " + esc(d.phone));
        return o.length ? "<p>" + o.join("<br>") + "</p>" : "";
      },
      vat: function () { return d.vatId ? "<h2>" + esc(L.vatH) + "</h2><p>" + esc(L.vat) + ": " + esc(d.vatId) + "</p>" : ""; },
      extra: function () {
        var x = (d.extra || "").trim();
        return x ? x.split(/\n\s*\n/).map(function (p) { return "<p>" + esc(p.trim()).replace(/\n/g, "<br>") + "</p>"; }).join("") : "";
      }
    };
    $all(".js-imp").forEach(function (el) { var f = html[el.getAttribute("data-kind")]; if (f) el.innerHTML = f(); });
  }

  /* ---------- Nagyító ---------- */
  var lb = $("#lightbox"), lbImg = lb && $(".lb-stage img", lb), lastFocus = null;
  function showLB() {
    var p = state.lbList[state.lbIndex]; if (!p) return;
    lbImg.style.opacity = 0;
    var img = new Image();
    img.onload = function () { lbImg.src = img.src; lbImg.alt = titleOf(p); lbImg.style.opacity = 1; };
    img.src = src(p.image);
    var status = "";
    if (p.forSale) status = p.sold ? t("sold") : t("forSale") + (priceOf(p).note ? "" : " · " + priceOf(p).text);
    $(".lb-cap", lb).innerHTML = '<div class="t">' + esc(titleOf(p)) + '</div><div class="m">' + esc(metaOf(p)) + "</div>" +
      (status ? '<span class="s">' + esc(status) + "</span>" : "");
    $(".lb-count", lb).textContent = (state.lbIndex + 1) + " / " + state.lbList.length;
    // a következő kép előtöltése
    var n = state.lbList[(state.lbIndex + 1) % state.lbList.length]; if (n) { var pre = new Image(); pre.src = src(n.image); }
  }
  function openLB(i) {
    if (!lb) return;
    lastFocus = document.activeElement; state.lbIndex = i;
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add("open"); });
    document.body.classList.add("lb-lock"); showLB(); $(".lb-close", lb).focus();
  }
  function closeLB() {
    lb.classList.remove("open"); document.body.classList.remove("lb-lock");
    setTimeout(function () { lb.hidden = true; lbImg.removeAttribute("src"); }, 250);
    if (lastFocus) lastFocus.focus();
  }
  function step(d) { var n = state.lbList.length; state.lbIndex = (state.lbIndex + d + n) % n; showLB(); }
  if (lb) {
    $(".lb-close", lb).addEventListener("click", closeLB);
    $(".lb-prev", lb).addEventListener("click", function () { step(-1); });
    $(".lb-next", lb).addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) closeLB(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLB();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Tab") { // fókusz a nagyítón belül marad
        var f = $all("button", lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var sx = null, sy = null; // lapozás ujjal
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeLB();
      sx = sy = null;
    });
  }

  /* ---------- Beúszó animáció ---------- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -40px 0px" }) : null;
  function observeReveal() { $all(".reveal:not(.in)").forEach(function (el) { if (io) io.observe(el); else el.classList.add("in"); }); }

  /* ---------- Menü (mobil) ---------- */
  var toggle = $(".menu-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    var open = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  /* ---------- Indulás ---------- */
  state.lang = LANGS.indexOf(document.documentElement.lang) >= 0 ? document.documentElement.lang : "hu";
  applyLabels();
  observeReveal();
  var jobs = [getJSON(ROOT + "data/site.json").then(function (d) { state.site = d; }).catch(function () {})];
  if (page !== "home") jobs.push(getJSON(ROOT + "data/paintings.json").then(function (d) {
    state.paintings = (d && d.paintings) || [];
  }).catch(function () {
    var box = $(".js-gallery") || $(".js-sale");
    if (box) box.innerHTML = '<p class="empty" style="grid-column:1/-1">' + esc(t("loadError")) + "</p>";
    state.failed = true;
  }));
  if (page === "imprint" || page === "privacy") jobs.push(getJSON(ROOT + "data/impressum.json").then(renderImp).catch(function () {}));
  Promise.all(jobs).then(function () { if (!state.failed) { state.ready = true; render(); } else renderHome(); });
})();
