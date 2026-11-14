# vamosiart.hu – Vámosi Tamás weboldala

Egyszerű, adatbázis nélküli weboldal (HTML + CSS + JS) egy PHP-s admin felülettel a festmények feltöltéséhez.

## Felépítés

```
index.html          Főoldal (festmény, aláírás, bemutatkozás, kapcsolat)   – magyar
festmenyek.html     Galéria évszám szerint, kattintásra nagyítás           – magyar
elado.html          Eladó művek (ár / ár helyett szöveg / „Eladva”)         – magyar
en/                 index.html, paintings.html, for-sale.html               – angol
de/                 index.html, gemaelde.html, zu-verkaufen.html            – német (Selm és környéke)
robots.txt, sitemap.xml   keresőknek
assets/             Stílus, JavaScript, betűtípusok, zászlók, portré, aláírás
data/paintings.json A festmények adatai (az admin írja)
data/site.json      Főoldali szövegek, e-mail, Instagram (az admin írja)
uploads/            Feltöltött képek (+ thumbs/ a kisképek)
admin/              Admin felület (csak PHP-s tárhelyen működik)
```

## Két csomag

- `vamosiart-ELES.zip` → az elin tárhelyre. Üres festménylistával indul, a festményeket Tamás tölti fel az adminban.
- `vamosiart-ELONEZET.zip` → GitHubra, csak megtekintésre. 12 mintakép van benne, és tiltja a Google-indexelést
  (`noindex`), hogy ne versenyezzen az éles oldallal.

## SEO

- Mindhárom nyelv saját címen él (`/`, `/en/`, `/de/`), saját címmel, leírással, `hreflang` összerendeléssel,
  Open Graph adatokkal (megosztási előnézet) és schema.org adatokkal.
- A német oldalak Selmet és a környező településeket is megnevezik (címben, leírásban, szövegben, strukturált adatban).
- Élesítés után a `sitemap.xml`-t a Google Search Console-ban kell beküldeni (lásd az élesítési útmutatót).
- A fix szövegek (menük, címek, meta-leírások) a HTML-ben vannak; a bemutatkozást és a festményeket az admin kezeli.

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
5. Az aláírás és a főoldali festmény az adminban cserélhető (Főoldal menü). Az aláírásról elég egy telefonos fotó
   fehér papíron: a papír hátterét a rendszer feltöltéskor átlátszóvá teszi és körbevágja.
   (FTP-n is lecserélhető: `assets/img/alairas.png`, átlátszó háttérrel.)

### ⚠️ Fontos az élesítés után

A `data/` és az `uploads/` mappát az élő oldalon az admin kezeli. **Később ne írd felül őket FTP-vel** (például egy GitHubról letöltött régebbi változattal), mert elvesznek a feltöltött festmények.
Kód módosításakor csak az `assets/`, az `admin/` és a `*.html` fájlokat töltsd fel.

## Biztonság – élesítés előtt kötelező

1. Az új tárhelyre **csak ezt a csomagot** töltsd fel, a régi WordPress-mentést (Duplicator) semmiképp.
2. **Kapcsold be az SSL-t** (https) az elin ügyfélkapuban, majd a gyökér `.htaccess`-ben vedd ki a `#` jeleket
   a „HTTPS kényszerítése” résznél. Az admin piros figyelmeztetést mutat, amíg nem https-en fut.
3. Az admin jelszavát **azonnal** állítsd be a feltöltés után, legalább 12 karakterrel, máshol nem használt jelszóval.
4. A tárhelyen a PHP verzió legyen 8.1 vagy újabb (ügyfélkapuban állítható).

Az admin védelmei: jelszó erős titkosítással tárolva (bcrypt), IP-címenkénti tiltás 5 hibás próbálkozás után 15 percre,
kiléptetés 2 óra tétlenség után, CSRF-védelem minden űrlapon, szigorú CSP fejléc, a feltöltött fájlok csak képek lehetnek
(tartalom alapján ellenőrizve, a fájlnevet a rendszer adja), és az `uploads/` mappában semmilyen kód nem futtatható.

## Admin használata (Tamásnak)

- **Új festmény:** kép kiválasztása (telefonos fotó is jó, magától kicsinyít), cím, évszám, méret, technika.
- **Eladó** pipa: ár, vagy ár helyett szöveg (pl. „Ár érdeklődésre”). Az **Eladva** pipával a kép „Eladva” felirattal marad az oldalon.
- **Fordítás:** az angol és a német cím nem kötelező. Ha üres, a magyar jelenik meg. A listából választott technikát magától lefordítja.
- **Főoldal** menü: főoldali kép, aláírás, bemutatkozás három nyelven, portréfestés szöveg, e-mail, Instagram link.
- **Sorrend:** a Festmények oldalon növekvő évszám szerint (legrégebbi elöl), éven belül feltöltési sorrendben.
- Részletes, Tamásnak szóló kezelési útmutató: külön dokumentumban.
- Minden mentéskor a rendszer biztonsági másolatot készít az előző állapotról: `data/paintings.bak.json`.

## Elfelejtett jelszó

FTP-n töröld az `admin/jelszo.php` fájlt, majd nyisd meg az `/admin/` oldalt, és adj meg új jelszót.
