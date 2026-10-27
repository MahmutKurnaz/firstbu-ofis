# Ajan Şehri — tasarım (ilk kiracı: FirstBU)

Tarih: 2026-10-28 · Dal: `feat/firstbu-dunya` · Taban: agent-office fork'u (`MahmutKurnaz/firstbu-ofis`, MIT)

## Neden

Mahmut'un FirstBU'da bir lider altında 14 rollük bir ajan ekibi var (`/Users/mahmutkurnaz/firstbu/.claude/agents/`,
`docs/AGENT_TEAMS.md`). Bugün bu ekiple terminal terminal konuşuyor. İstenen: içine girilen, canlı bir **oyun
dünyası**. Orada hangi ekibin çalıştığı, hangisinin boşta olduğu, kimin soru beklediği ve raporların ne dediği
bir bakışta görülsün. Bir ajana ya da masaya tıklayınca onun **gerçek terminali** açılsın ve oradan yazılsın.
Kısacası "terminal merkezi, ama modern" olsun.

**Bu FirstBU'ya özel değil.** Mahmut kendi "ajan ordusunu" kuruyor. 10 projesi olursa 10 ayrı ofis olur. Bir
projenin bir ya da birden çok ofisi olabilir. Her ekibin yapısı farklı olabilir ve Mahmut bunu kendisi ayarlar.
FirstBU yalnızca ilk kiracı ve örnek tasarım. Tüm kod genel yazılır, FirstBU'ya özgü hiçbir şey koda gömülmez,
hepsi yapılandırmadan gelir.

