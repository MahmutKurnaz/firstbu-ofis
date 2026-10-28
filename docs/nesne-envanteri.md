# Nesne envanteri: dünyadaki her eşyanın oyun içi ve gerçek ölçüsü

Bu belge 3B dünyadaki nesneleri, oyundaki ölçülerini ve gerçek hayattaki ölçülerini karşılaştırır. Karakter boyları 1,30-2,10 m (lider aslan 1,85 m, oyuncu 1,8 m) esas alınmıştır. Daha önce araştırılmış ölçüler (`blender/furniture.json`, `docs/mobilya-olculeri.md`) olduğu gibi kullanıldı; orada olmayanlar (laptop, kupa, TV, tahta, köpek, araba, hidrant, çöp kutusu, arcade, gong, sehpa, lamba) bu çalışmada web'den arandı. Hiçbir şey koda yazılmadı, yalnızca ölçüm ve öneri var.

## Yöntem ve okuma notları

- Ölçüler: `BoxGeometry/CylinderGeometry/box()/roundedBox()` boyutları, `src/shared/**` sabitleri ve `src/client/models/*.glb` dosyalarının POSITION erişimcisi min/max değerleri (düğüm dönüşümleri ile çarpıldı; elle node betiği). En x genişlik, der. z derinlik, yük. y yükseklik, metre. "Oyunda" sütunu yerleştirme ölçeği uygulanmış nihai boydur.
- Oran = oyun / gerçek aralığın yakın ucu. Karar: UYGUN (0,85-1,2 kat), BÜYÜK, KÜÇÜK, BİLİNMİYOR (standart yok; yaygın aralık verildi).
- Kaynak kısa kodları belge sonundaki listededir. "f.json" = `blender/furniture.json` (kaynakları orada).
- Oturan karakter: `world/character/animal.ts` karakterin kalçasını `seatAnchor` dünya yüksekliği + `SEAT_UP` (0,24 m) noktasına koyar. Yani oturan kalça = anchor y + 0,24.

## Düzeltilecekler (en büyük uyumsuzluklar, öncelik sırasıyla)

