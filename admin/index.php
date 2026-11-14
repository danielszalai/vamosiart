<?php
/* =====================================================================
   Vámosi Tamás – egyszerű admin felület
   Festmények feltöltése, szerkesztése, törlése + főoldali szövegek.
   Adatbázis nem kell: minden a ../data/*.json fájlokba kerül.
   ===================================================================== */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
date_default_timezone_set('Europe/Budapest');

const ROOT      = __DIR__ . '/..';
const DATA_FILE = ROOT . '/data/paintings.json';
const SITE_FILE = ROOT . '/data/site.json';
const UPLOADS   = ROOT . '/uploads';
const PASS_FILE = __DIR__ . '/jelszo.php';
const MAX_UPLOAD = 25 * 1024 * 1024;

session_name('vamosi_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
  'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')]);
session_start();
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

/* ---------- segédfüggvények ---------- */
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function check_csrf(): void { if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) { http_response_code(400); exit('Lejárt az oldal. Frissítsd és próbáld újra.'); } }
function flash(string $msg, string $type = 'ok'): void { $_SESSION['flash'] = [$msg, $type]; }
function go(string $q = ''): void { header('Location: index.php' . ($q ? '?' . $q : '')); exit; }
function is_ajax(): bool { return ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch'; }
function json_out(array $d, int $code = 200): void { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg): void { if (is_ajax()) json_out(['ok' => false, 'error' => $msg], 400); flash($msg, 'err'); go($_SERVER['QUERY_STRING'] ?? ''); }

function read_json(string $file, $default) {
  if (!is_file($file)) return $default;
  $d = json_decode((string)file_get_contents($file), true);
  return is_array($d) ? $d : $default;
}
function write_json(string $file, array $data): void {
  $dir = dirname($file);
  if (!is_writable($dir)) fail('A "data" mappa nem írható a szerveren. (FTP-n állíts rá 755 vagy 775 jogot.)');
  $lock = fopen($dir . '/.lock', 'c');
  flock($lock, LOCK_EX);
  if (is_file($file)) @copy($file, preg_replace('/\.json$/', '.bak.json', $file)); // előző változat mentése
  $tmp = $file . '.tmp';
  file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
  rename($tmp, $file);
  flock($lock, LOCK_UN); fclose($lock);
}
function paintings(): array { $d = read_json(DATA_FILE, ['paintings' => []]); return $d['paintings'] ?? []; }
function save_paintings(array $list): void { write_json(DATA_FILE, ['paintings' => array_values($list)]); }
function find_index(array $list, string $id): int { foreach ($list as $i => $p) if (($p['id'] ?? '') === $id) return $i; return -1; }
function slug(string $s): string {
  $map = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ö'=>'o','ő'=>'o','ú'=>'u','ü'=>'u','ű'=>'u','ä'=>'a','ß'=>'ss'];
  $s = strtr(mb_strtolower($s, 'UTF-8'), $map);
  $s = preg_replace('/[^a-z0-9]+/', '-', $s);
  return trim(substr($s, 0, 40), '-') ?: 'festmeny';
}
function tri(string $prefix): array { // három nyelvű mező a POST-ból
  $o = [];
  foreach (['hu', 'en', 'de'] as $l) $o[$l] = trim((string)($_POST[$prefix . '_' . $l] ?? ''));
  return $o;
}

/* Feltöltött kép mentése. Ha a böngésző már kicsinyítette, azt menti;
   ha nem, és van GD a szerveren, itt kicsinyít. */
function save_image(array $file, string $base, int $maxSide): ?array {
  if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
  if ($file['error'] !== UPLOAD_ERR_OK) {
    $msg = in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 'A kép túl nagy a szervernek.' : 'A kép feltöltése nem sikerült (hibakód: ' . $file['error'] . ').';
    fail($msg);
  }
  if ($file['size'] > MAX_UPLOAD) fail('A kép túl nagy (max. 25 MB).');
  $info = @getimagesize($file['tmp_name']);
  $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
  if (!$info || !isset($types[$info[2]])) fail('Csak JPG, PNG vagy WEBP képet lehet feltölteni.');
  [$w, $h] = $info;
  $ext = $types[$info[2]];
  $dest = $base . '.' . $ext;

  if (max($w, $h) > $maxSide && function_exists('imagecreatetruecolor')) {
    $src = $ext === 'jpg' ? @imagecreatefromjpeg($file['tmp_name']) : ($ext === 'png' ? @imagecreatefrompng($file['tmp_name']) : @imagecreatefromwebp($file['tmp_name']));
    if ($src) {
      if ($ext === 'jpg' && function_exists('exif_read_data')) { // telefonos fotók elforgatása
        $o = (int)(@exif_read_data($file['tmp_name'])['Orientation'] ?? 1);
        if ($o === 3) $src = imagerotate($src, 180, 0);
        if ($o === 6) $src = imagerotate($src, -90, 0);
        if ($o === 8) $src = imagerotate($src, 90, 0);
        $w = imagesx($src); $h = imagesy($src);
      }
      $r = $maxSide / max($w, $h); $nw = (int)round($w * $r); $nh = (int)round($h * $r);
      $dst = imagecreatetruecolor($nw, $nh);
      imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
      imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
      $dest = $base . '.jpg';
      imagejpeg($dst, $dest, 86);
      return ['file' => basename($dest), 'w' => $nw, 'h' => $nh];
    }
  }
  if (!move_uploaded_file($file['tmp_name'], $dest)) fail('Nem sikerült menteni a képet. Az "uploads" mappa írható?');
  @chmod($dest, 0644);
  return ['file' => basename($dest), 'w' => $w, 'h' => $h];
}
function delete_files(array $p): void {
  foreach (['image', 'thumb'] as $k) {
    if (!empty($p[$k]) && strpos($p[$k], 'uploads/') === 0) {
      $f = ROOT . '/' . $p[$k];
      if (is_file($f) && realpath(dirname($f)) && strpos(realpath($f), realpath(UPLOADS)) === 0) @unlink($f);
    }
  }
}

/* ---------- belépés ---------- */
$action = $_GET['a'] ?? 'list';
$hasPass = is_file(PASS_FILE);

if (!$hasPass && $action === 'setup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  check_csrf();
  $p1 = (string)($_POST['p1'] ?? ''); $p2 = (string)($_POST['p2'] ?? '');
  if (mb_strlen($p1) < 8) { flash('A jelszó legalább 8 karakter legyen.', 'err'); go(); }
  if ($p1 !== $p2) { flash('A két jelszó nem egyezik.', 'err'); go(); }
  if (!is_writable(__DIR__)) { flash('Az "admin" mappa nem írható, így a jelszót nem tudom elmenteni.', 'err'); go(); }
  file_put_contents(PASS_FILE, "<?php return " . var_export(password_hash($p1, PASSWORD_DEFAULT), true) . ";\n");
  @chmod(PASS_FILE, 0600);
  session_regenerate_id(true); $_SESSION['ok'] = true;
  flash('Jelszó elmentve. Üdv az admin felületen!'); go();
}
if ($hasPass && $action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  check_csrf();
  $tries = $_SESSION['tries'] ?? 0;
  if ($tries >= 5 && time() - ($_SESSION['last_try'] ?? 0) < 300) { flash('Túl sok próbálkozás. Várj 5 percet.', 'err'); go(); }
  $hash = require PASS_FILE;
  if (password_verify((string)($_POST['pass'] ?? ''), (string)$hash)) {
    session_regenerate_id(true); $_SESSION['ok'] = true; $_SESSION['tries'] = 0; go();
  }
  sleep(1);
  $_SESSION['tries'] = $tries + 1; $_SESSION['last_try'] = time();
  flash('Hibás jelszó.', 'err'); go();
}
if ($action === 'logout') { $_SESSION = []; session_destroy(); go(); }

$logged = !empty($_SESSION['ok']) && $hasPass;

/* ---------- műveletek (csak belépve) ---------- */
if ($logged && $_SERVER['REQUEST_METHOD'] === 'POST') {
  check_csrf();
  if ($action === 'save') {
    $list = paintings();
    $id = (string)($_POST['id'] ?? '');
    $idx = $id !== '' ? find_index($list, $id) : -1;
    $p = $idx >= 0 ? $list[$idx] : ['id' => 'p' . date('ymdHis') . bin2hex(random_bytes(2)), 'added' => date('c')];

    $title = tri('title');
    if ($title['hu'] === '') fail('A magyar cím kötelező.');
    $year = (int)($_POST['year'] ?? 0);
    if ($year < 1950 || $year > (int)date('Y') + 1) fail('Adj meg egy érvényes évszámot.');

    $base = UPLOADS . '/' . slug($title['hu']) . '-' . substr(bin2hex(random_bytes(3)), 0, 5);
    $img = save_image($_FILES['image'] ?? [], $base, 2200);
    if (!$img && $idx < 0) fail('Válassz ki egy képet a festményről.');
    if ($img) {
      if (!is_dir(UPLOADS . '/thumbs')) @mkdir(UPLOADS . '/thumbs', 0755, true);
      $th = save_image($_FILES['thumb'] ?? [], UPLOADS . '/thumbs/' . basename($base), 900);
      if ($idx >= 0) delete_files($p); // régi kép törlése cserénél
      $p['image'] = 'uploads/' . $img['file'];
      $p['thumb'] = $th ? 'uploads/thumbs/' . $th['file'] : $p['image'];
      $p['width'] = $img['w']; $p['height'] = $img['h'];
    }
    $p['year'] = $year;
    $p['title'] = $title;
    $p['size'] = trim((string)($_POST['size'] ?? ''));
    $p['technique'] = tri('technique');
    $p['forSale'] = !empty($_POST['forSale']);
    $p['sold'] = $p['forSale'] && !empty($_POST['sold']);
    $p['price'] = trim((string)($_POST['price'] ?? ''));
    $p['priceNote'] = tri('priceNote');

    if ($idx >= 0) $list[$idx] = $p; else $list[] = $p;
    save_paintings($list);
    flash($idx >= 0 ? 'Módosítások elmentve.' : 'Az új festmény felkerült az oldalra.');
    if (is_ajax()) json_out(['ok' => true, 'redirect' => 'index.php']);
    go();
  }
  if ($action === 'delete') {
    $list = paintings();
    $idx = find_index($list, (string)($_POST['id'] ?? ''));
    if ($idx >= 0) { delete_files($list[$idx]); array_splice($list, $idx, 1); save_paintings($list); flash('Festmény törölve.'); }
    go();
  }
  if ($action === 'texts') {
    $site = read_json(SITE_FILE, []);
    $email = trim((string)($_POST['email'] ?? ''));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Az e-mail-cím formátuma nem jó.');
    $ig = trim((string)($_POST['instagram'] ?? ''));
    if ($ig !== '' && !preg_match('~^https?://~i', $ig)) $ig = 'https://' . $ig;
    $site['email'] = $email; $site['instagram'] = $ig;
    $site['intro'] = tri('intro'); $site['commission'] = tri('commission');
    write_json(SITE_FILE, $site);
    flash('Szövegek elmentve.'); go('a=texts');
  }
  if ($action === 'password') {
    $hash = require PASS_FILE;
    if (!password_verify((string)($_POST['old'] ?? ''), (string)$hash)) { flash('A jelenlegi jelszó nem jó.', 'err'); go('a=password'); }
    $p1 = (string)($_POST['p1'] ?? '');
    if (mb_strlen($p1) < 8 || $p1 !== ($_POST['p2'] ?? '')) { flash('Az új jelszó legalább 8 karakter legyen, és a kettő egyezzen.', 'err'); go('a=password'); }
    file_put_contents(PASS_FILE, "<?php return " . var_export(password_hash($p1, PASSWORD_DEFAULT), true) . ";\n");
    flash('Jelszó megváltoztatva.'); go();
  }
}

/* ---------- megjelenítés ---------- */
$flash = $_SESSION['flash'] ?? null; unset($_SESSION['flash']);
$uploadLimit = ini_get('upload_max_filesize');
?><!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Admin – Vámosi Tamás</title>
<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="admin.css?v=1">
</head>
<body>
<header class="top">
  <a class="brand" href="index.php">Vámosi Tamás <small>admin</small></a>
  <?php if ($logged): ?>
  <nav>
    <a href="index.php" class="<?= in_array($action, ['list', 'edit'], true) ? 'on' : '' ?>">Festmények</a>
    <a href="index.php?a=texts" class="<?= $action === 'texts' ? 'on' : '' ?>">Szövegek</a>
    <a href="../index.html" target="_blank">Oldal megnyitása ↗</a>
    <a href="index.php?a=password" class="<?= $action === 'password' ? 'on' : '' ?>">Jelszó</a>
    <a href="index.php?a=logout">Kilépés</a>
  </nav>
  <?php endif; ?>
</header>
<main>
<?php if ($flash): ?><div class="flash <?= h($flash[1]) ?>"><?= h($flash[0]) ?></div><?php endif; ?>

<?php if (!$hasPass): ?>
  <section class="box narrow">
    <h1>Első belépés</h1>
    <p>Adj meg egy jelszót az admin felülethez. Ezzel fogsz a jövőben belépni.</p>
    <form method="post" action="index.php?a=setup">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>">
      <label>Jelszó (legalább 8 karakter)<input type="password" name="p1" required minlength="8" autocomplete="new-password"></label>
      <label>Jelszó még egyszer<input type="password" name="p2" required minlength="8" autocomplete="new-password"></label>
      <button class="btn primary">Jelszó mentése</button>
    </form>
  </section>

<?php elseif (!$logged): ?>
  <section class="box narrow">
    <h1>Belépés</h1>
    <form method="post" action="index.php?a=login">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>">
      <label>Jelszó<input type="password" name="pass" required autofocus autocomplete="current-password"></label>
      <button class="btn primary">Belépés</button>
    </form>
  </section>

<?php elseif ($action === 'edit'):
  $list = paintings();
  $id = (string)($_GET['id'] ?? '');
  $idx = $id !== '' ? find_index($list, $id) : -1;
  $p = $idx >= 0 ? $list[$idx] : ['year' => (int)date('Y'), 'title' => [], 'technique' => [], 'priceNote' => [], 'forSale' => false, 'sold' => false];
  $v = function ($k, $l = null) use ($p) { return $l ? ($p[$k][$l] ?? '') : ($p[$k] ?? ''); };
?>
  <section class="box">
    <p class="back"><a href="index.php">← Vissza a listához</a></p>
    <h1><?= $idx >= 0 ? 'Festmény szerkesztése' : 'Új festmény' ?></h1>
    <form method="post" action="index.php?a=save" enctype="multipart/form-data" id="paintingForm">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>">
      <input type="hidden" name="id" value="<?= h($p['id'] ?? '') ?>">

      <div class="grid2">
        <div>
          <label class="drop" id="drop">
            <span class="preview"><img id="preview" src="<?= !empty($p['thumb']) ? '../' . h($p['thumb']) : '' ?>" alt="" <?= empty($p['thumb']) ? 'hidden' : '' ?>></span>
            <span class="drop-txt"><?= $idx >= 0 ? 'Kép cseréje: kattints vagy húzd ide' : 'Kattints ide a kép kiválasztásához<br><small>(vagy húzd ide a fájlt)</small>' ?></span>
            <input type="file" name="image" id="imageInput" accept="image/jpeg,image/png,image/webp" <?= $idx < 0 ? 'required' : '' ?>>
          </label>
          <p class="hint">Telefonnal fotózott kép is jó, a rendszer automatikusan kicsinyíti.</p>
        </div>
        <div>
          <label>Cím <b>*</b><input name="title_hu" value="<?= h($v('title', 'hu')) ?>" required placeholder="pl. Hajnali áramlás"></label>
          <div class="row">
            <label>Évszám <b>*</b><input name="year" type="number" min="1950" max="<?= (int)date('Y') + 1 ?>" value="<?= h($v('year')) ?>" required></label>
            <label>Méret<input name="size" value="<?= h($v('size')) ?>" placeholder="pl. 50 × 70 cm"></label>
          </div>
          <label>Technika<input name="technique_hu" id="tech_hu" list="techs" value="<?= h($v('technique', 'hu')) ?>" placeholder="pl. olaj, vászon"></label>
          <datalist id="techs"><option value="olaj, vászon"><option value="akril, vászon"><option value="olaj, farost"><option value="akril, farost"><option value="akvarell, papír"><option value="tus, papír"><option value="pasztell, papír"><option value="vegyes technika"></datalist>

          <fieldset class="sale">
            <label class="check"><input type="checkbox" name="forSale" id="forSale" value="1" <?= !empty($p['forSale']) ? 'checked' : '' ?>> Eladó</label>
            <div id="saleFields">
              <label>Ár<input name="price" value="<?= h($v('price')) ?>" placeholder="pl. 150 000 Ft"></label>
              <label>Ár helyett megjelenő szöveg<input name="priceNote_hu" value="<?= h($v('priceNote', 'hu')) ?>" placeholder="pl. Ár érdeklődésre"></label>
              <p class="hint">Ha az ár üres, ez a szöveg látszik. Ha ez is üres: „Ár érdeklődésre”.</p>
              <label class="check"><input type="checkbox" name="sold" value="1" <?= !empty($p['sold']) ? 'checked' : '' ?>> Eladva <small>(„Eladva” felirattal az oldalon marad)</small></label>
            </div>
          </fieldset>
        </div>
      </div>

      <details class="tr" <?= ($v('title', 'en') . $v('title', 'de')) !== '' ? 'open' : '' ?>>
        <summary>Angol és német fordítás <small>(nem kötelező – ha üres, a magyar szöveg jelenik meg)</small></summary>
        <div class="grid2">
          <div>
            <h3>🇬🇧 Angol</h3>
            <label>Cím<input name="title_en" value="<?= h($v('title', 'en')) ?>"></label>
            <label>Technika<input name="technique_en" id="tech_en" value="<?= h($v('technique', 'en')) ?>"></label>
            <label>Ár helyett szöveg<input name="priceNote_en" value="<?= h($v('priceNote', 'en')) ?>" placeholder="Price on request"></label>
          </div>
          <div>
            <h3>🇩🇪 Német</h3>
            <label>Cím<input name="title_de" value="<?= h($v('title', 'de')) ?>"></label>
            <label>Technika<input name="technique_de" id="tech_de" value="<?= h($v('technique', 'de')) ?>"></label>
            <label>Ár helyett szöveg<input name="priceNote_de" value="<?= h($v('priceNote', 'de')) ?>" placeholder="Preis auf Anfrage"></label>
          </div>
        </div>
      </details>

      <div class="actions">
        <button class="btn primary" id="saveBtn">Mentés</button>
        <a class="btn" href="index.php">Mégse</a>
        <span class="status" id="status"></span>
      </div>
    </form>
  </section>

<?php elseif ($action === 'texts'):
  $site = read_json(SITE_FILE, []);
  $t = function ($k, $l) use ($site) { return $site[$k][$l] ?? ''; };
?>
  <section class="box">
    <h1>Főoldali szövegek</h1>
    <form method="post" action="index.php?a=texts">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>">
      <div class="grid2">
        <label>E-mail-cím (ide írhatnak a látogatók)<input type="email" name="email" value="<?= h($site['email'] ?? '') ?>"></label>
        <label>Instagram link<input name="instagram" value="<?= h($site['instagram'] ?? '') ?>" placeholder="https://www.instagram.com/..."></label>
      </div>
      <h2>Bemutatkozás</h2>
      <p class="hint">Új bekezdéshez hagyj egy üres sort.</p>
      <div class="grid3">
        <label>🇭🇺 Magyar<textarea name="intro_hu" rows="10"><?= h($t('intro', 'hu')) ?></textarea></label>
        <label>🇬🇧 Angol<textarea name="intro_en" rows="10"><?= h($t('intro', 'en')) ?></textarea></label>
        <label>🇩🇪 Német<textarea name="intro_de" rows="10"><?= h($t('intro', 'de')) ?></textarea></label>
      </div>
      <h2>Portréfestés szöveg</h2>
      <div class="grid3">
        <label>🇭🇺 Magyar<textarea name="commission_hu" rows="4"><?= h($t('commission', 'hu')) ?></textarea></label>
        <label>🇬🇧 Angol<textarea name="commission_en" rows="4"><?= h($t('commission', 'en')) ?></textarea></label>
        <label>🇩🇪 Német<textarea name="commission_de" rows="4"><?= h($t('commission', 'de')) ?></textarea></label>
      </div>
      <div class="actions"><button class="btn primary">Mentés</button></div>
    </form>
  </section>

<?php elseif ($action === 'password'): ?>
  <section class="box narrow">
    <h1>Jelszó módosítása</h1>
    <form method="post" action="index.php?a=password">
      <input type="hidden" name="csrf" value="<?= h(csrf()) ?>">
      <label>Jelenlegi jelszó<input type="password" name="old" required autocomplete="current-password"></label>
      <label>Új jelszó (legalább 8 karakter)<input type="password" name="p1" required minlength="8" autocomplete="new-password"></label>
      <label>Új jelszó még egyszer<input type="password" name="p2" required minlength="8" autocomplete="new-password"></label>
      <button class="btn primary">Mentés</button>
    </form>
  </section>

<?php else:
  $list = paintings();
  usort($list, function ($a, $b) { return ($b['year'] <=> $a['year']) ?: strcmp((string)($b['added'] ?? ''), (string)($a['added'] ?? '')); });
  $forSale = count(array_filter($list, function ($p) { return !empty($p['forSale']) && empty($p['sold']); }));
?>
  <section class="box">
    <div class="list-head">
      <div>
        <h1>Festmények</h1>
        <p class="hint"><?= count($list) ?> festmény az oldalon, ebből <?= $forSale ?> eladó.</p>
      </div>
      <a class="btn primary big" href="index.php?a=edit">+ Új festmény</a>
    </div>
    <?php if (!$list): ?><p class="empty">Még nincs festmény. Kattints az „Új festmény” gombra!</p><?php endif; ?>
    <ul class="plist">
      <?php foreach ($list as $p): ?>
      <li>
        <a class="thumb" href="index.php?a=edit&amp;id=<?= h(urlencode($p['id'])) ?>"><img src="../<?= h($p['thumb'] ?? $p['image'] ?? '') ?>" alt="" loading="lazy"></a>
        <div class="info">
          <strong><?= h($p['title']['hu'] ?? '') ?></strong>
          <span><?= h(implode(' · ', array_filter([$p['year'] ?? '', $p['size'] ?? '', $p['technique']['hu'] ?? '']))) ?></span>
          <span class="tags">
            <?php if (!empty($p['sold'])): ?><em class="tag sold">Eladva</em>
            <?php elseif (!empty($p['forSale'])): ?><em class="tag sale">Eladó<?= !empty($p['price']) ? ' · ' . h($p['price']) : '' ?></em><?php endif; ?>
            <?php if (empty($p['title']['en']) || empty($p['title']['de'])): ?><em class="tag tr">fordítás hiányzik</em><?php endif; ?>
          </span>
        </div>
        <div class="ops">
          <a class="btn" href="index.php?a=edit&amp;id=<?= h(urlencode($p['id'])) ?>">Szerkesztés</a>
          <form method="post" action="index.php?a=delete" onsubmit="return confirm(<?= h(json_encode('Biztosan törlöd: ' . ($p['title']['hu'] ?? '') . '?', JSON_UNESCAPED_UNICODE)) ?>);">
            <input type="hidden" name="csrf" value="<?= h(csrf()) ?>"><input type="hidden" name="id" value="<?= h($p['id']) ?>">
            <button class="btn danger">Törlés</button>
          </form>
        </div>
      </li>
      <?php endforeach; ?>
    </ul>
  </section>
<?php endif; ?>
</main>
<script src="admin.js?v=1"></script>
</body>
</html>
