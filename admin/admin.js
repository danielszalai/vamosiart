/* Admin segéd: képelőnézet, automatikus kicsinyítés a böngészőben, fordítási tippek */
(function () {
  "use strict";
  /* Főoldali kép: előnézet + kicsinyítés */
  var homeForm = document.getElementById("homeForm");
  if (homeForm) {
    var hi = document.getElementById("homeInput"), hp = document.getElementById("homePreview");
    hi.addEventListener("change", function () { if (hi.files[0]) { hp.src = URL.createObjectURL(hi.files[0]); hp.hidden = false; } });
    homeForm.addEventListener("submit", function (e) {
      var f = hi.files && hi.files[0];
      if (!f || !window.createImageBitmap || !window.DataTransfer) return;
      e.preventDefault();
      createImageBitmap(f, { imageOrientation: "from-image" }).then(function (bmp) {
        var r = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
        c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          var dt = new DataTransfer(); dt.items.add(new File([b], "fokep.jpg", { type: "image/jpeg" }));
          hi.files = dt.files; homeForm.submit();
        }, "image/jpeg", 0.88);
      }).catch(function () { homeForm.submit(); });
    });
  }

  var form = document.getElementById("paintingForm");
  if (!form) return;

  var input = document.getElementById("imageInput");
  var preview = document.getElementById("preview");
  var drop = document.getElementById("drop");
  var status = document.getElementById("status");
  var saveBtn = document.getElementById("saveBtn");
  var forSale = document.getElementById("forSale");
  var saleFields = document.getElementById("saleFields");

  /* Eladó mezők ki/be */
  function syncSale() { saleFields.style.display = forSale.checked ? "" : "none"; }
  forSale.addEventListener("change", syncSale); syncSale();

  /* Előnézet */
  function showPreview(file) {
    if (!file) return;
    var url = URL.createObjectURL(file);
    preview.src = url; preview.hidden = false;
    drop.classList.add("has");
  }
  input.addEventListener("change", function () { showPreview(input.files[0]); });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) {
    var f = e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) {
      try { var dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; } catch (x) {}
      showPreview(f);
    }
  });

  /* Technika automatikus fordítása, ha a listából választ */
  var TECH = {
    "olaj, vászon": ["oil on canvas", "Öl auf Leinwand"],
    "akril, vászon": ["acrylic on canvas", "Acryl auf Leinwand"],
    "olaj, farost": ["oil on hardboard", "Öl auf Hartfaser"],
    "akril, farost": ["acrylic on hardboard", "Acryl auf Hartfaser"],
    "akvarell, papír": ["watercolour on paper", "Aquarell auf Papier"],
    "tus, papír": ["ink on paper", "Tusche auf Papier"],
    "pasztell, papír": ["pastel on paper", "Pastell auf Papier"],
    "vegyes technika": ["mixed media", "Mischtechnik"]
  };
  var th = document.getElementById("tech_hu"), te = document.getElementById("tech_en"), td = document.getElementById("tech_de");
  th.addEventListener("change", function () {
    var m = TECH[th.value.trim().toLowerCase()];
    if (m) { if (!te.value) te.value = m[0]; if (!td.value) td.value = m[1]; }
  });

  /* Kép kicsinyítése a böngészőben (nagy telefonos fotók miatt) */
  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(file); });
    }
    return new Promise(function (res, rej) {
      var img = new Image(); img.onload = function () { res(img); }; img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }
  function resize(bmp, max, q) {
    var w = bmp.width, h = bmp.height, r = Math.min(1, max / Math.max(w, h));
    var c = document.createElement("canvas");
    c.width = Math.round(w * r); c.height = Math.round(h * r);
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(function (res) { c.toBlob(res, "image/jpeg", q); });
  }

  form.addEventListener("submit", function (e) {
    if (!window.fetch || !window.FormData) return; // régi böngésző: sima beküldés
    e.preventDefault();
    if (!form.reportValidity()) return;
    saveBtn.disabled = true;
    var fd = new FormData(form);
    var file = input.files && input.files[0];
    var job = Promise.resolve();
    if (file) {
      status.textContent = "Kép előkészítése…";
      job = loadBitmap(file).then(function (bmp) {
        return Promise.all([resize(bmp, 2200, 0.88), resize(bmp, 900, 0.82)]);
      }).then(function (blobs) {
        var name = (file.name || "kep").replace(/\.[^.]+$/, "") + ".jpg";
        fd.set("image", blobs[0], name);
        fd.set("thumb", blobs[1], name);
      }).catch(function () { /* ha nem sikerül, az eredeti fájl megy fel */ });
    }
    job.then(function () {
      status.textContent = "Feltöltés…";
      return fetch(form.action, { method: "POST", body: fd, headers: { "X-Requested-With": "fetch" }, credentials: "same-origin" });
    }).then(function (r) {
      return r.json().catch(function () { throw new Error("A szerver váratlan választ adott (" + r.status + ")."); });
    }).then(function (d) {
      if (d.ok) { status.textContent = "Mentve ✓"; location.href = d.redirect || "index.php"; }
      else throw new Error(d.error || "Ismeretlen hiba");
    }).catch(function (err) {
      status.textContent = ""; saveBtn.disabled = false;
      alert("Nem sikerült menteni:\n" + err.message);
    });
  });
})();