İlham: Selma Kocabıyık'ın "Higgsfield API ile ajan oyunu" yazısı ve `a-sirketi` reposundaki
`docs/higgsfield-ofis/` (PROMPT.md'deki 10 kural, ADIMLAR.md, KAYNAKLAR.md). Selma'nın oyun kodu yayımlanmamış.
Biz aynı adımları ve kuralları izleyip kendi sürümümüzü agent-office'in üzerine kuruyoruz. agent-office canlı
terminal, PTY, hook ile durum takibi, oyuncu karakteri, kamera ve proje başına kat sistemini zaten veriyor.

## Hedefler

1. **Ekipler dünyada.** FirstBU rolleri bölgelere/binalara yerleşir. Her rolün kendi masası ve karakteri olur.
   Durum (`idle / working / needs_input / done`) karakterin üstünde ve bir Ekipler panelinde canlı görünür.
2. **Tıkla → terminal.** Bir role tıklayınca o rolün Claude Code oturumu açılır (gerçek PTY, yazılabilir).
   Rol, Claude Code'a `--agent <rol>` ile verilir. Böylece model ve efor rol dosyasından gelir.
3. **İş ver.** Bir ekibe/role dünyadan iş verilir. İş gerçek oturuma prompt olarak gider ve koşu başlar.
4. **Soru soran sana gelir** (Selma Adım 10). `needs_input` olan ajan oyuncunun yanına yürür, panel açılır,
   cevap terminale yazılır.
5. **Raporlar görünür.** Ekip panelinde, FirstBU'nun `.claude/work/<görev>/report.md` ve `verify.md` dosyalarının
   son hali okunur: Durum ve GEÇTİ/KALDI.
6. **Kendi dünyamız ve karakterlerimiz.** Modern bir cadde: her ekibin kendi cam cepheli ofisi, ortada kafe,
   uzakta şehir. Karakterler giyimli sevimli hayvanlar. Önce CC0 paketlerle taslak, sonra Higgsfield ile kendi
   tasarımlarımız.
7. **Canlılık** (Selma Adım 9'un şehir hali): kahve buharı, sokak lambaları, ofis ışıkları, gün/gece.
8. **Ses.** Ajan kendi durumunu sesli söyleyebilir (TTS, ajan başına ayrı ses). Sesle komut, agent-office'te zaten
   var (tarayıcı dikte).
9. **Çok proje, çok ofis.** Her proje caddede kendi ofis binasıyla (bir ya da birkaç) yer alır. Ekipler,
   roller, karakterler ve yerleşim proje başına ayarlanır. Bkz. "Genel yapı: ajan ordusu".

## Hedef olmayanlar (şimdilik)

- Bulut kurulumu, çok kullanıcılı paylaşım, telefon 3D'si. agent-office'te var, ama dokunmuyoruz.
- FirstBU'nun kendi takım protokolünü (`team-protocol.md`, hook kapıları) değiştirmek. Dünya onu gösterir, yerine geçmez.
- Bir oturumun **içindeki** in-process teammate'leri ayrı terminal yapmak. Bkz. "Ekip modeli".

## Anti-hedefler (çalışsa bile başarısızlık sayılır)

- **Uydurma diyalog.** Ajan yalnızca kendi verisinden konuşur (hook olayı, durum, rapor dosyası). Selma kural 6.
- **Onaysız dışa dönük iş.** Merge, push, yayın, paralı üretim (Higgsfield/ElevenLabs) Mahmut onayı olmadan yapılmaz.
  Her üretimden önce fiyat tahmini alınır ve `KAYNAKLAR.md`'ye yazılır. Deneme turlarında API çağrılmaz (Selma kural 9).
- **Kart (billboard) bina.** Bina ve ağaç gerçek mesh olur (Selma kural 2).
- **Upstream'den kopmak.** agent-office hızlı değişiyor. Sık değişen dosyalara (`main.ts`, `server.ts`,
  `protocol.ts`, `hud.ts`, `layout.ts`) en az dokunulur. Yeni kod yeni modüllere gider, böylece `upstream` merge
  edilebilir kalır.
- **Ekran koruyucu.** Sadece izlenen, iş verilemeyen bir dünya (Selma 8b).

## Kısıtlar (koddan gelen)

- Her dosya en fazla 600 satır (`tests/size.test.ts`). `workers/manager.ts` (1029, istisna) ve
  `world/character/worker.ts` (605) tavanda, eklemeler yeni modüllere gider.
- UI React değil, `h()` + `openModal()` (`src/client/ui/dom.ts`). Panel `ui/menu.ts` `PANELS` listesine,
  özellik `features/<ad>/` altına eklenir. `main.ts`'e yalnızca kurulum satırı girer (`AGENTS.md`, `docs/code-layout.md`).
- Koltuk id'leri sabit ve global (`src/shared/layout.ts`: `desk-1..20`, `beanbag-1..12` …). Harita en az 32 koltuk
  vermeli. Bölge = hangi koltuk id'si hangi binaya düşer. Yeni koltuk türü açılmaz.
- JSON haritalar yalnızca sabit prop türleri ve kapalı salon alır. GLB prop ve açık arazi **kod ile yazılmış yeni
  bir harita stili** gerektirir: `MAP_STYLES`, `src/shared/maps/<ad>.ts`, `src/client/world/<ad>/`, `BUILDERS`.
- İşçi gövdesi kodla yapılmış (`Worker` sınıfı, prosedürel poz). GLB karakter için aynı API'yi (`setStatus`,
  `setAction`, balon, isim etiketi) koruyan ayrı bir gövde sınıfı gerekir. Şablon: köpek (`features/dog/world.ts`, AnimationMixer).
- TTS yok, sıfırdan eklenir.

## Genel yapı: ajan ordusu

**Katmanlar:**

```
Şehir (tek dünya, tek cadde)
 └─ Proje           = bir git reposu (FirstBU, X, Y …), kendi çalışma klasörü
     └─ Ofis        = caddede bir bina; bir projenin 1..n ofisi olabilir
         └─ Ekip    = ofisin içinde bir oda/bölge
             └─ Rol = bir masa + bir karakter + bir terminal (Claude Code oturumu)
```

**Her şey yapılandırmadan gelir:**
- **Proje dosyası** `<proje>/.agent-office/ordu.json`: o projenin ofisleri, ekipleri, rolleri, karakterleri,
  ekip renkleri ve rapor klasörü (FirstBU için `.claude/work/`). Dünyanın içinden düzenlenebilir: ⚙️ → Ekipler
  (ekip ekle/sil, rol taşı, karakter seç). Ayrıca elle de düzenlenebilir.
- **Rol kaynağı:** Rol önce projenin `.claude/agents/<ad>.md`'sinden okunur. Yoksa ortak kütüphaneden
  (`~/.claude/agents/` ya da bu repodaki `ordu/roller/`) gelir. Böylece bir rol birden çok projede kullanılabilir.
  Rol, Claude dışında bir sağlayıcıyla (Codex, OpenCode …) da çalışabilir. agent-office bunu zaten destekliyor.
