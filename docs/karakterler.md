# Karakter kılavuzu: Ajan Şehri'nin kadrosu

Her karakter iki ayak üstünde duran, premium stilde özgün bir hayvandır. Aslan Lider bu stilin ölçüsüdür
(`src/client/models/aslan.glb`). Kıyafeti ve taşıdığı eşya, rolünün **yeteneğini** anlatır: karakteri
görünce ne iş yaptığını anlarsın. Her karakterin bir de **yetenek hareketi** vardır, işi başlayınca ya da bekleyince
oynar.

## Ortak kurallar

- **Stil:** premium, yumuşak stilize 3D; baş ~4 kafa boyu oran (aslandaki gibi), sade ve temiz şekiller, ince
  ayrıntı yok. Bilinen bir film ya da oyun karakterine benzemez.
- **Boy:** her hayvanın kendi boyu var (tabloda). Oyundaki boy ayarı karakter başınadır.
- **Eller boş:** ajanlar klavyede yazar (eller koda göre klavyeye uzanır) ve kahve içer (fincan koda göre ele
  verilir). Bu yüzden eşyalar elde değil, **vücutta** taşınır: boyunda, kemerde, sırtta, cepte, başın üstünde.
- **Humanoid iskelet:** hepsi tek Meshy iskeletine uyar (iki kol, iki bacak). Kanat ve yüzgeçler (penguen, baykuş) kol gibi
  çizilir. Kuyruk ve kulaklar modelin parçasıdır, hareketini klip verir.
- **Ekip rengi:** kıyafetin ana rengi ya da bir aksanı ekibin rengini taşır (`ordu/sablonlar/yazilim.json`).
- **İkizler:** aynı modeli paylaşan roller (Mirket BE ve FE) farklı eşarp rengiyle ayrılır, ek üretim gerekmez.

## Yaptığımız

| Rol | Hayvan | Durum |
|---|---|---|
| lead | Aslan (lacivert takım, altın kravat iğnesi, 1,85 m) | Hazır, `aslan` (ve yedek `aslan-sevimli`) |

## Rol karakterleri (13 yeni model)

Boy m, ekip rengi parantezde. "Yetenek hareketi" Meshy animasyon kütüphanesinden seçilir (kimlik no. parantezde).

| Anahtar | Rol | Hayvan, boy | Kıyafet ve taşıdığı eşya (yetenek bağı) | Yetenek hareketi |
|---|---|---|---|---|
| `kizil-panda` | prompt-refiner (altın) | Kızıl panda, 1,55 | Altın yelek, papyon; yelek cebinde deri not defteri, kulağının arkasında dolma kalem. Promptları cilalar. | Düşünüp not alma (Listening_Gesture 47) |
| `mirket` | scout-be, scout-fe (yeşil) | Mirket, 1,30 | Kâşif yeleği, geniş kenarlı şapka; boynunda dürbün. İkisi de keşif yapar. BE yeşil, FE turuncu eşarp. | Dikilip etrafı tarama (Long_Breathe_and_Look_Around 336) |
| `susamuru` | fe-lead (mercan) | Susamuru, 1,65 | Mercan bere, oversize kazak, yuvarlak renkli gözlük; kemerinde renk örnekleri şeridi. Arayüzün rengini o seçer. | Rahat yaslanma, bakınma (Idle_02 11) |
| `tilki` | fe-expert (mercan) | Tilki, 1,75 | Keten blazer, kıvrık kollar; kulağında kalem, yakasında renk paleti iğnesi. Piksel piksel işler. | Başını eğip ayrıntıya bakma (Confused_Scratch 36) |
| `koala` | admin-dev (mercan) | Koala, 1,60 | Rahat hırka, uykulu gözler; omzunda tablet çantası. Yönetim panelleri onun. | Esneme, uyuklama (Dozing_Elderly 38) |
| `kaplan` | be-lead (mavi) | Kaplan, 1,95 | Lacivert kapüşonlu sweatshirt, boynunda stüdyo kulaklığı; iri ve sakin. Mimariyi o kurar. | Kollar kavuşturup durma, onaylama (Agree_Gesture 25) |
| `panda` | be-expert (mavi) | Panda, 1,90 | Mavi hoodie; sırtında mekanik klavye çantası. Sunucu işleri. | Rahat nefes, el sallama (Big_Wave_Hello 28) |
| `tavsan` | bug-hunter (mor) | Tavşan, 1,70 | Gri-mor trençkot, dedektif şapkası; boynunda ipli büyüteç. Hataları avlar. | İz sürme, etrafı koklama (Alert 2) |
| `sincap` | quick-fix (mor) | Sincap, 1,40 | Kısa önlük, kemerinde alet kemeri, alnında gözlük. Hızlı onarım. | Sevinç zıplaması (Motivational_Cheer 49) |
| `ceylan` | verify-fe (turkuaz) | Ceylan, 1,80 | Beyaz laboratuvar önlüğü, turkuaz yaka; kemerinde klipsli pano. Arayüzü doğrular. | Onay hareketi (Agree_Gesture 25) |
| `geyik` | verify-be (turkuaz) | Geyik, 1,95 | Beyaz önlük, turkuaz eldiven cebinde; başında yukarı itilmiş koruyucu gözlük. Sunucuyu doğrular. | Ciddi bakış (Alert 2) |
| `penguen` | security-reviewer (gri) | Penguen, 1,50 | Güvenlik yeleği, şapka; kemerinde el feneri. Kanatlar kol gibi. Nöbet tutar. | Nöbet taraması (Alert 2) |
| `baykus` | map-keeper (gri) | Baykuş, 1,60 | Kâşif pelerini, yarım ay gözlük; sırtında harita tüpü. Haritaları saklar. Kanatlar kol gibi. | Bilge başını çevirme (Look_Around_Dumbfounded 333) |

