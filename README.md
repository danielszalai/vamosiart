# vamosiart.hu – Vámosi Tamás weboldala

Egyszerű, adatbázis nélküli weboldal (HTML + CSS + JS) egy PHP-s admin felülettel a festmények feltöltéséhez.

## Felépítés

```
index.html          Főoldal (portré, aláírás, bemutatkozás, kapcsolat)
festmenyek.html     Galéria évszám szerint, kattintásra nagyítás
elado.html          Eladó művek (ár / ár helyett szöveg / „Eladva”)
assets/             Stílus, JavaScript, betűtípusok, zászlók, portré, aláírás
data/paintings.json A festmények adatai (az admin írja)
data/site.json      Főoldali szövegek, e-mail, Instagram (az admin írja)
uploads/            Feltöltött képek (+ thumbs/ a kisképek)
admin/              Admin felület (csak PHP-s tárhelyen működik)
```

## Előnézet GitHub Pagesen

A látogatói oldal GitHub Pagesen is ugyanúgy működik, mert csak a JSON fájlokat olvassa.
Az **admin felület ott nem fut**, mert a GitHub Pages nem futtat PHP-t. Az előnézethez a mintaképek látszanak.

> Helyi gépen dupla kattintással megnyitva a galéria üres maradhat, mert a böngésző `file://` címről nem tölti be a JSON-t.
> Helyi próbához indíts egy kis szervert a mappában: `php -S localhost:8000` vagy `python -m http.server`.

## Feltöltés az elin.hu tárhelyre

1. FTP-vel másold fel a mappa **teljes tartalmát** a webgyökérbe (`public_html` vagy `www`).
2. Állíts írási jogot (755, ha nem megy, 775) erre a négy mappára: `data/`, `uploads/`, `uploads/thumbs/`, `admin/`.
3. **Azonnal** nyisd meg a `https://vamosiart.hu/admin/` címet, és add meg a jelszót. Az első látogató állítja be, ezért ezt ne halaszd el!
4. Töröld a mintaképeket: az adminban egyenként, vagy FTP-n írd felül a `data/paintings.json` tartalmát erre: `{"paintings": []}`, és töröld az `uploads/minta-*.jpg` és `uploads/thumbs/minta-*.jpg` fájlokat.
5. Cseréld le a helyőrző képeket:
   - `assets/img/portre.jpg` – Tamás fotója (álló, kb. 4:5 arányú, 1000–1400 px széles)
   - `assets/img/alairas.png` – az aláírás, **átlátszó háttérrel**, sötét tintával

### ⚠️ Fontos az élesítés után

A `data/` és az `uploads/` mappát az élő oldalon az admin kezeli. **Később ne írd felül őket FTP-vel** (például egy GitHubról letöltött régebbi változattal), mert elvesznek a feltöltött festmények.
Kód módosításakor csak az `assets/`, az `admin/` és a `*.html` fájlokat töltsd fel.

## Admin használata (Tamásnak)

- **Új festmény:** kép kiválasztása (telefonos fotó is jó, magától kicsinyít), cím, évszám, méret, technika.
- **Eladó** pipa: ár, vagy ár helyett szöveg (pl. „Ár érdeklődésre”). Az **Eladva** pipával a kép „Eladva” felirattal marad az oldalon.
- **Fordítás:** az angol és a német cím nem kötelező. Ha üres, a magyar jelenik meg. A listából választott technikát magától lefordítja.
- **Szövegek** fül: bemutatkozás három nyelven, portréfestés szöveg, e-mail, Instagram link.
- Minden mentéskor a rendszer biztonsági másolatot készít az előző állapotról: `data/paintings.bak.json`.

## Elfelejtett jelszó

FTP-n töröld az `admin/jelszo.php` fájlt, majd nyisd meg az `/admin/` oldalt, és adj meg új jelszót.
