# F0 — Ayağa kaldır: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** agent-office fork'unu (firstbu-ofis) bu makinede derleyip FirstBU'yu ilk kat olarak açmak, bir Claude işçisinin terminalinde yazabildiğimizi ve FirstBU hook'larıyla ofis hook'larının birlikte çalıştığını kanıtlamak.

**Architecture:** Kod değişikliği yok. Mevcut `npm install` (client + server derler) ve `bin/agent-office.js` ile tek kat başlatılır. Doğrulama: başsız tarayıcı ekran görüntüsü + işçi durum geçişleri + FirstBU guard hook'unun bir işçide tetiklenmesi.

**Tech Stack:** Node 20+, Vite, Three.js, node-pty, Claude Code CLI.

**Spec:** `docs/superpowers/specs/2026-10-28-firstbu-dunya-design.md` (F0 bölümü)

## Global Constraints

- FirstBU reposunda izlenen hiçbir dosya değişmez (tasarım: "FirstBU'ya dokunmuyorum"). `.agent-office/` klasörü git'e girmemeli.
- `0101/`, `*.har`, `Orders (2).csv` okunmaz (FirstBU guard-sensitive).
- Ofis yalnızca `127.0.0.1`'de dinler.
- E2E testleri production'a gittiği için FirstBU'nun `npm run test:e2e` komutu çalıştırılmaz.

## Review Focus

1. FirstBU'da `.agent-office/` oluşunca `git status` kirlenmesi → `.git/info/exclude` ile gizlenmeli, izlenen dosya değişmemeli.
2. İlk açılış sihirbazı TTY yokken takılması → `--no-open` ve sihirbaz atlanabilir olmalı; takılırsa `agent-office setup` dışı yol not edilir.
3. FirstBU'nun `.claude/settings.json` hook'ları + ofisin `--settings` hook'ları: ikisi de çalışmalı (ofis durum alır, guard engeller).
4. Klasör "trust" edilmemişse FirstBU hook'ları hiç çalışmaz → işçi terminalinde trust ekranı görülürse kabul edilip not edilir.
5. Port 4600 doluysa → `--port` ile başka port.

---

### Task 1: Derleme ve testler

**Files:** yok (yalnızca `node_modules/`, `dist/`)

- [ ] **Step 1:** `npm install` → derleme hatasız biter (`dist/` oluşur).
- [ ] **Step 2:** `npm run typecheck` → çıkış 0.
- [ ] **Step 3:** `npm test` → tüm testler geçer (başarısız olan varsa adı ve hatası raporlanır, upstream durumu olarak).

### Task 2: FirstBU'yu kat olarak aç

- [ ] **Step 1:** `git -C /Users/mahmutkurnaz/firstbu status --porcelain` çıktısını kaydet (önce).
- [ ] **Step 2:** `node bin/agent-office.js /Users/mahmutkurnaz/firstbu --port 4600 --password dev --no-open` arka planda; günlükte dinleme satırı görülür.
- [ ] **Step 3:** Yerleşik tarayıcıda `http://127.0.0.1:4600` aç, `dev` ile gir, ekran görüntüsü al: 3D ofis görünür, kat adı FirstBU.
- [ ] **Step 4:** `git -C /Users/mahmutkurnaz/firstbu status --porcelain` tekrar → izlenen dosya değişmemiş; `.agent-office/` listede yoksa ya da exclude edilmişse geçer.

### Task 3: İşçi ve terminal

- [ ] **Step 1:** Boş bir masada E → Claude Code, Sonnet, effort medium ile işe al; prompt: `Sadece "merhaba" yaz ve dur.`
- [ ] **Step 2:** Durum `starting → working → done` geçişi panelde görülür; laptop ekranında terminal çıktısı görülür.
- [ ] **Step 3:** Terminali aç, `CLAUDE.md'nin ilk satırı ne?` yaz → cevap gelir, durum yeniden `working → done`.

### Task 4: Hook'lar birlikte

- [ ] **Step 1:** Aynı işçiye: `0101 klasöründeki dosyaları listele` → FirstBU `guard-sensitive.sh` engeller (terminalde engel mesajı), ofis durumu bozulmaz.
- [ ] **Step 2:** Sonuç tasarım belgesine F0 notu olarak yazılır (çalıştı / çalışmadı + neden).
- [ ] **Step 3:** İşçiyi eve gönder (X), ofisi durdur, FirstBU `git status` son kez kontrol.

## Sonraki plan

F1 (roller, `ordu.json`, Ekipler paneli, iş ver) planı F0 sonuçları alındıktan sonra `docs/superpowers/plans/2026-10-28-f1-roller-ekipler.md` olarak yazılır.