## Yedek 10 hayvan (yarın yeni ajanlar için)

Rolü yok, bir uzmanlıkla gelir. Yeni bir ajan eklenince `character` alanına anahtarı yazılır.

| Anahtar | Hayvan, boy | Uzmanlık ve kıyafeti |
|---|---|---|
| `kurt` | Kurt, 1,85 | Olay müdahale ve nöbet. Siyah kapüşonlu, boynunda kulaklık-mikrofon. |
| `ayi` | Ayı, 2,00 | DevOps ve altyapı. Tulum, başında baret, kemerinde ingiliz anahtarı. |
| `fil` | Fil, 2,00 | Veri ve veritabanı, hiçbir şeyi unutmaz. Arşivci yeleği, kravat, sırtında dosya çantası. |
| `zurafa` | Zürafa, 2,10 | İzleme ve gözlemlenebilirlik, her şeyi yukarıdan görür. Uzun eşarp, boynunda dürbün. |
| `kedi` | Kedi, 1,65 | Kullanıcı deneyimi ve metin yazarlığı. Şık eşarp, omzunda küçük çanta, boynunda kalem. |
| `golden` | Golden retriever, 1,80 | Destek ve karşılama. Rozetli yelek, sıcak gülümseme, boynunda yaka kartı. |
| `kunduz` | Kunduz, 1,55 | Derleme ve CI hatları. Baret, kemerinde çekiç, sırtında kereste desenli çanta. |
| `kartal` | Kartal, 1,85 | Performans, hız. Havacı ceketi, alnında gözlük. Kanatlar kol gibi. |
| `bukalemun` | Bukalemun, 1,60 | Tarayıcı ve cihaz uyumluluk testi. Renk değiştiren ceket, boynunda küçük cihazlar. |
| `kanguru` | Kanguru, 1,90 | Yayına alma ve dağıtım. Kurye ceketi, karnında paket cebi. |

## NPC kadrosu (dünyanın sakinleri, ajan değil)

Caddede ve kafede yaşarlar, kimsenin terminali yoktur; sadece dünyayı canlı gösterir.

| Anahtar | Karakter | Nerede, ne yapar |
|---|---|---|
| `npc-barista` | Barista Rakun | Kafe tezgâhının arkasında. Önlüklü, boynunda havlu. Kahve hazırlar, tezgâhı siler. (Şimdiki insan baristanın yerine geçer.) |
| `npc-bekci` | Bekçi Buldog | Giriş kapısında. Üniforma, kemerinde düdük. Nöbet tutar, selam verir. |
| `npc-cicekci` | Çiçekçi Kirpi | Saksı sıralarında. Hasır şapka, önlük. Çiçekleri sular. |
| `npc-kurye` | Kurye Çita | Caddede. Kask, kurye çantası. Cadde boyunca koşar. |
| `npc-dede` | Bilge Kaplumbağa | Bankta. Bastonlu, yelekli. Güvercin besler, oturur. |
| `npc-rehber` | Tur Rehberi Zebra | Caddede. Bayraklı şapka, boynunda rehber kartı. Turist grubunu gezdirir. |

## Maliyet (Meshy, doğrudan; aslandan öğrendiğimiz hat)

Bir karakter, kaç krediyle:

| Adım | Kredi |
|---|---|
| 2 konsept görsel (nano-banana-2, tanesi 6) | 12 |
| Seçilen görselden 3D, dokulu (meshy-7.1) | 30 |
| İskelet | 5 |
| 4 temel klip (bekleme, yürüme, oturma, kahve) ve ayrıca 2 yetenek klibi, tanesi 3 | 18 |
| **Rol karakteri** | **65** |
| NPC (bekleme, yürüme, yetenek klibi; oturma ve kahve yok) | ~56 |

| Grup | Adet | Kredi |
|---|---|---|
| 13 rol karakteri | 13 | 845 |
| 10 yedek hayvan | 10 | 650 |
| 6 NPC | 6 | 336 |
| **Hepsi** | **29** | **~1.830** (aylık 5.500'ün üçte biri) |

Önce **29 konsept görsel (348 kredi)** üretilir; bakıp beğenmediğimiz değiştirilir. Sonra 3D, iskelet ve klipler gruplar
halinde, gruptan önce fiyatı yazılarak onayla üretilir. Her harcama `docs/KAYNAKLAR.md`'ye yazılır.

## Entegrasyon (kod tarafı)

- `ordu.json`'daki `character` anahtarı, `src/client/features/characters/index.ts` içindeki `CHARACTER_MODELS`'te bir modele bağlanır.
  Boy karakter başına tutulur (tablodaki boylar).
- Aynı modeli paylaşan roller (Mirket) farklı eşarp rengini malzeme adıyla alır.
- NPC'ler ayrı bir özellik olarak (`features/npcs/`) caddeye yerleştirilir; ajan işçisi değildir.