- **Ekip şablonları** (`ordu/sablonlar/`): "yazılım ekibi" (FirstBU yapısı), "pazarlama ekibi", "içerik
  ekibi" (a-sirketi yapısı: x-icerik, youtube-analiz, twitter-icerik) gibi hazır kalıplar. Yeni projeye
  tek tıkla bir şablon basılır, sonra özelleştirilir.
- **Karakter kataloğu** (`ordu/karakterler/`): hayvan + kıyafet kombinasyonları ortak havuzdadır. Bir rol
  için katalogdan karakter seçilir. Aynı karakter başka projede başka role verilebilir. Yeni karakter F4 hattıyla
  kataloğa eklenir.
- **`ordu.json` yoksa:** Projenin `.claude/agents/*.md` dosyalarından tek ofisli, tek ekipli varsayılan bir
  yerleşim üretilir. Hiç rol dosyası yoksa genel bir "yazılım ekibi" şablonu önerilir.

**Teknik yol (*benim kararım*):** agent-office'te her proje zaten ayrı bir "kat"tır: kendi klasörü, işçileri ve
`.agent-office/` durumu vardır. Bunu iki adımda şehre çeviriyoruz:
1. **Önce (F1–F3):** Her proje kendi katında kendi cadde/ofis yerleşimini `ordu.json`'dan kurar. Projeler arası
   geçiş agent-office'in mevcut kat listesiyle yapılır.
2. **Sonra (F6, Şehir görünümü):** Tek cadde, tüm projelerin binaları yan yana. Her bina tabelasında canlı özet
   var: kaç ajan çalışıyor, kaç soru bekliyor, son verify sonucu. Bir binaya girmek o projenin katına geçmek
   demek. Bu adım sunucunun tüm katların özetini tek bir akışta yayınlamasını gerektiriyor. Bugün bir oyuncu tek
   katı görüyor.

FirstBU'ya özel olan her şey (14 rol, bölgeler, `report.md`/`verify.md` şablon kontrolü) bu yapının içinde
**FirstBU'nun `ordu.json`'ı ve "yazılım ekibi" şablonu** olarak durur. Kodda değildir.

## Ekip modeli (verilen karar: her rol ayrı işçi)

