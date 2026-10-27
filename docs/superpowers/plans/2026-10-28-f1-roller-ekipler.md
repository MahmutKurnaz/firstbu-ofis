# F1 — Roller ve Ekipler: Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Her projenin `ordu.json`'ından (yoksa `.claude/agents/*.md`'den) ekip/rol yapısını okuyup, rolleri `claude --agent <rol>` ile işe alan, durumlarını ve raporlarını gösteren bir **Ekipler paneli** eklemek.

**Architecture:** Saf kod (`src/shared/ordu.ts`: tipler, ayrıştırma, türetme, prompt oluşturma), sunucu modülü (`src/server/ordu/`: dosya okuma, rapor okuma, işe alma), yeni WS alanı (`protocol/ordu.ts` + `ws/handlers/ordu.ts`), istemci dilimi (`state/slices/ordu.ts`) ve özellik klasörü (`features/ordu/`). İşçiye iki alan eklenir: `role` (ordu rol adı) ve `agentFile` (`--agent` değeri). Rol durumu istemcide, mağazadaki işçilerden `role` ile eşleştirilerek hesaplanır. Sunucu yalnızca yapılandırma ve raporları yollar.

**Tech Stack:** TypeScript, Node test runner (`node --import tsx --test`), düz DOM (`h()`), WebSocket.

**Spec:** `docs/superpowers/specs/2026-10-28-firstbu-dunya-design.md` (F1, "Genel yapı: ajan ordusu", "Ekip modelinin ayrıntıları")

## Global Constraints