1. **Laptoplar (eski ofis masaları): 1,01 x 0,68 m, gerçek 0,356 x 0,248 m, 2,8 kat büyük.** `world/office/seats.ts:77` `laptopAnchor.scale.setScalar(1.3)`; model 0,78 x 0,52 (`features/workers/laptop.ts`). Gerçek 16 inç MacBook Pro 35,57 x 24,81 x 1,68 cm. Öneri: ölçek **0,455** (0,355 x 0,237). Aynı hata başka yerlerde: toplantı odası `MEETING_LAPTOP.scale = 1` (0,78 m, 2,2 kat; `shared/layout.ts:181`), kale `castle/seats.ts:59` 1,1 (0,86 m, 2,4 kat), yatma torbası `office/seats.ts:142` 1,05, istasyon/cadde toplantı masası `COUNCIL.tome.scale = 0,85` (0,66 m, 1,9 kat; `shared/maps/index.ts:42`). Hepsi için öneri 0,455. Cadde ve istasyonun masa laptopu (`station/seats.ts:52`, ölçek 0,5, 0,39 x 0,26) 1,10 kat, kabul edilir; istenirse 0,455.
2. **Eski ofis TV'si 6,4 x 3,6 m, 85 inç TV 1,88 x 1,06 m, 3,4 kat büyük** (`shared/layout.ts:257`). Öneri 2,2 x 1,24 (98 inç sınıfı) ya da sinema ekranı olarak bırakılacaksa adı "ekran" olsun.
3. **Köpekler 0,53-0,78 m boyunda; gerçek 0,30-0,50 m, 1,5-2,1 kat büyük.** Çalışma zamanında ölçek uygulanmıyor (`features/dog/world.ts`, `PUP_TOP = 0.71`). Glb boyları: dachshund 0,53 / pug 0,61 / pomeranian 0,65 / corgi 0,69 / pup 0,71 / shiba 0,78 m. Öneri ölçek: dachshund 0,6, pomeranian 0,5, corgi 0,6, pug 0,65, shiba 0,65, pup 0,6 (kafa tepesi hedefleri 0,32 / 0,32 / 0,41 / 0,40 / 0,50 / 0,43 m). Sahibe göre köpeğin 0,3 m'nin altına inmesi karakter bakışında okunurluğu bozabilir, ürün sahibinin tercihi.
4. **Cadde ofis masaları: oturan başına 2,5-3 m masa.** `shared/maps/cadde.ts` takım masaları uzunluk 6 / 2 koltuk, 7,5 / 3, 3 / 1. İş istasyonu başına 0,6-1,4 m olmalı. Öneri: uzunluk = koltuk x 1,4 (6 -> 2,8; 7,5 -> 4,2; 3 -> 1,4). Aynı sorun `Müdürler` (8 m / 4 koltuk = 2 m) için daha hafif.
5. **Cadde ofis kapı açıklığı: 2,4 m geniş, yaklaşık 3,47 m yüksek** (`shared/maps/cadde-props.ts:53` `OFFICE_DOOR = 2.4`; lento `cadde/offices.ts:60`, `H - 0.6`). Gerçek: kanat 0,91 x 2,13, çift kanat 1,8-2,0 m, net açıklık en az 0,81 x 2,03 (f.json). Yükseklik 1,5 kat, genişlik 1,2 kat. Öneri: genişlik **2,0**, lento altı **2,6** (2,10 m'lik zürafa için baş payı). Duvar çarpışma dikdörtgenleri `OFFICE_DOOR`a bağlı, ikisi birlikte değişmeli.
6. **Cadde koltuğu (armchair): oturma yüzü 0,65 m; gerçek 0,43-0,48 m** (`cadde/people.ts`, yastık y 0,58 + 0,07; kalça `hips: 0.74`, `shared/maps/index.ts:285`). Oran 1,4. Öneri: yastığı y 0,40 (üst 0,47), `hips` 0,58, arka 1,1 m, kol üstü 0,65.
7. **Eski ofis kanepesi 4,2 m (3 kişilik gerçek 1,83-2,44), sehpa çapı 1,8 m (gerçek 0,8-1,0), puf çapı 1,08.** `lounge.glb` (`office/props.ts:loungeCouch`, `coffeeTable`, `pouf`). Kanepe 1,9 kat, sehpa 1,9 kat. Öneri: kanepe 2,3 x 1,0 (üç yer aralığı 1,2 -> 0,7), sehpa 0,95 çap x 0,46, puf 0,6 x 0,42. Not: modelde tek eksenli ölçek gerekir (Blender'da yeniden ölçeklenmeli, uniform ölçek yüksekliği bozar).
8. **Eski ofis tavanı 6,8 m (`WALL_HEIGHT`), gerçek 3,0-3,7 m, 1,9-2,3 kat** (`shared/layout.ts:7`). Pencereler (kenar 1,1, üst 3,3) bu yüksekliğe göre; cadde (4,2 m) ve loft (2,8 m) uygun. Öneri: 4,2 (cadde ile aynı) ve pencereleri ona göre; ya da dikey yarım katlı bir ofis olduğu kabul edilsin.
9. **Eski ofis masası 2,2 x 1,1 x 0,78 m** (`shared/layout.ts:28`). Gerçek 1,2-1,8 x 0,6-0,76 x 0,71-0,76 (f.json). En 1,2-1,8 kat, derinlik 1,45-1,8 kat, yükseklik +2 cm. Öneri: 1,6 x 0,8 x 0,76. Sandalye `chair()` (`office/seats.ts:21`) oturak üstü 0,55 (gerçek 0,43-0,53), toplam yükseklik yaklaşık 1,15 (gerçek 0,95-1,09): oturağı y 0,46.
10. **KayKit parçaları (cadde ofislerindeki `furnish` ve `dress`, `cadde/kaykit.ts`):** sehpa `table_low` 0,96 x 0,60 x **0,20 m** (gerçek 0,40-0,46; 0,5 kat); buzdolabı `fridge_A_decorated` 0,90 x 1,0 x **1,125 m** (gerçek 0,6-0,9 x 0,7 x 1,8; boy 0,62 kat); `trash_A` 1,04 x 1,04 x **0,40 m** (gerçek bin 0,5-0,6 çap x 0,67-0,9; yassı); menü 0,4 x 0,64 (A-çerçeve tabela yaygın 0,6 x 1,0). Öneri: `table_low` ölçeği 0,8 -> 1,6 (0,40 yükseklik; eni 1,9 olur, kolonu ayrı kısmak gerekir) ya da `lounge.glb` sehpasını (ölçekli) kullan; dolap ölçeği 0,9 -> 1,45 (boy 1,63); `trash_A` ölçek 1,6 -> bir silindir 0,55 x 0,8 ile değiştir.

Diğer küçük sapmalar (ilk 10'a girmeyenler): oyuncu göz yüksekliği 1,4 m (`player/camera.ts:11`) 1,8 m'lik oyuncu için 1,65-1,70 olmalı (ayakta göz boyu yaklaşık 0,93 x boy; kaynak aranmadı, antropometri genel bilgisi); eski ofis ajan kiosku 0,55 m yüksek (`KIOSK.height`), 1,85 m ajanın dizi hizasında, gerçek kürsü 1,0-1,1 (kürsü standardı bulunamadı, yaygın); beyaz tahta 4,0 x 2,2 (gerçek büyük toplantı tahtası 2,4 x 1,2, 1,7-1,8 kat; öneri 3,0 x 1,5); kale masa üstü 0,78 (diğer haritalar 0,76); mutfak buzdolabı 1,10 x 1,05 x 2,2 (gerçek 0,6-0,9 x 0,7 x 1,8).

## Oturan karakter: koltukla çakışma kontrolü

Oturan kalça = `seatAnchor.y + 0,24`. Lider aslan 1,85 m'de `sit` klibinin kalçası kendi yüksekliğinin yaklaşık 0,34'ü (0,63 m, glb içinden okundu); "kalça 0,6 m" bu kliptir. Gerçek kalça eklemi oturak yüzünün 0,08-0,12 m üstündedir.

| Yer (dosya:satır) | Anchor y | Kalça y | Oturak üstü | Fark | Karar |
| --- | --- | --- | --- | --- | --- |
| İstasyon/cadde bank ve masa başı (`station/seats.ts:56`, `BENCH_TOP - 0.08`) | 0,37 | 0,61 | 0,45 bank; 0,46 `ofis-sandalye`; 0,48 `yonetici-koltuk` | +0,13..0,16 | Çakışma yok, 4-6 cm havada. Öneri anchor 0,32 (kalça 0,56). |
| Eski ofis masaları (`office/seats.ts:84`) | 0,40 | 0,64 | 0,55 (`chair()`) | +0,09 | UYGUN (ama oturak yüksek, bkz. madde 9). |
| Toplantı odası eski (`office/meeting-room.ts:22`) | 0,40 | 0,64 | 0,55 | +0,09 | UYGUN. |
| Toplantı yuvarlak masa (`station/seats.ts:199`, kale 214) | 0,46 | 0,70 | 0,52 | +0,18 | 8-10 cm havada. Öneri anchor 0,38. Arka 1,34 m (toplantı sandalyesi gerçek 0,92). |
| Cadde koltuğu / throne (`hips 0.74`) | - | 0,74 | 0,65 | +0,09 | Çakışma yok; koltuk fazla yüksek (madde 6). |
| Eski ofis kanepe (`hips 0.5`, `layout.ts:461`) | - | 0,50 | 0,47 | +0,03 | **Kalça yastığa gömülür** (5-8 cm). Öneri hips 0,56. |
| Puf (`hips 0.42`, `layout.ts:463`) | - | 0,42 | 0,42 | 0 | **Kalça yüzeyde, gömülür** (yaklaşık 8 cm). Öneri hips 0,50. |
| Yatma torbası (`office/seats.ts:147`) | 0,32 | 0,56 | 0,62 | -0,06 | Kasıtlı gömülü; UYGUN. |
| Boss sandalyesi / bank / tabureler (`layout.ts:467-473`) | - | 0,62 / 0,47 / 0,50 / 0,78 | modelsiz değerler | - | Bu çalışmada ölçülmedi. |

Boy kaynaklı çakışma: kalça yüksekliği karakter boyundan bağımsız sabit (0,61). Klip kalçası boyla orantılı varsayılırsa (tahmin): mirket 1,30 -> klip 0,44, ayak 17 cm havada sallanır; kaplan/geyik 1,95 -> 0,66 (ayak yere 5 cm gömülür); ayı/fil 2,00 -> 0,68 (7 cm); zürafa 2,10 -> 0,72 (11 cm gömülür, diz masanın altına çıkar: masa alt yüzü yaklaşık 0,68). Öneri: `AnimalSkin` içinde `seatHips` değerini `0,34 x height` ile sınırlamadan, anchor'a `0,61 x height / 1,85` vermek (kalça yüksekliği boyla büyüsün).
Koltuk mesafesi: kalça masa kenarından yaklaşık 0,40 m (bank, `PLACE_IN 0,35 + BENCH_OUT 0,52`) ve 0,65 m (cadde `buildDesks`: sandalye masa ortasından 1,1 m, masa kenarı 0,35). Çakışma yok; 0,65 m erişim için biraz uzak (öneri sandalye 0,95 m, `cadde/suite.ts` `nx * 0.85` -> `0.70`).

## 1. Cadde (ana harita): ofisler, bina kabukları, sokak mobilyası

Kaynak `shared/maps/cadde.ts`, `world/cadde/*`.

| Nesne | Yer | Oyunda (en x der. x yük., m) | Gerçekte | Kaynak | Oran | Karar | Öneri |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Takım ofisi | `cadde-props.ts:41`, `offices.ts` | 14 x 18 x 4,2 | Sınıf A ofis tavanı 3,0-3,7, kat arası 3,75-4,3 | f.json (floor-cre) | 1,15 | UYGUN (üst uç) | 3,9 de olur |
| Yönetim suiti | `cadde.ts:35` | 44 x 10 x 4,2 | aynı | aynı | - | UYGUN | - |
| Ofis dış duvarı, çatı | `offices.ts:43-64` | duvar 0,2; çatı levha 0,3 | Dış duvar 0,1-0,3 | standart yok, yaygın | - | UYGUN | - |
| Cam bölme | `offices.ts:45-52` | cam 4,0 m boy, 0,03 kalın, kolon 0,09, aralık 2,2 | Zemin-tavan vitrin camı 2,5-4 m panel | standart yok | - | UYGUN | - |
| Kapı açıklığı | `offices.ts:60` | 2,4 x 3,47 | 1,8-2,0 x 2,03-2,13 | f.json (door-civils) | 1,2 / 1,6 | BÜYÜK | 2,0 x 2,6 (madde 5) |
| Ağaç yatağı + ağaç | `props.ts:23` -> `meshy agac` | 2,2 x 2,2 x 3,97 | Sokak ağacı 3-3,6 m (fidan), olgun 8+; çukur 1,35-1,5 | f.json (tree-honolulu, tree-sydney, tree-stock) | 1,2 (boy) | UYGUN (genç ağaç) | Büyütmek için boy 5,0 |
| Sokak lambası | `props.ts:38` -> `lamba` | 1,3 x 0,45 x 4,5 | Yaya lambası 3-5 m, kaldırımda 4,5-6 | f.json (lamp-gdc, lamp-encinitas) | 1,0 | UYGUN | - |
| Ekili saksı kutusu | `props.ts:62` -> `saksi` | 3,2 x 0,85 x 1,17 (ölçek 1,07) | 0,6-1,8 m uzun, en büyükler 3,0 x 1,07 x 1,2 | f.json (planter-pots) | 1,07 | UYGUN (büyük uç) | - |
| Park bankı | `props.ts:77` -> `bank` | 2,0 x 0,67 x 0,94 (ölçek 1,11) | 3 kişilik 1,8, oturak 0,45-0,48, sırt 0,30-0,46 üstü | f.json (bench-wabash, bench-dambis) | 1,11 | UYGUN (oturak 0,51, hafif yüksek) | ölçek 1,0 (oturak 0,46) |
| Kafe masası + şemsiye + tabureler | `props.ts:95` -> `kafe-masasi` | 2,7 x 2,7 x 2,4; çarpışma sadece 1,1 x 1,1 | Bistro masa 0,71-0,76, 9 ft şemsiye 2,3-2,45 | f.json (cafe-bbqguys, umbrella-jeco) | 1,0 | UYGUN | Taburelerin çarpışması yok (yürüyerek geçilir) |
| Kafe tezgahı + makine | `props.ts:117` -> `kahve-tezgahi` | 4,0 x 1,1 x 1,75; üst 1,05 | Tezgah 0,91-1,07 | f.json (cafe-bbqguys) | 1,0 | UYGUN | - |
| Kahve makinesi (zemin) | `props.ts:175` -> `kahve-makinesi` | 0,9 x 0,7 x 1,8 | Ayakta içecek makinesi yaklaşık 1,8 | f.json (machine-ggm) | 1,0 | UYGUN | - |
| Kahve makinesi çarpışma kutusu | `station/props.ts:169` `STATION_SIZE.dispenser` | 1,3 x 0,7 | model 0,9 x 0,7 | - | 1,4 (en) | Küçük hata | 1,0 x 0,7 |
| Toplantı masası (yuvarlak) | `station/seats.ts:96`, `COUNCIL` | çap 2,6 x 0,78; 5 sandalye 1,7 m yarıçap | Yuvarlak masa 6 kişi 1,2-1,5, 8 kişi 1,8-2,1, 10 kişi 2,4 (kaynak yok; yaygın) | BİLİNMİYOR (standart yok) | - | 5 kişiye büyük | çap 1,9 |
| Toplantı sandalyesi (yuv.) | `seats.ts:`briefingChair | 0,54 x 0,52 oturak; oturak 0,52; sırt 1,34 | Oturak 0,43-0,53, sırt 0,9 | f.json (chair-branch) | 1,45 (sırt) | Sırt BÜYÜK | sırt üstü 0,95 |
| Sunum ekranı + ayakları | `seats.ts:116-141` | 2,52 x 1,62 (içi 2,3 x 1,4), merkez y 1,95 | 98-105 inç TV 2,2 x 1,25 | web (tv-wepc) | 1,05 | UYGUN | - |
| Ajan konsolu (pano ajanları) | `seats.ts:agentConsole` | taban çap 0,72; ayak 0,92; tabla 0,8 x 0,5, y 1,0, 20° eğik | Ayakta kürsü 1,0-1,1 | BİLİNMİYOR (yaygın) | 1,0 | UYGUN | - |
| Duvar panoları | `shared/maps/cadde.ts:57-62` | 3,2 x 2,0, alt kenar 1,3 | Büyük toplantı tahtası 2,4 x 1,2 | web (wb-stationeryworld) | 1,3 / 1,7 | Biraz BÜYÜK, uzaktan okunur | 2,6 x 1,6 |
| Gong | `shared/layout.ts:279`, `features/gong/world.ts` | 1,9 x 0,7 x 2,45 (çerçeve) | Tam-tam çapı 0,8, tam sehpa yaklaşık 1,8 | web (gong-thomann) | 1,3 (boy) | UYGUN (çerçeve), disk için bkz. | disk çapı kontrol (bu çalışmada ölçülmedi) |
| Koltuk (armchair) | `people.ts` | 1,15 x 1,0 x 1,3; oturak 0,65 | Oturak 0,43-0,48 (kanepe verisinden) | f.json (sofa-castlery) | 1,4 | BÜYÜK (oturak) | madde 6 |
| Barista (Person) | `people.ts` | önlük 0,32 yarıçap, 0,3-0,92 | Boy bilinmiyor (Person sınıfı) | - | - | BİLİNMİYOR | karakter boyu doğrulanmalı |
| Yoldan geçenler | `passersby.ts` | Person, 1,1 m/s yürüyüş | insan yürüyüşü 1,2-1,4 m/s | genel bilgi | 0,85 | UYGUN | - |
| Kapı üstü tabela | `offices.ts` | `textPlane` x 1,3 | - | - | - | BİLİNMİYOR | - |
| Giriş kapısı (kapı kemeri) | `shell.ts` | direk 0,6 x 5,2; kiriş 7,2 x 0,7 yüksek 5,4 | - | - | - | Dekor, standart yok | - |
| Kaldırım şeridi, bulvar | `shell.ts` | bordür 0,25 x 0,08; bulvar 18 m | Yaya caddesi 6-20 m | genel bilgi | - | UYGUN | - |
| Şehir kuleleri | `shell.ts:tower` | 11 x 10 x 34-74; kat 3,3; pencere 1,95 x 2,2 | Ofis kat 3,5-4,3 | f.json (floor-cre) | 0,9 | UYGUN | - |
| KayKit binaları (kenar sıra) | `kaykit.ts:138`, SCALE 5 x 1,5-1,9 | 9-19 m geniş, 11,6-28 m yüksek | 3-7 kat | f.json | - | UYGUN | - |
| Çalı `bush` | `kaykit.ts:109`, ölçek 5 | 0,95 x 1,0 x 1,9 | Süs çalısı 0,9-1,5, çit 1,8 | BİLİNMİYOR (yaygın) | 1,3 | Biraz BÜYÜK | ölçek 4 (1,5 m) |
| Yangın musluğu `firehydrant` | `kaykit.ts:117`, 5 x 0,8 | 0,56 x 0,52 x 0,88 | Direkli hidrant 0,75-1,2 çıkış yüksekliği | web (hydrant-qfes, hydrant-protenders) | 1,0 | UYGUN | - |
| Çöp `trash_A` | `kaykit.ts:118`, 5 x 1,6 | 1,04 x 1,04 x 0,40 | 0,5-0,6 çap x 0,67-1,1 | web (bin-witt) | 1,9 (en), 0,5 (boy) | BÜYÜK/yassı | madde 10 |
| Menü sehpası | `kaykit.ts:127` | 0,4 x 0,24 x 0,64 | A-çerçeve 0,6 x 1,0 | BİLİNMİYOR | 0,65 | KÜÇÜK | ölçek 1,6 -> 2,4 |
| Crate (havuç sandığı) | `kaykit.ts:126` | 0,6 x 0,6 x 0,28 | Sebze sandığı 0,6 x 0,4 x 0,3 | BİLİNMİYOR | 1,0 | UYGUN | - |

Kafe çevresi: `kitchencounter_straight_A_decorated`, `table_round_A_small_decorated`, `chair_A`, `chair_stool` KayKit parçaları yerleştirilmiyor (yalnız fridge, crate, menu), ölçüleri yine de kayıt için: tezgah 1,0 x 1,05 x 1,13 (ölçek 0,5), yuvarlak masa 0,75 x 0,9 x 0,75, sandalye 0,38 x 0,6 x 0,4, tabure 0,38 x 0,25 x 0,38 (hepsi 0,5 ölçekle; masa 0,9 m yüksek, bistro 0,71-0,76 -> 1,2 kat).

### 1.1 Takım ofislerinin içi (`cadde/interiors.ts`, `kaykit.ts furnish`)

| Nesne | Oyunda | Gerçekte | Karar |
| --- | --- | --- | --- |
| Kitaplık (`kitaplik`) | 0,9 x 0,33 x 1,83 | 0,76-1,07 x 0,30-0,38 x 1,83 (f.json) | UYGUN |
| Kanepe (`kanepe`, Meshy) | 2,0 x 0,9 x 0,85, oturak 0,45 | 1,83-2,44 x 0,81-1,0 x 0,76-0,91 (f.json) | UYGUN |
| KayKit kanepe `couch_pillows` | 1,5 x 0,8 x 0,61 | 3'lü 1,83-2,44; 2'li 1,5-1,8 | 2'li olarak UYGUN, sırt 0,61 düşük (min 0,76) |
| KayKit halı | 1,35 x 0,9 | Küçük halı 1,2 x 1,8 ve üstü | KÜÇÜK, ölçek 0,9 -> 1,4 |
| KayKit ayaklı lamba `lamp_standing` | 0,5 x 0,5 x 1,26 | 1,47-1,83 (web: lamp-govee) | KÜÇÜK (0,8 kat), ölçek 0,5 -> 0,65 |
| Sunucu rafı | 1,0 x 0,9 x 2,1 | 19 inç raf: 0,6 x 1,0 x 2,0 | UYGUN (en geniş) |
| Ekran duvarı (güvenlik) | 8 ekran 1,5 x 0,95 | 65 inç TV 1,45 x 0,82 | UYGUN |
| Dolap (güvenlik) | 0,8 x 0,55 x 2,0 | 0,3-0,45 x 0,45-0,5 x 1,8-1,9 (çift) | Biraz BÜYÜK |
| Laboratuvar tezgahı | 6,4 x 1,0 x 0,9 | Tezgah 0,9, derinlik 0,6-0,75 | Derinlik BÜYÜK (1,3 kat), uzunluk büyük ama kabul |
| Tuval (easel) | 1,1 x 0,9 levha, ayak 1,6 | 1,5-1,8 | UYGUN |
| Harita panosu | 7,4 x 3,2 | Duvar haritası 1,5-3 | BÜYÜK (dekor), kabul |
| Sandık | 0,56 x 0,45-0,7 | - | BİLİNMİYOR |
| Bitkiler `plant()` (cadde köşe/kapı) | monstera 1,3: saksı 0,73, toplam 1,68; ficus 1,3: 0,73 / 1,73; yılan bitkisi 1,1: 0,62 / 1,50 | Büyük yer saksısı 0,6-0,75; ficus 1,2-1,8; monstera 0,9-1,5 (f.json planter-pots) | UYGUN (monstera üst uç) |
| Tavan ışıkları | 1,4 x 0,5 panel | Panel 0,6 x 0,6 - 0,3 x 1,2 | BÜYÜK (2,3 kat), kabul (dekor) |

### 1.2 Yönetim suiti (`cadde/suite.ts`)

| Nesne | Oyunda | Gerçekte | Karar |
| --- | --- | --- | --- |
| Toplantı masası | 3,8 x 1,4 x 0,76 (10 kişi) | 3,0-3,7 x 1,2-1,5 (f.json) | UYGUN |
| Toplantı sandalyesi (`toplanti-sandalye`) | 0,6 x 0,6 x 0,92, oturak 0,46 | 0,43-0,53 / 0,9 | UYGUN |
| Yönetici masası | 1,8 x 0,9 x 0,76 | 1,5-1,8 x 0,76-0,91 x 0,71-0,76 | UYGUN |
| Yönetici koltuğu | 0,72 x 0,72 x 1,2, oturak 0,48 | oturak 0,45-0,55; toplam 1,25 | UYGUN |
| Cam bölme paneli | alt panel 0,9, cam, pirinç 0,12 | alt panel 0,9, korkuluk 1,07 | UYGUN |
| Duvar ekranı | 5,2 x 2,5 | 98 inç 2,2 x 1,25; video duvarı 4-5 m | BÜYÜK, video duvarı olarak kabul |
| Yan beyaz tahta | 3,2 x 1,4 | 2,4 x 1,2 | 1,3 kat, kabul |
| Ofis masası (`ofis-masa`) | 1,4 x 0,7 x 0,76 | 1,2-1,8 x 0,6-0,76 | UYGUN |
| Ofis sandalyesi | 0,62 x 0,62 x 1,0, oturak 0,46 | f.json | UYGUN |
| Kahve köşesi tezgahı | 3,6 x 1,0 x 0,9 (üst 1,05) | 0,91-1,07 | UYGUN |

### 1.3 Masalar ve oturaklar (istasyon bileşenleri)

| Nesne | Yer | Oyunda | Gerçekte | Karar |
| --- | --- | --- | --- | --- |
| Bank-masa (`look` yok) | `station/seats.ts:24-40` | tabla 0,08 kalın, üst **0,76**, en 1,4, uzunluk 3-7,5; yan oturak 0,44 geniş, üst **0,45**, masa kenarına 0,30 | Masa 0,71-0,76, oturak 0,43-0,48 (f.json) | UYGUN |
| Masa laptopu | `seats.ts:52` | 0,39 x 0,26 x 0,03 (kapalı), açık kapak 0,25 | 16" 0,356 x 0,248 x 0,017 | 1,10 kat, UYGUN (öneri 0,455) |
| Klavye (laptop içinde) | `laptop.ts:63-64` | tuş alanı 0,33 x 0,12 (ölçek 0,5) | 16" laptop tuşları yaklaşık 0,29 x 0,11 | UYGUN |
| Izgara (trackpad) | `laptop.ts:65` | 0,10 x 0,055 | 16" 0,16 x 0,10 (web: laptop-dimensions) | KÜÇÜK (0,6 kat), önemsiz |
| Kupa (cadde/istasyon) | `seats.ts:64` | çap 0,10 x 0,11 | 11 oz: çap 0,082-0,085, boy 0,096-0,098 (web: mug) | 1,2 kat, UYGUN (ölçek 0,85 olabilir) |
| Not defteri / altlık | `seats.ts:65` | 0,20 x 0,28 x 0,012 | A5 0,15 x 0,21; A4 0,21 x 0,30 | UYGUN |
| Tam boy klavye (varsa) | - | yok (karakterler laptopta yazar) | 0,43-0,46 x 0,13-0,15 (web: keyboard) | - |

## 2. Eski ofis (`world/office/*`, `shared/layout.ts`): yalnız ana farklar

| Nesne | Yer | Oyunda | Gerçekte | Oran | Karar |
| --- | --- | --- | --- | --- | --- |
| Zemin-tavan | `layout.ts:7` | 6,8 | 3,0-3,7 | 1,9-2,3 | BÜYÜK (madde 8) |
| Loft | `layout.ts:164` | zemin y 3, yükseklik 2,8 | 2,7-3,0 | 1,0 | UYGUN |
| Masa | `layout.ts:28` | 2,2 x 1,1 x 0,78 | 1,2-1,8 x 0,6-0,76 x 0,71-0,76 | 1,2-1,8 | BÜYÜK (madde 9) |
| Masa laptopu | `office/seats.ts:77` | 1,01 x 0,68 | 0,356 x 0,248 | 2,8 | BÜYÜK (madde 1) |
| Kupa (`deskMug`) | `office/props.ts` | 0,12 çap (+kulp 0,15) x 0,12 | 0,085 x 0,097 | 1,4 / 1,25 | BÜYÜK, ölçek 0,78 |
| Kitap grupları | `desk_props.glb` | 0,25 x 0,18 x 0,23 | Üst üste 4-6 kitap yaklaşık 0,25 x 0,2 x 0,15 | 1,0 | UYGUN |
| Sukulent | `plants.glb` | 0,20 x 0,20 x 0,22 | 0,1-0,25 | 1,0 | UYGUN |
| Yer bitkileri `PLANTS` | `layout.ts:282`, ölçek 0,9-1,5 | ficus 1,5 ölçek: saksı 0,84, boy 2,0 m | Saksı 0,6-0,75, ficus 1,2-1,8 | 1,3 | Ölçek 1,5 ve 1,4 BÜYÜK; üst sınır 1,2 |
| Kanepe / sehpa / puf | `lounge.glb` | 4,2 / 1,8 çap / 1,08 çap | 1,83-2,44 / 0,8-1,0 / 0,5-0,6 | 1,9-2,0 | BÜYÜK (madde 7) |
| Yastık | `lounge.glb` | 0,46 x 0,17 x 0,44 | 0,4-0,5 | 1,0 | UYGUN |
| Mutfak tezgahı | `kitchen.glb` | 5,1 x 1,13 x 1,03 (üst) | Tezgah 0,91-1,07 | 1,0 | UYGUN |
| Mutfak makinesi | `kitchen.glb` | 0,61 x 0,68 x 0,74 | Ticari 2 grup yaklaşık 0,7 x 0,6 x 0,5 | 1,3 (boy) | Biraz BÜYÜK, kabul |
| Buzdolabı | `kitchen.glb` | 1,10 x 1,05 x 2,2 | 0,6-0,9 x 0,7 x 1,8 | 1,3-1,5 | BÜYÜK |
| Pano (4 adet) | `layout.ts:245` | 6 x 3, y 2,1 | 2,4 x 1,2 | 2,5 | BÜYÜK |
| Büyük TV | `layout.ts:257` | 6,4 x 3,6 | 1,88 x 1,06 (85 inç) | 3,4 | BÜYÜK (madde 2) |
| Makine monitörü | `layout.ts:263` | 2,3 x 1,3 | 105 inç 2,3 x 1,3 | 1,0 | UYGUN |
| Toplantı panosu | `layout.ts:197` | 3,6 x 1,2 | 2,4 x 1,2 (4 x 8 ft) | 1,5 | Hafif BÜYÜK |
| Müzik kutusu | `layout.ts:265` | 1,3 x 0,72 x 1,85 | Jukebox yaklaşık 0,9 x 0,7 x 1,5-1,6 (kaynak aranmadı) | 1,2 | BİLİNMİYOR |
| Arcade kabin | `layout.ts:267` | 0,8 x 0,8 x 1,9 | 0,6-0,75 x 0,9 x 1,5-1,8 (web: arcade) | 1,1 | UYGUN |
| Kitap rafı | `layout.ts:274` | 1,7 x 0,42 x 2,3 | 0,76-1,07 x 0,3-0,38 x 1,83 | 1,6 (en) | BÜYÜK |
| Gong | `layout.ts:279` | 1,9 x 2,45 | bkz. cadde | 1,3 | UYGUN |
| Beyaz tahta (tekerlekli) | `layout.ts:308` | 4,0 x 2,2, alt 0,5 | 2,4 x 1,2 | 1,7 | BÜYÜK (öneri 3,0 x 1,5) |
| Basketbol potası | `shared/hoop.ts` | halka y 3,05, çap 0,5; tahta 1,4 x 1,05, alt 2,88 | 3,05 m; halka 0,457; tahta 1,83 x 1,07, alt yaklaşık 2,9 (web: hoop) | 1,0 | UYGUN (tahta eni 0,77 kat) |
| Korkuluk üstü | `layout.ts:393` | 1,09 | 1,07-1,1 | 1,0 | UYGUN (kod 42 inç korkuluk, web: sill-codes) |
| Pencere | `layout.ts:345` | 3,0 x 2,2, denizlik 1,1 | Denizlik 0,9-1,1 | 1,0 | UYGUN |
| Çıkış kapısı | `layout.ts:355` | 1,4 x 2,4 | 0,91 x 2,13 | 1,5 (en) | BÜYÜK |
| Balkon kapısı | `layout.ts:369` | 3,0 x 2,5 | Sürgülü cam kapı 1,8-3,0 x 2,1-2,4 | 1,0 | UYGUN |
| Asansör | `layout.ts:530` | kapı 1,4 x 2,4; kabin 2,3 x 2,1 | Yolcu asansörü kapı 0,9-1,1 x 2,1; kabin 1,1 x 1,4 - 2,0 x 1,5 (kaynak aranmadı) | 1,3-1,6 | BÜYÜK (yük asansörü boyu) |
| Merdiven | `layout.ts:166` | 15 basamak, yükseliş 0,20, genişlik 0,40 | Yükseliş 0,15-0,18, basamak 0,28 | 1,1-1,3 | Biraz dik/uzun, kabul |
| Ajan kiosku (eski) | `layout.ts:155` | 0,8 x 0,5 x 0,55 | Kürsü 1,0-1,1 | 0,5 | KÜÇÜK |
| Toplantı masası (eski) | `layout.ts:175` | 4,2 x 1,7 x 0,76, 5 sandalye | 10 kişilik 3,0-3,7 x 1,2-1,5 | 1,2 | 5 kişiye büyük, kabul |
| Tavan lambası (sarkıt) | `office/props.ts:pendant` | gölge çap 0,8 | 0,4-0,8 | 1,0 | UYGUN |
| Yatma torbası | `office/seats.ts:96` | çap 1,24 x 0,62 | Büyük bean bag 0,9-1,2 çap x 0,6-0,7 | 1,0 | UYGUN |
| Arabalar (Lambo/Ferrari) | `shared/garage.ts:11` | 4,6 x 2,0 x 1,12 | Sedan 4,63 x 1,78 x 1,44; spor araba 4,5 x 1,95 x 1,2 (web: car-corolla) | 1,0 | UYGUN |
| KayKit arabaları (`car_sedan` vb.) | `kaykit-city.glb` | 2,1 x 4,7 x 1,85 (x5) | 1,78 x 4,63 x 1,44 | 1,0 / 1,3 (boy) | Kullanılmıyor (yerleştirilmiyor) |

## 3. Kale haritası (kısaca) ve istasyon haritası (kısaca)

**Kale** (`world/castle/*`, `shared/maps/castle.ts`, `props.ts`): salon yüksekliği 13 m (ortaçağ büyük salonları 10-15 m, UYGUN, kaynak aranmadı); masa üstü 0,78 (`castle/kit.ts:13`, diğerleri 0,76, +2 cm, UYGUN ama tutarsız), oturak 0,45; sütun 1,3 x 1,3, heykel 1,3 x 1,3, zırh çapı 0,84, şömine 3,6 x 1,1, fıçı 1,7 x 1,0, gong 2,1 x 0,7, tahtın kürsüsü 12 x 5 x 0,9; pencere 2,3 x 5,2 (sill y 6,4); laptop 'cilt' (tome) ölçeği 0,85, masa laptopu 1,1 (madde 1). Gerçek karşılıklar için standart yok (dekor); ölçü uyum açısından karakterlerle uyumlu (zırh 0,84 çap, 1,85 m'lik karaktere göre geniş).

**İstasyon** (`world/station/*`, `shared/maps/station*.ts`): gemi içi dekor; masa üstü 0,76, oturak 0,45 (UYGUN); kaptan koltuğu 1,1 x 1,0, oturak 0,66, sırt 1,35+, podyum 0,6 (kaptan koltuğu için standart yok); dümen konsolları 1,9 x 0,86; hidroponik saksı 2,4 x 0,7 (`STATION_SIZE.planter`); kahve dağıtıcısı 1,3 x 2,0 x 0,7 (zemin içecek makinesi 1,8 m, 1,1 kat, UYGUN); panolar 4,4 x 2,6; ekranlar 4 x 2,2 ve 3,2 x 1,8 (BÜYÜK, kabin ekranı); pencere 7,6 x 4,6. Kaptan koltuğunun hips değeri `shared/maps/index.ts:285` ile ortak (0,74): çubuk oturak 0,66 + 0,08, UYGUN.

## 4. Karakterler ve diğer canlı nesneler

| Nesne | Oyunda | Gerçekte | Karar |
| --- | --- | --- | --- |
| Lider aslan | 1,85 m (`world/character/animal.ts:16`) | 95. yüzdelik erkek 1,87, ortalama 1,755 | UYGUN |
| Oyuncu (Mahmut) | 1,8 m model; göz yüksekliği 1,4 | göz yüksekliği yaklaşık 1,67 | Göz KÜÇÜK |
| Diğer karakterler | 1,30-2,10 (`docs/karakterler.md`) | - | UYGUN (hayvan boyları) |
| Oturunca baş tepesi | `SITTING = 0.92` x boy (`animal.ts:23`), aslanda 1,70 m | Oturak 0,45 + oturan gövde-baş yüksekliği yaklaşık 0,9 = yaklaşık 1,35-1,45 m (tahmin; kaynak aranmadı, bkz. people-gvsu oturan göz 0,75-0,80) | BÜYÜK olabilir; yalnız etiket/balon yüksekliğini etkiler, kontrol edilmeli |
| Köpekler | 0,53-0,78 m | 0,30-0,50 | BÜYÜK (madde 3) |
| Köpek isim etiketi | tepe + 0,29 | - | - |

## Kaynaklar

- f.json kodları (tree-honolulu, tree-sydney, tree-stock, lamp-gdc, lamp-encinitas, bench-wabash, bench-dambis, cafe-bbqguys, umbrella-jeco, umbrella-golden, machine-ggm, planter-pots, desk-din, desk-guide, desk-ansi, chair-branch, chair-zoro, sofa-castlery, sofa-interior, bookcase-of2go, door-civils, floor-cre, conference-of2go, conference-branch, people-ncsu, people-gvsu): URL'ler `blender/furniture.json` `sources` ve `docs/mobilya-olculeri.md` içinde.
- laptop-dimensions: https://www.gearpatrol.com/tech/a652166/macbook-16-inch-size-weight-difference/ ve https://dimensions.com/element/apple-macbook-pro-16-inch-5th-generation (16 inç: 35,57 x 24,81 x 1,68 cm)
- mug: https://coffeifymug.com/blogs/news/coffee-mug-dimensions-sizes-fit-and-what-to-check-before-buying (11 oz: 9,5-9,8 cm boy, 8,1-8,5 cm çap; resmi standart yok, perakende ilanları)
- wb-stationeryworld: https://stationeryworld.com.sg/whiteboard-120-x-240cm-4-x-8-foot (4 x 8 ft = 120 x 240 cm), https://www.officefurniture2go.com/answers/whiteboards-boards/whiteboard-for-conference-room.html
- tv-wepc: https://www.wepc.com/tv/85-inch-tv-dimensions/ (85 inç: yaklaşık 188-191 x 106-110 cm)
- keyboard: https://dareu.com/blogs/news/full-size-keyboard-dimensions (tam boy yaklaşık 45 x 14,5 cm)
- hydrant-protenders: https://www.protenders.com/en/products/pillar-fire-hydrants-2 ; hydrant-qfes: https://fire.qld.gov.au/sites/default/files/2021-08/QFES-InfoSheet-SRMarinas-Links.pdf (çıkış 750-1200 mm; tek bir resmi hidrant yüksekliği standardı bulunamadı)
- car-corolla: https://www.carexpert.com.au/toyota/corolla/2024/dimensions (4630 x 1780 x 1435 mm)
- bin-witt: https://www.webstaurantstore.com/witt-industries-whd32c-32-gallon-galvanized-steel-heavy-duty-outdoor-commercial-trash-can/692WHD32C.html (66,7 cm boy x 54 cm çap; sokak çöp kutuları için standart yok, 0,66-1,1 m x 0,5-0,63 m)
- dogs: https://scrumbles.co.uk/blogs/dog/40-small-dog-breeds (omuz yüksekliği: dachshund 20-33, corgi 24-28, shiba 33-40 cm), https://articles.hepper.com/small-dog-breeds/ (pug 33-43, pomeranian 15-18 cm); kalite düşük, ırk standartları ile teyit önerilir.
- gong-thomann: https://www.thomann.co.uk/thomann_wuhan_tam_tam_75.htm (tam-tam 80 cm çap; stand yüksekliği bulunamadı)
- coffee-table: https://www.architecturelab.net/what-is-the-perfect-height-of-a-coffee-table/ (16-18 inç = 0,41-0,46 m)
- lamp-govee: https://us.govee.com/blogs/smart-lamps/how-tall-should-a-floor-lamp-be (ayaklı lamba 1,47-1,83 m)
- arcade: https://macmyths.com/how-to-choose-the-right-arcade-cabinet-for-your-space/ (dik arcade 60-72 inç, 24 inç en, 24-36 inç derinlik; ikincil kaynak)
- hoop: https://www.dimensions.com/element/basketball-hoop (3,05 m, 18 inç halka; tahta ölçüsü kaynaklarda çelişkili, 183 x 107 cm)
- sill-codes: https://www.thebuildingcodeforum.com/forum/threads/ibc-1013-8-window-sill-height-and-4-opening-limitation.12061 (forum, resmi metin değil; korkuluk 42 inç = 1,07 m)

Standardı bulunamayan, "BİLİNMİYOR" işaretli veya "yaygın uygulama" denen satırlar: yuvarlak toplantı masası çapı, ajan kürsüsü, kafe menü sehpası, jukebox, asansör kabini, çalı, kale ve istasyon dekoru, kaptan koltuğu, armchair (kanepe verisinden türetildi), hidrant resmi yüksekliği, çöp kutusu.