FirstBU'da lider bugün teammate'leri **tek oturumun içinden** açıyor. Bunlar agent-office'te ayrı işçi olarak
görünmez. Dünyada her şeyin görünmesi için **her rol ayrı bir agent-office işçisi** olur: kendi PTY'si,
`claude --agent <rol>`, kendi masası. Lider (prompt-refiner'dan sonraki "LEAD", Opus) da bir işçidir, meydandaki
masada oturur. Lider diğer rollere agent-office'in MCP'si üzerinden iş verir: `hire_worker` (role ve bölgeyle) ve
`tell_worker`. Böylece FirstBU akışı (refiner → scout → uygulayıcı → verify → özet) dünyada adım adım görünür.

*Benim kararım:* Bir işçinin kendi içinde açtığı alt ajanlar (Claude Code `SubagentStart/SubagentStop` hook'ları)
geçici "hayalet" karakter olarak o işçinin yanında gösterilir. Terminalleri yoktur. Bu, faz 3'te ele alınır.

### Ekip modelinin ayrıntıları (*benim kararlarım*)

- **Mesajlaşma:** Bugün FirstBU'da ikililer birbirine doğrudan mesaj atıyor (be-lead ↔ fe-lead SÖZLEŞME,
  uygulayıcı ↔ uzman, verify → BAŞARISIZ). Bunun yerine ofis MCP'sinin `tell_worker` aracı kullanılır. Roller
  birbirine doğrudan yazar, her şey liderden geçmez. Rollere bu araçları anlatan kısa bir "ofiste çalışma" notu
  işe alma prompt'unun başına eklenir. FirstBU'nun rol dosyaları değişmez.
- **Kapılar:** FirstBU'nun PreToolUse hook'ları her işçide çalışmaya devam eder (aynı checkout, aynı
  `.claude/settings.json`). `TaskCompleted` kapısının yerini ofis tarafında bir kontrol alır: işçi `done`
  olunca panel, o görevin `report.md`/`verify.md` dosyasını FirstBU şablonuna göre denetler ve eksikse işçinin
  üstünde uyarı yakar. F0'da iki hook kümesinin birlikte çalıştığı doğrulanır.
- **Çalışma kopyası:** FirstBU bugün olduğu gibi tek checkout'ta çalışır. `.claude/work/<görev>/` ortak hafıza
  olarak kalır. Riskli iş için lider bir işçiye worktree verebilir (agent-office'te var).
- **Raporun role bağlanması:** Lider her işe almada bir görev id'si verir. Prompt'a "çalışma klasörün
  `.claude/work/<id>/`" yazılır ve id işçi kaydında saklanır. Panel o klasördeki dosyaları gösterir. Klasör
  bağlantısı yoksa en yeni dosyayı (mtime) gösterir.
- **Kim hep açık:** Aslan lider her zaman masasındadır. Diğer roller iş gelince işe alınır, ofisine yürür,
  iş bitince evine gider. Boş masada rolün isim tabelası durur. Böylece boşta bekleyen oturumlar kota yemez.
- **Liderin talimatları** FirstBU'ya dokunmadan bu repoda durur (`firstbu/lead.md`) ve lider açılırken eklenir.
  Mahmut izin verirse sonradan FirstBU'nun `.claude/agents/`'ına taşınabilir.
- **Zamanlanmış roller** (security-reviewer, map-keeper): dünya bunları gösterir ve "şimdi çalıştır" düğmesi
  sunar. Zamanlamayı FirstBU'nun mevcut zamanlayıcısı yapmaya devam eder.

## Dünya: modern cadde

**Mahmut'un isteği:** Modern bir dünyada, gerçekten çok kaliteli bir ofis ortamı. Ofislerden dış dünya
görünsün. Ortada herkesin toplanıp sohbet edebildiği bir kafe alanı olsun. Aslında bir cadde, caddenin üstündeki
ofislerin her biri ayrı bir ekip. Önlerinde bilgisayarlar, ofis masaları, doğru bir düzen.

**Yerleşim (*benim kararım*):** Yayalaştırılmış, ağaçlıklı bir cadde. Caddenin iki yanında cam cepheli ofisler
var, her ofis bir ekibin. Caddenin ortasında açık bir meydan ve kafe: uzun ortak masalar, bar tezgâhı, kahve
makinesi, saksılarda ağaçlar. Kafe Selma'nın "ortadaki masası"dır. İş başlayan ajan oraya gelir, soru soran
ajan oyuncunun yanına gelir, ajanlar burada sohbet eder. Uzakta şehir silueti, gökyüzü ve gün/gece döngüsü
var. Ofislerin içinden cam cepheden cadde görünür, caddeden bakınca da içerisi.

**Ofislerin içi:** Her ofiste ekip renginde vurgu duvarı, masada ekip tabelası, monitörlü ve sandalyeli masalar
düzgün sıralı. Monitörde o ajanın canlı terminali görünür (agent-office'te laptop ekranında var). Ayrıca bitkiler,
toplantı köşesi ve ekibin rapor panosu var. Panoda son `report.md` / `verify.md` durumu yazar.

**Bölgeler:**

| Ofis / alan | Roller | Not |
|---|---|---|
| Kafe meydanı (merkez) | lead, prompt-refiner | Oyuncu burada doğar. Liderin masası kafenin yanında, cam köşe ofiste. |
| Keşif ofisi | scout-be, scout-fe | Salt okunur keşif |
| Tasarım stüdyosu (frontend) | fe-lead, fe-expert, admin-dev | Açık, renkli, çizim tahtalı |
| Mühendislik ofisi (backend) | be-lead, be-expert | Çoklu monitör, sunucu dolabı |
| Hata laboratuvarı | bug-hunter, quick-fix | |
| Test laboratuvarı | verify-fe, verify-be | Kapıda GEÇTİ/KALDI ışıklı tabelası |
| Güvenlik merkezi | security-reviewer, map-keeper | Zamanlanmış roller, gün sonu ışıkları yanar |

**Canlılık:** Kahve makinesinden buhar, sokak lambaları, akşam ofis ışıklarının yanması, vitrin ışıkları, arada
caddeden geçen bisikletler ve yayalar (dekor), yağmur/gün batımı. Selma'nın duman/fener/ateş böceği listesinin
şehir karşılığı bunlar.

**Taslak varlıklar:** CC0 modern paketler (Kenney City Kit ve Furniture Kit, Quaternius modern ofis ve şehir
parçaları). agent-office'in kendi ofis ve şehir kodu (`world/office/`, `world/outside.ts`, `world/city.ts`) da
yeniden kullanılabilir. Son hali yine Higgsfield + Meshy ile kendi tasarımlarımız olur (F4).

Yerleşim, projenin `.agent-office/ordu.json` dosyasında durur: bölge → roller → koltuk id'leri. Dosya yoksa,
projedeki `.claude/agents/*.md`'den (frontmatter: `name`, `description`, `model`) varsayılan bir yerleşim üretilir.
Böylece başka bir proje bağlandığında kendi rolleriyle gelir.

## Karakterler: giyimli sevimli hayvanlar

**Mahmut'un isteği:** Karakterler dünyanın en sevilen, en tatlı hayvanlarından olsun (susamuru, aslan, kaplan,
tavşan, ceylan, geyik, mirket …). İki ayak üstünde, şık giyimli ve sevimli olsunlar, animasyonları da tatlı
olsun. Kıyafet rolü anlatsın: ana ajan takım elbiseli, frontend'ciler tasarımcı gibi, backend'ciler yazılımcı
gibi, test ekipleri farklı. Tasarım bana bırakıldı.

**Stil (*benim kararım*):** Özgün, "chibi" oranlar (baş gövdenin yaklaşık yarısı), iri parlak gözler, yumuşak
toon gölgelendirme, pastel ama her ekipte tek bir vurgu rengi. Bilinen bir film/oyun karakterine benzemez.
Dünya ise modern bir şehir caddesi (bkz. "Dünya: modern cadde").

| Rol | Hayvan | Kıyafet | Ekip rengi |
|---|---|---|---|
| lead | Aslan | Lacivert üç parça takım, altın kravat iğnesi | Altın |
| prompt-refiner | Kızıl panda | Yelek, papyon, deri not defteri | Altın |
| scout-be, scout-fe | Mirket ikizleri | Kaşif yeleği, dürbün, şapka | Yeşil |
| fe-lead | Susamuru | Bere, oversize kazak, yuvarlak renkli gözlük | Mercan |
| fe-expert | Tilki | Keten blazer, kulağında kalem, renk paleti | Mercan |
| admin-dev | Koala | Hırka, kolunda tablet | Mercan |
| be-lead | Kaplan | Kapüşonlu sweatshirt, boyunda kulaklık | Mavi |
| be-expert | Panda | Hoodie, mekanik klavye taşıyor | Mavi |
| bug-hunter | Tavşan | Dedektif trençkot, büyüteç | Mor |
| quick-fix | Sincap | Alet kemeri, kısa önlük | Mor |
| verify-fe | Ceylan | Laboratuvar önlüğü, klipsli pano | Turkuaz |
| verify-be | Geyik | Laboratuvar önlüğü, koruyucu gözlük | Turkuaz |
| security-reviewer | Penguen | Güvenlik yeleği, el feneri | Gri |
| map-keeper | Baykuş | Kaşif pelerini, rulo harita | Gri |

**Animasyon seti** (rig'li GLB, insan iskeleti; hepsi iki ayaklı olduğu için tek iskelet uyar):
bekle (nefes + kuyruk/kulak sallama), yürü, koş, otur, klavyede yaz, düşün (çene kaşıma), el salla,
sevinç zıplaması (iş bitti), "sorum var" (el kaldırma). Kuyruk ve kulaklar ikincil hareket (salınım) alır.

**Üretim hattı:** Higgsfield ile her karakter için 4 görünümlü karakter kağıdı (ön/sol/arka/sağ, T-poz) →
Meshy `multi_image_to_3d` → otomatik rig (Mixamo, Mahmut'un Adobe girişiyle; ya da Meshy/Higgsfield'ın
rig özelliği varsa o) → Blender'da kuyruk/kulak kemikleri, malzeme adları, Draco → GLB. Önce **tek karakter**
(aslan) uçtan uca yapılır. Onay gelirse diğer 13 karakter üretilir.

## Parçalar ve fazlar

Her faz kendi başına çalışır ve gösterilebilir. Her ara sürüm etiketlenir (`v0`, `v1` …), Selma kural 10.

**F0 — Ayağa kaldır.** `npm install`, `npm run dev`. FirstBU kat olarak açılır (`agent-office /Users/mahmutkurnaz/firstbu`).
Bir masaya Claude işçisi alınır, terminalde yazılır. FirstBU'nun kendi hook'ları (`.claude/settings.json`) ile
agent-office'in `--settings` hook'ları birlikte çalışıyor mu, doğrulanır.

**F1 — Roller ve ekipler** (mevcut ofis haritasında, dünya beklemeden):
- İşçiye `agent` (rol adı) alanı. Yol: `WorkerInfo` → spawn mesajı → `spawn` → `providers/claude.ts`
  (`--agent`) → `persist.ts` → `office-workers` hire isteği ve MCP şeması → işe alma arayüzü.
- `ordu.json` okuyucu/üretici (sunucu) ve yeni `teams` WS mesajı.
- **Ekipler paneli** (`features/teams/`): bölge → rol → durum noktası, şu anki araç, son rapor
  (`report.md` Durum satırı, `verify.md` Sonuç satırı). Tıkla → terminal. "İş ver" kutusu → role prompt.
  Boş rolde "işe al" → o bölgenin koltuğuna `--agent <rol>` ile.

**F2 — Cadde haritası, taslak** (yeni stil `cadde`):
- Cadde, kafe meydanı, 7 cam cepheli ofis, ağaçlar, şehir silueti, gün/gece.
- Yeni `glb` prop türü ve `world/models.ts` ile yükleme. Taslaklar CC0 paketlerden.
- Koltuklar ofislerdeki masalara dağıtılır (32+, beanbag'ler kafeye). `ordu.json` bölgeleriyle eşleşir.
- Ofis kapısında **Enter** → o ekibin paneli (üyeler, terminalleri, olay geçmişi). Selma kural 8.
- Ölçek: karakter 1 birim, bina 2,5–3 birim. Binalar 10–15 cm gömülür, temas gölgesi ve dip bitkisi eklenir
  (Selma kural 4–5). Kamera: agent-office'in oyuncu kamerası kullanılır. Selma'nın üçüncü şahıs kurallarına
  (kural 3) uymuyorsa ayarlanır.

**F3 — Canlılık ve hareket:**
- `needs_input` → ajan oyuncuya yürür, panel açılır, cevap terminale gider. agent-office'in kale haritasındaki
  "sıra" (lineup) davranışı temel alınır.
- İş bitince ajan kafeye yürür ve raporunu orada bekler. İş gelince ofisine döner. Ajan hep kendi masasında
  kalınca hareket görünmüyordu, o yüzden kafe ortada (Selma 8b).
- Balon metni gerçek araçtan gelir ("Read: …", "Edit: …").
- Cadde canlılığı (bkz. "Dünya: modern cadde").
- Alt ajan hayaletleri (`SubagentStart/Stop`).

**F4 — Kendi tasarımlarımız (paralı, her adım onaylı):**
- Konsept: Higgsfield görsel modeliyle her bina için 4 açı (ön/sol/arka/sağ), her rol için karakter.
- Bina: Meshy `multi_image_to_3d` (4 açı korunuyor). Tripo tek görsel ayrıntı kaybediyor (Selma Adım 8).
- Karakter (*benim kararım*): Meshy ile 3D'ye çevrilir, **Mixamo** ile otomatik rig'lenir (yürü/otur/yaz/zıpla
  klipleri), Blender'da temizlenip GLB olarak dışa aktarılır. agent-office işçileri masada oturup laptopa yazıyor,
  bunu Selma'nın 8 yönlü kartları iyi yapamaz. Kart karakter yedek seçenek olarak kalır.
- Draco + 1024 px doku ile GLB başına 400 KB altı (Selma'nın ölçüsü).
- `blender/scripts/` düzeni: script kaynaktır, `.glb` çıktıdır.
- Her üretimin modeli, adedi ve fiyatı `docs/firstbu/KAYNAKLAR.md`'ye yazılır. Kaba tahmin: 7 bina × 30 kredi
  + 14 karakter × 30 kredi ≈ 630 kredi, konsept görseller ayrıca. Kesin fiyat her istekten önce alınır.

**F5 — Ses:**
- Her rolün bir sesi olur. Ajan yalnızca olayları söyler: "Rapor hazır", "Sana bir sorum var", verify sonucu.
- Sağlayıcı: ElevenLabs (Türkçe, ajan başına ses) ya da Higgsfield ses üretimi. Anahtar yoksa tarayıcının
  `speechSynthesis`'i (Türkçe ses) yedek olur. Sunucu tarafında, anahtar `.env`'de durur.
- Sesle komut (dikte) mevcut. Yalnızca dünyadaki "iş ver" kutusuna bağlanır.

**F6 — Şehir görünümü ve diğer projeler.** İkinci bir proje `ordu.json` ve bir şablonla bağlanır. Ardından
tek caddede tüm proje binaları canlı tabelalarıyla gösterilir (bkz. "Genel yapı").

## Selma'nın adımları ↔ bizim fazlarımız

Selma'nın 10 adımını sırayla izliyoruz. agent-office'in hazır verdiği adımlar atlanmıyor, "hazır" diye işaretleniyor.

| Selma adımı | Bizde |
|---|---|
| 0 · 2D sahne | Gerek yok. agent-office zaten 3D, `/lite` 2D görünümü de var. |
| 1–2 · Karakter galerisi, 8 yön | F4 karakterleri: biz rig'li GLB yapıyoruz, 8 yön kart yedek kalıyor. Galeri sayfası (`docs/firstbu/galeri`) maliyet rozetleriyle F4'te. |
| 3 · İçine girilen harita | F2 taslak cadde (hazır: oyuncu, kamera, WASD). |
| 4 · Canlı olaylar | Hazır (hook → durum). F1 bunu ekip/rol düzeyine taşır. |
| 5 · Panel, sohbet, arazi, gölge | F1 Ekipler paneli + F2 arazi/gölge. Yakınlaşınca sohbet F3'te. |
| 6 · Oyun kamerası, çarpışma, ölçek | F2 (mevcut kamera Selma kural 3'e göre ayarlanır). |
| 7 · CC0 mesh binalar | F2 taslak binalar. |
| 8 · Meshy vs Tripo denemesi | F4'ün ilk adımı: tek bina, iki yöntem, yan yana. |
| 9 · Kendi tasarımlar 3D, duman/ışık, Enter terminali | F4 + F3 canlılık + F2 kapıda Enter. |
| 10 · Ortadaki masa, ajan sana gelir, iş ver | F3 hareket + F1 iş ver. |

## Yapıcıya bırakılanlar

Dosya/modül sınırları, WS mesaj adları, `ordu.json` şeması ayrıntıları, arazi üretim yöntemi, CC0 paket seçimi,
ses önbelleği, test yaklaşımı (mevcut `npm test` + harita testleri, 600 satır kuralı).

## Başarı ölçütü

Mahmut dünyaya girer ve meydanda lideri görür. Doğrulama kalesinde verify-be'nin son sonucunu okur. Lidere iş
verir. Liderin açtığı rollerin kendi binalarına yürüyüp çalıştığını görür. Soru soran ajan yanına gelir, cevap
verir. Bir masaya tıklayıp o terminalde doğrudan yazar. Tüm bunlar için tek bir terminal penceresi açmaz.

## F0 sonuçları (2026-10-28)

- `npm install` + `npm run build` + `npm run typecheck`: temiz. `npm test`: 614 testten 613'ü geçti. Kalan 1
  (`tests/worktrees.test.ts`), git'in Türkçe hata mesajı yüzünden kalıyor; `LANG=C` ile geçiyor. **F1'de
  düzeltilecek:** ofis git çıktısını İngilizce bekliyor, işçi/sunucu git komutları `LC_ALL=C` ile çalışmalı.
  Yoksa Türkçe sistemde silinmiş worktree'yi geri getirme bozuluyor.
- FirstBU kat olarak açıldı (`agent-office /Users/mahmutkurnaz/firstbu`). `.agent-office/`, ofis tarafından
  `.git/info/exclude`'a eklendi. FirstBU'nun `git status`'ı değişmedi (önce/sonra 24 satır, kullanıcının kendi işi).
- Claude işçisi işe alındı (Opus 5.5, ortak checkout). Terminalde iki tur yazışıldı, durumlar `working → done`
  doğru geçti.
- FirstBU ayarları işçide yükleniyor: `0101/` okuma denemesi FirstBU'nun `.claude/settings.json` deny kuralıyla
  engellendi. Hook'lar aynı dosyada ve ofisin `--settings`'i ek olarak yükleniyor, yani FirstBU hook'larının da
  çalışması bekleniyor. **Hook'un kendi engel mesajı doğrudan gözlenmedi**, F1'in ilk adımında bir işçiyle
  tekrar doğrulanacak.
- Not: 3D görünümde terminale tıklamadan yazmak tuşları oyuna gönderiyor (E/P/X kısayolları). Klavye
  odağının Ekipler panelinde net olması F1 arayüz ölçütü.