- Her dosya ≤ 600 satır (`tests/size.test.ts`). `workers/manager.ts` ve `world/character/worker.ts`'e yalnızca birkaç satır.
- Yeni özellik kayıt listelerine bir satırla bağlanır. `main.ts`, `server.ts`, `protocol.ts`, store'a yalnızca kayıt satırı (`docs/code-layout.md`, `AGENTS.md`).
- Her modal sağ üstte ✕ taşır. ✕/Esc ile kapanınca oyuncu doğrudan mouse-look'a döner.
- Arayüz metinleri **Türkçe**.
- FirstBU'ya özgü hiçbir şey koda gömülmez. FirstBU yapısı `ordu/sablonlar/yazilim.json`'da durur.
- FirstBU'nun izlenen dosyalarına dokunulmaz. FirstBU'nun `ordu.json`'ı `<firstbu>/.agent-office/ordu.json`'a yazılır (git exclude'da).
- Doğrulama: `npm run typecheck`, `npm test`, `npm run build` + başsız tarayıcı ekran görüntüsü.

## Review Focus

1. **Bozuk `ordu.json`** (JSON hatası, bilinmeyen alan, aynı rol iki kez) → panel çökmemeli. Hata mesajı Türkçe görünür ve türetilmiş yapıya düşülür. Test: `parseOrdu` hata durumları + `loadOrdu` yedek davranışı (Task 2).
2. **Rol dosyası yok** (`agent` adı verilmiş ama `.claude/agents/<ad>.md` yok) → işe alma `--agent` olmadan, uyarıyla yapılır, sessizce yanlış rolle başlamaz. Test: Task 4 `hireRole` uyarı yolu.
3. **Rolün masası dolu / hiç boş masa yok** → anlaşılır Türkçe hata, başka rolün masasına oturmaz. Test: Task 4.
4. **Aynı rol zaten çalışıyor** → ikinci kez işe alma yerine "zaten masasında" hatası. Panel "İş ver"e yönlendirir. Test: Task 4.
5. **Rapor klasörü yok ya da dev dosya** → okuma sınırlı (ilk 4 KB), eksik klasörde boş liste. Test: Task 3.

---

### Task 1: Git testini dile bağımsız yap

**Files:**
- Modify: `tests/worktrees.test.ts` (dosyanın başı)

- [ ] **Step 1:** Varsayılan (Türkçe) yerelde `node --import tsx --import=#tests/css --test tests/worktrees.test.ts` → 1 fail (F0'daki).
- [ ] **Step 2:** Dosyanın en başına, testlerin başlattığı git süreçleri için `process.env.LC_ALL = 'C';` ekle. Bir satırlık yorumla: hata metni İngilizce git çıktısıyla eşleşiyor.
- [ ] **Step 3:** Aynı komut → 7 pass.
- [ ] **Step 4:** Commit `test: worktrees testini git dilinden bağımsız yap`.

### Task 2: Ordu yapılandırması (saf kod + dosya okuma)

**Files:**
- Create: `src/shared/ordu.ts`, `src/server/ordu/config.ts`, `ordu/sablonlar/yazilim.json`, `ordu/roller/lead.md`
- Test: `tests/ordu.test.ts`

**Interfaces:**
- Produces (`src/shared/ordu.ts`):
  ```ts
  export interface OrduRole { name: string; title?: string; agent?: string; character?: string; model?: string; effort?: AgentEffort; brief?: string; prompt?: string; desk?: string; resident?: boolean }
  export interface OrduTeam { id: string; name: string; color: string; roles: OrduRole[] }
  export interface OrduOffice { id: string; name: string; teams: OrduTeam[] }
  export interface OrduConfig { version: 1; reportDir?: string; offices: OrduOffice[] }
  export interface AgentFile { name: string; description?: string; model?: string; effort?: string }
  export function parseAgentFrontmatter(md: string): AgentFile | null
  export function parseOrdu(raw: unknown): OrduConfig | string   // string = Türkçe hata
  export function deriveOrdu(agents: AgentFile[]): OrduConfig    // tek ofis "Ofis", tek ekip "Ekip", renk #7c8cff
  export function findRole(c: OrduConfig, name: string): { office: OrduOffice; team: OrduTeam; role: OrduRole } | undefined
  export function allRoles(c: OrduConfig): OrduRole[]
  ```
- Produces (`src/server/ordu/config.ts`):
  ```ts
  export interface LoadedOrdu { config: OrduConfig; source: 'file' | 'derived' | 'none'; error?: string; agents: string[] }
  export function loadOrdu(projectDir: string, dataDir: string): LoadedOrdu  // dataDir = <proje>/.agent-office
  ```

- [ ] **Step 1: Failing testler** (`tests/ordu.test.ts`):
  - `parseAgentFrontmatter('---\nname: be-lead\ndescription: Backend\nmodel: sonnet\neffort: xhigh\n---\nGövde')` → `{ name:'be-lead', description:'Backend', model:'sonnet', effort:'xhigh' }`; frontmatter'sız metin → `null`.
  - `parseOrdu({version:1, offices:[{id:'o',name:'O',teams:[{id:'t',name:'T',color:'#fff',roles:[{name:'a'},{name:'a'}]}]}]})` → `'"a" rolü iki kez tanımlı'`.
  - `parseOrdu('x')` → `'ordu.json bir nesne olmalı'`; `parseOrdu({version:2})` → `'Desteklenen sürüm: 1'`; renk `#xyz` → `'"t" ekibinin rengi #rrggbb olmalı'`; `effort:'ultra'` → `'"a" rolünün eforu low, medium, high, xhigh, max olmalı'`.
  - `deriveOrdu([{name:'scout-be'},{name:'verify-be'}])` → 1 ofis, 1 ekip, roller `['scout-be','verify-be']`, her birinde `agent` = `name`.
  - `findRole(cfg,'verify-be')?.team.id` doğru. Yoksa `undefined`.
  - `loadOrdu`: geçici klasörde (a) `.agent-office/ordu.json` geçerli → `source:'file'`; (b) bozuk JSON + iki `.claude/agents/*.md` → `source:'derived'`, `error` `'ordu.json okunamadı'` ile başlar; (c) hiçbiri → `source:'none'`, `offices: []`; `agents` listesi `.claude/agents` dosya adlarıdır.
  - `ordu/sablonlar/yazilim.json` `parseOrdu`'dan geçer, 7 ekip ve 14+1 rol içerir (lead dahil).
- [ ] **Step 2:** `node --import tsx --import=#tests/css --test tests/ordu.test.ts` → FAIL (modül yok).
- [ ] **Step 3:** `src/shared/ordu.ts`'i yaz. Frontmatter: ilk `---` blokundaki `anahtar: değer` satırları, YAML kütüphanesi yok. Doğrulama hataları Türkçe ve testteki metinlerle birebir. Bilinmeyen alanlar yok sayılır.
- [ ] **Step 4:** `src/server/ordu/config.ts`'i yaz (`readFileSync`, dosya başına 256 KB sınırı, `.claude/agents` en çok 64 dosya).
- [ ] **Step 5:** `ordu/sablonlar/yazilim.json`: tasarımdaki bölge tablosu (Kafe meydanı: lead+prompt-refiner; Keşif; Tasarım stüdyosu; Mühendislik; Hata laboratuvarı; Test laboratuvarı; Güvenlik merkezi), karakter tablosundaki hayvan anahtarları (`aslan`, `kizil-panda`, `mirket`, …), ekip renkleri. `reportDir: ".claude/work"`. `lead`: `agent` yok, `model:"opus"`, `effort:"high"`, `brief:"ordu/roller/lead.md"`, `resident:true`.
- [ ] **Step 6:** `ordu/roller/lead.md`: FirstBU'nun `docs/AGENT_TEAMS.md` akışını ofis araçlarıyla anlatan Türkçe lider brifi: refiner → scout → uygulayıcı → verify sırası; rolleri `hire_worker` + `role` ile aç, `tell_worker` ile konuş; merge'i Mahmut yapar.
- [ ] **Step 7:** Test → PASS. Commit `feat(ordu): ordu.json yapılandırması ve yazılım ekibi şablonu`.

### Task 3: Rol raporları

**Files:**
- Create: `src/server/ordu/reports.ts`
- Test: `tests/ordu.test.ts` (ekle)

**Interfaces:**
- Consumes: `OrduConfig` (Task 2)
- Produces:
  ```ts
  // src/shared/ordu.ts'e eklenir:
  export interface RoleReport { role: string; task?: string; status?: string; verdict?: 'GEÇTİ' | 'KALDI'; file: string; at: number }
  export function reportLine(md: string): { status?: string; verdict?: 'GEÇTİ' | 'KALDI' }
  // src/server/ordu/reports.ts:
  export function readReports(projectDir: string, config: OrduConfig, workers: Pick<WorkerInfo, 'role' | 'roleTask'>[]): RoleReport[]
  ```

- [ ] **Step 1: Failing testler:**
  - `reportLine('Sonuç: GEÇTİ\n…')` → `{verdict:'GEÇTİ'}`; `reportLine('# Rapor\nDurum: ÇÖZÜLDÜ\n')` → `{status:'ÇÖZÜLDÜ'}`; boş → `{}`.
  - `readReports`: `reportDir` altında `t1/report.md` ve `t1/verify.md`; işçi `{role:'be-lead', roleTask:'t1'}` → be-lead için `status`, verify rolü için `verdict` döner (verify.md, adı `verify-` ile başlayan role atanır). Eşleşmeyen roller için o klasördeki en yeni (mtime) dosya kullanılır.
  - `reportDir` yok → `[]`. 100 KB'lık report.md → yalnızca ilk 4 KB okunur, yine de `status` bulunur.
- [ ] **Step 2:** FAIL. **Step 3:** Uygula (`readdirSync` + `statSync`, en fazla 200 alt klasör). **Step 4:** PASS. **Step 5:** Commit `feat(ordu): rol raporlarını oku`.

### Task 4: İşçiye rol ve `--agent`

**Files:**
- Modify: `src/shared/protocol/workers.ts` (`WorkerInfo`'ya `role?: string; agentFile?: string; roleTask?: string`)
- Modify: `src/server/workers/manager.ts` (`spawn`'a sona `opts: SpawnOpts = {}`)
- Modify: `src/server/providers/claude.ts` (`launch`: `if (info.agentFile) args.push('--agent', info.agentFile)`)
- Modify: `src/server/workers/persist.ts` (üç alanı kaydet/geri yükle)
- Create: `src/server/ordu/hire.ts`
- Test: `tests/ordu-hire.test.ts`, `tests/agents.test.ts` (ekle)

**Interfaces:**
- Produces:
  ```ts
  // manager.ts
  export interface SpawnOpts { role?: string; agentFile?: string; roleTask?: string; name?: string }
  // src/shared/ordu.ts
  export const OFIS_NOTU: string  // Türkçe: ofis araçları (list_workers, hire_worker role ile, tell_worker), çalışma klasörü
  export function rolePrompt(role: OrduRole, reportDir: string | undefined, taskId: string, brief: string | undefined, userPrompt: string | undefined): string
  // src/server/ordu/hire.ts
  export function hireRole(floor: Floor, roleName: string, by: string, prompt?: string, owner?: string): { info: WorkerInfo; note?: string } | string
  ```

- [ ] **Step 1: Failing testler:**
  - `agents.test.ts`: Claude adapter `launch`, `info.agentFile = 'be-lead'` ile çağrılınca `args`, `'--agent','be-lead'` çiftini `'--'`'den önce içerir. `agentFile` yoksa `--agent` yok.
  - `ordu-hire.test.ts` (`rolePrompt`): sıra `OFIS_NOTU` → brief → `Görev id: t1 · çalışma klasörün: .claude/work/t1/` → kullanıcı prompt'u. `reportDir` yoksa görev satırı yok.
  - `hireRole` (sahte floor ile, `workers.test.ts`'teki kalıp): (a) rol yok → `'"x" diye bir rol yok'`; (b) aynı rol çalışıyor → `'be-lead zaten masasında: iş ver'`; (c) `role.desk` dolu → `'be-lead'in masası (desk-3) dolu'`; (d) `agent` verilmiş ama `.claude/agents/<agent>.md` yok → işe alınır, `agentFile` boş, `note` `'rol dosyası bulunamadı'` içerir; (e) başarılı → `info.role==='be-lead'`, `info.agentFile==='be-lead'`, `info.name===role.title ?? role.name`, provider `'claude'`, `model` yalnızca rol verdiyse dolu (ofis varsayılanı rol dosyasının modelini ezmesin).
  - `persist`: `role/agentFile/roleTask` kaydedilip geri yüklenir.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `spawn`: `opts.name` varsa isim olarak kullan (çakışırsa `" 2"` ekle). `info`'ya üç alanı koy. Ayrıca `kind==='agent' && provider===undefined` dalı yalnızca `opts.role` yokken çalışsın (rol işe alımı `provider:'claude'`, model/efor yalnızca rolden).
- [ ] **Step 4:** `hireRole`: `loadOrdu` → `findRole` → masa (`role.desk` ya da `nextFreeSeat`) → `taskId = Date.now().toString(36)` → `brief` dosyası proje klasöründe yoksa bu repodaki `ordu/` altında aranır → `floor.workers.spawn(desk, by, rolePrompt(...), false, 'agent', 'claude', role.model, role.effort, undefined, owner, [], undefined, { role: role.name, agentFile, roleTask: taskId, name })`.
- [ ] **Step 5:** PASS + `npm run typecheck`. Commit `feat(ordu): rolleri --agent ile işe al`.

### Task 5: WS alanı ve MCP'de rol

**Files:**
- Create: `src/shared/protocol/ordu.ts`, `src/server/ws/handlers/ordu.ts`
- Modify: `src/shared/protocol.ts` (import/export/union satırları), `src/server/ws/handlers/index.ts` (bir satır)
- Modify: `src/server/office-workers.ts` (`readHireRequest`: `role?: string`, prompt rol varsa zorunlu değil), `src/server/hooks/office-workers.ts` (role → `hireRole`), `bin/office-workers.js` (`hire_worker` şemasına `role`)
- Test: `tests/office-workers.test.ts` (ekle), `tests/server-dispatch.test.ts` mevcut haliyle geçmeli

**Interfaces:**
- Produces:
  ```ts
  export interface OrduView { config: OrduConfig; source: 'file' | 'derived' | 'none'; error?: string; agents: string[]; reports: RoleReport[] }
  export type OrduClientMsg = { t: 'ordu.get' } | { t: 'ordu.hire'; role: string; prompt?: string }
  export type OrduServerMsg = { t: 'ordu.state'; view: OrduView }
  ```
- [ ] **Step 1: Failing test:** `readHireRequest({role:'be-lead'}, ['claude'])` → `{ role:'be-lead' }` (prompt'suz geçerli). `{role: 5}` → `'role is a role name from ordu.json'`.
- [ ] **Step 2:** FAIL. **Step 3:** Uygula. `ordu.get` → `loadOrdu` + `readReports` → yalnızca isteyene `ordu.state`. `ordu.hire` → `hireRole`. Hata `ctx.warn`, başarı `ctx.toastFloor(floor, "<kim>, <ad> (<rol>) işe aldı")`, `note` varsa uyarı tostu, sonra tüm kata `ordu.state`. **Step 4:** PASS + typecheck. **Step 5:** Commit `feat(ordu): ordu WS mesajları ve MCP'de rolle işe alma`.

### Task 6: Ekipler paneli

**Files:**
- Create: `src/client/state/slices/ordu.ts`, `src/client/features/ordu/index.ts`, `src/client/features/ordu/ui.ts`, `src/client/features/ordu/ui.css`
- Modify: `src/client/state/slices/index.ts` (sona `ordu`), `src/client/state/persist.ts` (`HudPanel`'e `'ordu'`), `src/client/ui/menu.ts` (`PANELS`: `{ id:'ordu', icon:'🏢', label:'Ekipler', what:'Ofisler, ekipler, roller ve raporlar' }`, `PANEL_EL.ordu='ordu-panel'`), `src/client/index.html` (`<div id="ordu-panel" class="panel">`), `src/client/main.ts` (bir `installOrdu(ctx)` satırı), `src/client/ui/help.ts` (bir satır)
- Test: `tests/client-structure.test.ts` mevcut haliyle geçer, `tests/ordu-ui.test.ts`

**Interfaces:**
- Consumes: `OrduView` (Task 5), mağazadaki `WorkerInfo.role`, mevcut `worker.prompt` mesajı ve terminal açma eylemi (`features/workers/actions.ts`)
- Produces: `export function roleRows(view: OrduView, workers: WorkerInfo[]): RoleRow[]` (`ui.ts`, saf), `RoleRow = { office: string; team: string; color: string; role: OrduRole; worker?: WorkerInfo; report?: RoleReport }`

- [ ] **Step 1: Failing test** (`ordu-ui.test.ts`, `roleRows`): rolü `be-lead` olan işçi doğru satıra bağlanır. Rolsüz işçiler satır üretmez. Raporu olan rolde `report` dolu. Sıra = ofis → ekip → rol (yapılandırma sırası).
- [ ] **Step 2:** FAIL. **Step 3:** Slice: `ordu.state` → `s.ordu`, topic `ordu`. Kata girişte (`enter`) `net.send({t:'ordu.get'})`, ayrıca bir işçi `done`'a geçince de gönderilir.
- [ ] **Step 4:** Panel: ofis başlığı → ekip (renk şeridi) → rol satırı: durum noktası (`idle` gri, `working` yeşil nabız, `needs_input` kırmızı, `done` mavi, yok = çizgili), ad + rol, şu anki `activity`, rapor (`status` / GEÇTİ-KALDI rozeti). Düğmeler: işçi varsa **Terminal** (mevcut terminal açma) ve **İş ver** (satır içi metin kutusu → `worker.prompt`). İşçi yoksa **İşe al** (isteğe bağlı prompt → `ordu.hire`). `source:'derived'` ya da `error` varsa üstte Türkçe bilgi bandı. `source:'none'` ise "Bu projede rol yok. `ordu/sablonlar/` içinden bir şablonu `.agent-office/ordu.json` olarak kopyala." bilgisi.
- [ ] **Step 5:** Klavye: panelin metin kutusu odaktayken oyun kısayolları çalışmaz (mevcut `input/focus.ts` kuralına uy), Esc kutudan çıkar ve mouse-look'a döner.
- [ ] **Step 6:** PASS + `npm run typecheck` + `npm test` + `npm run build`. Commit `feat(ordu): Ekipler paneli`.

### Task 7: FirstBU ile uçtan uca doğrulama

- [ ] **Step 1:** `ordu/sablonlar/yazilim.json`'u `/Users/mahmutkurnaz/firstbu/.agent-office/ordu.json`'a kopyala. FirstBU `git status` satır sayısı değişmez (24).
- [ ] **Step 2:** Ofisi yeniden başlat. Ekipler panelinde 7 ekip ve 15 rol görünür. Ekran görüntüsü al.
- [ ] **Step 3:** Panelden `scout-be`'yi prompt'suz işe al. Terminalde `claude --agent scout-be` başlığı/modeli görünür (Sonnet). Panelde yeşil nokta görünür.
- [ ] **Step 4 (F0'dan kalan):** scout-be'ye "Bash ile yalnızca `grep -c 0101 CLAUDE.md` çalıştır" de → FirstBU `guard-sensitive.sh`'nin Türkçe "Engellendi: 0101/…" mesajı terminalde görünür. Görünmezse sonuç tasarım belgesine yazılır.
- [ ] **Step 5:** scout-be'yi eve gönder. Tasarım belgesine "F1 sonuçları" ekle. Commit, push, PR (`MahmutKurnaz/firstbu-ofis`, taban `main`).
