# Nesne envanteri 2: ekran görüntüsüne bakarak, her haritadaki her nesnenin kalitesi

Bu belge `docs/nesne-envanteri.md` (ölçü karşılaştırması) belgesinin tamamlayıcısıdır. Orada ölçülere bakıldı; burada **gözle**, başsız Chrome'da her haritayı ve her alanı gezip aldığımız ekran görüntülerine bakarak her nesnenin **ne kadar iyi göründüğü** değerlendirildi. Hiçbir kod değişmedi; yalnızca bu belge ve ekran görüntüleri üretildi.

## Yöntem

- Uygulama `localhost:4600` (cadde, çalışanlı gerçek proje) ve `localhost:4601` (geçici boş proje klasörüyle ikinci sunucu; ofis, kale ve istasyon haritaları ona `map.set` mesajıyla seçtirildi) üzerinde, playwright-core + sistem Chrome (`--use-angle=swiftshader`) ile gezildi. `window.__office.player` konumu/kamerası ile her alanın önüne gidilip 2 sn beklenerek 1000x640 görüntü alındı; oyuncunun kendi avatarı çekimlerde gizlendi. `/Users/mahmutkurnaz/firstbu` dosyalarına dokunulmadı.
- Ekran görüntüleri: `TARAMA/<harita>/<ad>.png`, her harita için temas sayfaları `TARAMA/<harita>-sheet-N.png` (ofis için `TARAMA/office-sheets/`).
  `TARAMA = /private/tmp/claude-501/-Users-mahmutkurnaz-Library-Application-Support-Claude-scratch-workspaces-0e56c1d2-15a4-477c-be1c-5a168731cf34-9ac6656c-32d2-42f1-87e4-5e2de2e8f34d-scratch-2026-10-27-cd43c5/74332cd9-9328-4f5c-b579-b413bf319b1a/scratchpad/tarama`
  Çekim betikleri: `.../scratchpad/scripts/shoot.cjs` (kamera), `sheet.cjs` (temas sayfası). Çekim listeleri: `office.json`, `office-ext.json`, `roof.json`, `cadde.json`, `cadde2.json`, `castle.json`, `station.json`.
- Karar ölçeği (ekran görüntüsünden): **PREMIUM** = Meshy/özenli model, yakından da iyi; **ORTA** = temiz ama basit/düz, kimseyi rahatsız etmez; **KÖTÜ** = yakından ya da orta uzaklıktan bile "yapma" duruyor (kütük gibi, düz levha, bulanık doku).
- "Hazır premium var mı": `src/client/models/meshy-props.glb` içindeki anahtarlar (`MESHY_KEYS`, `world/cadde/meshy.ts:12`): agac, lamba, bank, kafe-masasi, kahve-tezgahi, kahve-makinesi, saksi, ofis-masa, cicek-saksi, ofis-sandalye, yonetici-masa, yonetici-koltuk, kanepe, kitaplik, fikus, toplanti-sandalye, agac-genis, agac-ince, cali, cop-kutusu, hidrant, kafe-koltuk, kiosk, gong, kapi, konsey-masasi, kursu, pano-cercevesi, buzdolabi, menu-sehpasi; karakter olarak `npc-*.glb`, hayvan karakterleri ve köpek glb'leri. "Üretim" sütunundaki U-numaraları aşağıdaki **Üretilecekler** listesine gider.

## Önemli not: kullanıcının gördüğü "turuncu kanepe, ayaklı lamba, sehpa" nerede?

Ekran görüntüsündeki turuncu kanepe + mavi yastıklar + soluk lavanta abajurlu ayaklı lamba + alçak kahverengi sehpa + saksı bitkisi **eski ofiste değil, Cadde haritasındaki takım ofislerinin lounge köşesidir** (`world/cadde/kaykit.ts:85 furnish`: KayKit `couch_pillows`, `lamp_standing`, `table_low`, `rug_rectangle_stripes_A`; bitki `fikus` Meshy). Kodda kaynak `lounge.glb` değil KayKit paketi (`kaykit-furniture.glb`). Eski ofisin (office) lounge'u ise **mavi kanepe, pembe halı, kahverengi disk sehpa, yeşil/sarı puflar**dır (`world/office/room.ts:123`, `lounge.glb`). İkisi de aşağıda ayrı ayrı değerlendirildi (görüntüler: `cadde/ofis-lounge-*.png`, `cadde-ek/ofis-lounge-7-ic-yakin.png`; `office/lounge-*.png`).

## Harita başına nesne sayıları (bu belgede değerlendirilen)

| Harita | Nesne satırı | PREMIUM | ORTA | KÖTÜ | Ekran görüntüsü |
| --- | --- | --- | --- | --- | --- |
| Eski ofis | 63 | 12 | 44 | 7 | 58 |
| Cadde | 46 | 21 | 18 | 7 | 51 |
| Kale | 25 | 9 | 13 | 3 | 26 |
| Uzay istasyonu | 18 | 7 | 9 | 2 | 21 |

Taranamayan ya da görünmeyenler: eski ofisin **arka ofisi** (wing, kat genişletilmeden kapalı; `world/office/wing.ts:67`), garaj asansörü, eski ofiste **çalışan oturmuş hali** (boş proje; masa laptopu çalışanla görünür, cadde çekimlerinde `cadde-ek/calisan-*.png` ve `cadde/suit-5-mudur-odalari.png` ile değerlendirildi), kale zindanındaki mahkûmlar (kimse gönderilmemiş), istasyonda uzaya atılanlar.

---

## 1. Eski ofis (`office`, `world/office/*`, `shared/layout.ts`)

Ekran görüntüleri: `TARAMA/office/` (kat içi), `ext-*` (dış, garaj), `cati-*` (çatı barı). Dönemsel Cadılar Bayramı süsleri (balkabakları, örümcek ağı, yarasa) şu an açık (`world/holiday.ts`); karar nesnelerin kendisi içindir.

### 1.1 Masa alanı (4 pod, 16 masa)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-01 | Çalışma masası (2,2 x 1,1) | kod: kutu/roundedBox, `office/seats.ts:42`, `layout.ts:28` | ORTA | açık ahşap düz tabla, ince ayak; temiz ama jenerik, ölçü büyük | `ofis-masa` (1,4 x 0,7), `ofis-sandalye` | - | office/masalar-pod-1, masa-yakin |
| OF-02 | Ofis sandalyesi | kod, `office/seats.ts:21` | ORTA | düz tek renkli kutu sırt/oturak, yıldız ayak; oyuncak gibi ama okunur | `ofis-sandalye` | - | office/masa-yakin-2 |
| OF-03 | Masa laptopu (çalışan oturunca) | kod, `office/seats.ts:77`, `features/workers/laptop.ts`; cadde/istasyon `station/seats.ts:52` | ORTA | gövde düz ince kutu, ekran canlı; çalışan başında 2,8 kat büyük (envanter-1 madde 1), cadde'de ise düz plaka | yok | U8 | cadde-ek/calisan-1, calisan-2 |
| OF-04 | Kupa | `desk_props.glb` `mug`, `office/props.ts:66` | ORTA | kırmızı sade silindir kupa, okunur | yok | U36 | office/masa-yakin-2 |
| OF-05 | Kitap yığını | `desk_props.glb`, `office/props.ts:76` | ORTA | renkli tek parça bloklar, küçük, sorun değil | yok | - | office/masa-yakin-2 |
| OF-06 | Masa altı halılar | kod: roundedBox, `office/room.ts:29` | ORTA | düz pastel levhalar (pembe, yeşil, gri); yer kaplayan renk lekesi | yok | - | office/masalar-pod-1, -2 |
| OF-07 | Boş koltuk işareti (yeşil artı) | kod, `office/seats.ts:104` | ORTA | oyun ipucu olarak kasıtlı; düz | yok | - | office/masa-yakin |

### 1.2 Lounge (kullanıcının "eski ofis lounge'u")

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-10 | Kanepe 4,2 m | `lounge.glb` `sofa`, `office/props.ts:100` | ORTA | yuvarlak hatlı ama tek düz mavi, kumaş/dikiş yok, 4,2 m aşırı uzun | `kanepe` (cognac deri 2,0 m), `kafe-koltuk` | - (yerleştirilecek) | office/lounge-1-kanepe-onden, lounge-7-sofa-yastik |
| OF-11 | Atış yastıkları | `lounge.glb` `pillow` | ORTA | düz renkli yastık; sorun yok | yok | - | office/lounge-7-sofa-yastik |
| OF-12 | Sehpa (1,8 çap) | `lounge.glb` `coffee_table`, `office/props.ts:122` | KÖTÜ | kahverengi yassı disk, ince ayak, kenar detayı yok; devasa | yok | U5 | office/lounge-6-sehpa-yakin |
| OF-13 | Puflar (yeşil, sarı) | `lounge.glb` `pouf`, `office/props.ts:117` | KÖTÜ | iki yassı renkli disk; kumaş, dikiş, kabarıklık yok | yok | U11 | office/lounge-3-puflar |
| OF-14 | Lounge halısı | kod: roundedBox 7x7, `office/room.ts:137` | KÖTÜ | parlak pembe düz levha, zemini kaplıyor, dokusuz | yok | U6 | office/lounge-1-kanepe-onden |
| OF-15 | Büyük TV (6,4 x 3,6) | kod: canvas + çerçeve, `office/room.ts:89` | ORTA | ekran gradient'i güzel okunuyor; çerçeve düz siyah | `pano-cercevesi` | - | office/lounge-4-tv-uzak |
| OF-16 | Jukebox | kod, `features/jukebox/world.ts:22` | PREMIUM | kırmızı retro gövde, kemer, ızgara, ekran; dokulu | yok | (U33 yalnız yeniden yapım istenirse) | office/lounge-5-jukebox-arcade |
| OF-17 | Arcade kabini (BLOCKFALL) | kod, `features/cabinet/world.ts:64` | PREMIUM | mavi gövde, parlak başlık, joystick ve düğmeler; sevimli | yok | - | office/lounge-5-jukebox-arcade |

### 1.3 Mutfak, kitaplık, tahta, pota

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-20 | Mutfak tezgahı + lavabo | `kitchen.glb`, `world/kitchen.ts:34` | ORTA | mavi dolaplar, ahşap üst; temiz, doku yok, kulp yok | yok | U24 | office/mutfak-1-genel, mutfak-3-makine-tezgah |
| OF-21 | Espresso makinesi | `kitchen.glb` `coffee_machine` | ORTA | küçük siyah-kırmızı; okunur ama ince detay yok | `kahve-makinesi` (zemin tipi, tezgaha uymaz) | U23 | office/mutfak-3-makine-tezgah |
| OF-22 | Retro buzdolabı (notlu) | `kitchen.glb` `fridge` | PREMIUM | krem retro form, mıknatıs notlar, kulp; iyi | `buzdolabi` (cam kapılı içecek) | - | office/mutfak-2-buzdolabi |
| OF-23 | Kitaplık | kod, `features/bookshelf/world.ts:24` | PREMIUM | ceviz çerçeve, renkli kitaplar, küre, tabela | `kitaplik` | - | office/kitaplik |
| OF-24 | Tekerlekli beyaz tahta (4 x 2,2) | kod, `features/whiteboard/world.ts:29` | ORTA | gri ince çerçeve, dev; ayaklar zayıf, ölçü büyük | yok | U22 | office/beyaz-tahta-1, -2 |
| OF-25 | Basketbol potası + saha | kod, `features/basketball/world.ts:24`, `world/court.ts` | ORTA | turuncu halka, tahta; zemin boyası düz turuncu | yok | - | office/pota-1, mutfak-1-genel |

### 1.4 Kuzey duvarı, giriş, kabuk

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-30 | Duvar panoları (4) | kod, `office/room.ts:59`, `office/props.ts:138` | ORTA | mantar/karatahta + kahverengi çerçeve; içerik canlı, çerçeve basit | `pano-cercevesi` | - | office/panolar-uzak, servis-panosu |
| OF-31 | Ajan kiosku + ajan | kod, `office/seats.ts:172` | ORTA | minik yeşil robot sevimli, kiosk yassı pad | `kursu` | - | office/ajan-kiosku-1 |
| OF-32 | Merge gongu | kod, `features/gong/world.ts:28` | PREMIUM | kırmızı torii çerçeve, bronz disk | `gong` | - | office/gong-asansor |
| OF-33 | Asansör kapısı/kabin | kod, `world/elevator.ts:37` | ORTA | düz gri duvar, pirinç çerçeve; "proj" tabelası okunur | yok | - | office/giris-asansor |
| OF-34 | Duvarlar, pencereler, çıkış kapısı | kod, `office/shell.ts:25,88,187` | ORTA | düz boyalı duvar, çıtalı pencereler, EXIT kapısı; dışarısı canlı manzara | yok | - | office/pencere-guney, cikis-kapisi |
| OF-35 | Parke zemin | canvas dokusu, `office/materials.ts:114` | ORTA | büyük açık tahta, tekrarlı; sıcak | yok | - | office/lounge-1-kanepe-onden |
| OF-36 | Tavan + sarkıt lambalar (6,8 m) | kod, `office/room.ts:177`, `office/props.ts:127` | ORTA | sarı kubbe abajur, ince kordon; tavan çok yüksek | yok | U35 | office/tavan-lamba |
| OF-37 | Yer bitkileri (monstera, yılan, ficus) | `plants.glb`, `office/props.ts:27`, `layout.ts:282` | PREMIUM | saksılar, parlak yapraklar, iyi duruyor | `fikus`, `cicek-saksi` | - | office/bitki-1-orta, bitki-2-kose, bitki-3-kuzeydogu |
| OF-38 | "Büyümeye yer var" sarı tabelası | canvas, `office/wing.ts:24` | ORTA | okunur uyarı tabelası | yok | - | office/bitki-3-kuzeydogu |
| OF-39 | Loft'a giden merdiven | kod, `world/stack.ts`/`office/loft.ts` | ORTA | ahşap basamaklı, mavi korkuluk; düz | yok | - | office/merdiven-loft, pencere-guney |

### 1.5 Loft (patron ofisi) ve toplantı odası

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-50 | Loft camları, çerçeve, "Patron Ofisi" tabelası | kod, `office/loft.ts:14` | ORTA | camlar temiz, tabela iyi | yok | - | office/loft-1-genel, loft-3-masa |
| OF-51 | Patron masası + koltuk | kod, `office/loft.ts` | ORTA | kahverengi kutu masa, siyah blok koltuk | `yonetici-masa`, `yonetici-koltuk` | - | office/loft-1-genel |
| OF-52 | Loft kanepesi (kırmızı) | kod, `office/loft.ts` | ORTA | düz kırmızı blok | `kanepe` | - | office/loft-1-genel, loft-3-masa |
| OF-53 | Toplantı masası + sandalyeler | kod, `office/meeting-room.ts:13,44` | ORTA | düz renkli (kırmızı, turuncu, turkuaz) kutu sandalyeler | `toplanti-sandalye`, `konsey-masasi` | - | office/toplanti-odasi-1, toplanti-odasi-2 |
| OF-54 | Toplantı ekranı | kod, `office/meeting-room.ts` | ORTA | beyaz ekran gri çerçeve | `pano-cercevesi` | - | office/toplanti-odasi-2 |

### 1.6 Balkon

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-60 | Işık zinciri + korkuluk | kod, `office/balcony.ts:15,36` | PREMIUM | renkli ampuller, ahşap korkuluk; sahne gibi | yok | - | office/balkon-1-genel, balkon-2-bistro |
| OF-61 | Bistro masası + 2 tabure | kod, `office/balcony.ts:94-118` | ORTA | düz renkli silindir tabure (mavi, turuncu), ince ayak; küçük | yok | U1, U3 | office/balkon-2-bistro |
| OF-62 | Balkon bankı | kod, `office/balcony.ts` | ORTA | düz ahşap blok | `bank` | - | office/balkon-3-bank-golf |
| OF-63 | Golf tee + yeşil mat + çanta | kod, `features/golf/world.ts:133` | ORTA | yeşil mat, top; çanta basit | yok | - | office/balkon-3-bank-golf |

### 1.7 Dış mekân: bina, garaj, otopark, sokak

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-70 | Bina cephesi (bordo) | kod, `world/tower.ts:60` | ORTA | düz bordo cephe, pencere dizisi, balkon | yok | - | office/ext-1-cephe-sokak, ext-2-cephe-yuksek |
| OF-71 | Garaj (kolon, park çizgisi, GARAJ tabelası) | kod, `world/outside.ts:138` | ORTA | temiz; açık gri düz beton | yok | - | office/ext-3-garaj-lambolar, ext-4-ferrariler |
| OF-72 | Lamborghini tipi arabalar (5) | kod: ekstrüzyon profil, `features/cars/world.ts:99` | KÖTÜ | kama gibi düz boyalı gövde, camlar ve tekerlekler yamuk, hiç detay yok; yakından plastik oyuncak | yok | U9 | office/ext-5-mavi-lambo-otopark, ext-3-garaj-lambolar |
| OF-73 | Ferrari tipi arabalar (4) | kod, `features/cars/world.ts:99` | KÖTÜ | aynı; formu düz, camlar kutu | yok | U10 | office/ext-4-ferrariler, ext-1-cephe-sokak |
| OF-74 | Sokak ağaçları | kod: küre yapraklar, `world/outside.ts:184` | ORTA | düz koyu yeşil toplar, ince gövde; Meshy ağaçlarının yanında geri kalıyor | `agac-genis`, `agac-ince` | - | office/ext-6-yol-agac-lamba, ext-12-cop-hidrant-kaldirim |
| OF-75 | Sokak lambası | kod, `world/outside.ts:241` | ORTA | siyah direk, krem küre; iş görür | `lamba` | - | office/ext-6-yol-agac-lamba |
| OF-76 | Yol, bordür, yaya geçidi, çimen | kod, `world/outside.ts:311` | ORTA | düz asfalt/çizgi dokusu | yok | - | office/ext-8-manzara-bati, ext-11-yol-dogu |
| OF-77 | Komşu binalar, gökdelenler | kod, `world/outside.ts:195`, `world/city.ts:257` | ORTA | kutu binalar, ışıklı pencere dokusu; gece havası güzel | `kaykit-city` (cadde'de kullanılıyor) | - | office/ext-9-gokdelen, ext-6-yol-agac-lamba |
| OF-78 | Dış çıkış merdiveni + sahanlık | kod, `office/balcony.ts:188` | ORTA | metal basamak/korkuluk, mor ton; düz | yok | - | office/ext-7-cikis-merdiveni |
| OF-79 | Golf yeşili + flama | kod, `features/golf/world.ts:201` | ORTA | çim halkalar okunur | yok | - | office/ext-10-golf |
| OF-80 | Yol tabelası ("Manzara yolu") | kod, `world/scenic/road.ts` | ORTA | siyah levha, yeşil yazı | yok | - | office/ext-9-gokdelen |

### 1.8 Çatı barı (`features/rooftop/world.ts:240`)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-90 | Sahne + LED duvar + DJ | kod | PREMIUM | ışıklı truss, hoparlör, renkli ekolayzer, DJ | yok | - | office/cati-1-genel, cati-2-sahne-dj |
| OF-91 | Dans zemini (LED karolar) | kod | PREMIUM | turkuaz/koyu kırmızı dama, ışıklı | yok | - | office/cati-2-sahne-dj |
| OF-92 | Bar tezgahı + şişe rafı + pergola | kod | PREMIUM | neon "Gökyüzü Bar", ışıklı raf, sarı şerit | yok | - | office/cati-3-bar |
| OF-93 | Bar tabureleri | kod | ORTA | kırmızı düz yastık, ince ayak | yok | U26 | office/cati-3-bar |
| OF-94 | Yüksek kokteyl masaları | kod | ORTA | koyu düz disk, ince direk | yok | U25 | office/cati-5-yuksek-masalar |
| OF-95 | Ateş çukuru + alevler | kod | KÖTÜ | alevler turuncu-sarı koniler, taş halka düz | yok | U14 | office/cati-4-ates-cukuru |
| OF-96 | Çatı kanepeleri (3) | kod | ORTA | turkuaz kutu blok, yastık yok | `kanepe` (iç mekân) | U13 | office/cati-4-ates-cukuru |
| OF-97 | Şezlonglar (3) + şemsiye | kod | KÖTÜ | şezlong gibi okunmuyor: iki düz kapak kutu; şemsiye düz bordo kubbe | yok | U12, U2 | office/cati-7-korkuluk-sehir |
| OF-98 | Cam korkuluk, çalı sınırı, çatı asansörü | kod | ORTA | temiz; düz yeşil çalı bloğu | `cali` | - | office/cati-4-ates-cukuru, cati-8-asansor |
| OF-99 | Şehir silüeti (çatıdan) | kod, `world/city.ts` | ORTA | kontur çizgili blok binalar, ay | yok | - | office/cati-7-korkuluk-sehir |

### 1.9 Canlılar

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OF-100 | Köpek (Biber, kostümlü) | `dog-*.glb`, `features/dog/world.ts:139` | PREMIUM | tüylü, sevimli, kostüm iyi; boy büyük (envanter-1 madde 3) | var | - | office/lounge-5-jukebox-arcade |
| OF-101 | Hayvan karakterler (oyuncu, çalışanlar) | `*.glb` Meshy, `world/character/` | PREMIUM | cadde çekimlerinde net, iyi (`cadde-ek/calisan-2`) | var | - | cadde-ek/calisan-2 |

---

## 2. Cadde (`cadde`, `world/cadde/*`, `shared/maps/cadde.ts`)

### 2.1 Kafe meydanı (kullanıcının şikayeti)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CA-01 | Kafe masası şemsiyesi (tente) | Meshy `kafe-masasi`, `cadde/props.ts:95,111` | KÖTÜ | tente buruşuk kâğıt gibi sivri yüzlü, yüzey dokusu bulanık/lekeli, dikişler dağınık; direk ince | `kafe-masasi` zaten bu (kötü); alternatif yok | U2 | cadde/kafe-parasol-3-tente-ust, kafe-parasol-4-tente-alt |
| CA-02 | Kafe tabureleri (3/masa) | aynı glb | KÖTÜ | koyu kahverengi kütük/varil gibi silindirler, ahşap dokusu çamur, bacaksız; taburelere hiç benzemiyor | KayKit `chair_stool` (geçici) | U1 | cadde/kafe-parasol-2-tabure-alcak, kafe-parasol-1-yakin |
| CA-03 | Mermer masa tablası + direk | aynı glb | ORTA | beyaz tabla lekeli/kirli doku; ayak düz siyah | yok | U3 | cadde/kafe-parasol-5-dis, kafe-parasol-1-yakin |
| CA-04 | Kafe tezgahı (kahve-tezgahi) | Meshy, `cadde/props.ts:117,132` | PREMIUM | ahşap ön, mermer üst, espresso makinesi, fincanlar | var | - | cadde/kafe-2-tezgah, kafe-8-buzdolabi-menu |
| CA-05 | İçecek kiosku (dispenser) | Meshy `kiosk`, `cadde/props.ts:175` | PREMIUM | ceviz/çelik, ışıklı dokunmatik ekran | var | - | cadde/kafe-3-dispenser-gong |
| CA-06 | Gong | kod, `features/gong/world.ts:28` | ORTA | kırmızı torii + turuncu disk; sade ama okunur | `gong` | - | cadde/kafe-3-dispenser-gong |
| CA-07 | "Senin koltuğun" (kafe-koltuk) | Meshy, `cadde/people.ts:15` | PREMIUM | cognac deri tüftingli, ince ayak | var | - | cadde-ek/kafe-armchair-yakin |
| CA-08 | Karşılayıcı (aproni, şapkalı) | kod `Person`, `cadde/people.ts:35` | ORTA | kapsül gövde + Halloween cadı şapkası; sevimli ama basit | `npc-karsilayici.glb` | - | cadde/kafe-4-koltuk-karsilayici |
| CA-09 | Barista/NPC (ördek, bordo yelek) | `npc-barista`/`npc-*.glb`, `cadde/npcs.ts:22` | PREMIUM | tüylü, yelekli, iyi | var | - | cadde/kafe-4-koltuk-karsilayici |
| CA-10 | Menü sehpası | Meshy `menu-sehpasi`, `cadde/kaykit.ts:136` | PREMIUM | A-çerçeve, karatahta, pirinç | var | - | cadde-ek/kafe-barista-npc |
| CA-11 | Cam kapılı içecek buzdolabı | Meshy `buzdolabi`, `cadde/kaykit.ts:133` | PREMIUM | tezgah arkasında (kısmen görüldü) | var | - | cadde/kafe-8-buzdolabi-menu |
| CA-12 | Havuç sandığı | KayKit `crate_carrots`, `cadde/kaykit.ts:137` | ORTA | stok KayKit, minik | yok | - | cadde/kafe-8-buzdolabi-menu |
| CA-13 | Kafenin uzun masası + bankları | kod, `station/seats.ts:16` | KÖTÜ | uzun düz gri-mor levha, turuncu şerit, bankı kutu; yarım sokak boyunca "boş plaka" | yok | U7 | cadde/kafe-7-uzun-masa, kafe-1-genel |
| CA-14 | Panolar + robot ajan kioskları | kod, `cadde/teamboard.ts`, `station/seats.ts:80` | ORTA | turuncu çerçeve pano, sevimli robot; kiosk basit | `pano-cercevesi`, `kursu` | - | cadde/kafe-5-pano-bati, kafe-6-pano-dogu |

### 2.2 Sokak mobilyası ve çevre

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CA-20 | Sokak ağaçları (10) | Meshy `agac-genis`/`agac-ince`, `cadde/props.ts:23` | ORTA | uzaktan iyi; yakında yaprak düzlemleri köşeli, gövde kalın | var | - | cadde/sokak-1-agac, sokak-2-lamba |
| CA-21 | Sokak lambası | Meshy `lamba`, `cadde/props.ts:38` | PREMIUM | kıvrımlı kol, krem küre | var | - | cadde/sokak-2-lamba |
| CA-22 | Park bankları | Meshy `bank`, `cadde/props.ts:77` | PREMIUM | çıtalı ahşap, siyah dökme çerçeve | var | - | cadde/sokak-3-bank-cop-hidrant |
| CA-23 | Çöp kutuları | Meshy `cop-kutusu`, `kaykit.ts:122` | ORTA | varil gibi, bant; sade | var | - | cadde/sokak-3-bank-cop-hidrant |
| CA-24 | Yangın musluğu | Meshy `hidrant`, `kaykit.ts:121` | PREMIUM | kırmızı, kapaklı | var | - | cadde/sokak-3-bank-cop-hidrant |
| CA-25 | Uzun taş saksı (çalılı) | Meshy `saksi`, `cadde/props.ts:62` | PREMIUM | taş kasa, kırpılmış topiary | var | - | cadde/sokak-4-saksi |
| CA-26 | Kapı önü çalıları | Meshy `cali`, `kaykit.ts:116` | ORTA | topiary iyi; taş saksı tekdüze | var | - | cadde/sokak-3-bank-cop-hidrant |
| CA-27 | Giriş kapısı ("firstbu") | Meshy `kapi`, `cadde/shell.ts:147` | PREMIUM | siyah portal, tabela, temiz | var | - | cadde/sokak-6-kapi-ic |
| CA-28 | Kaldırım karoları | canvas, `cadde/shell.ts:24` | ORTA | düz gri-mor karo, boş büyük alan | yok | - | cadde/sokak-10-yaya, kafe-1-genel |
| CA-29 | KayKit binalar (kenar sıra) | `kaykit-city.glb`, `cadde/kaykit.ts:140` | ORTA | renkli, tekdüze; pencere dokusu basit | yok | - | cadde/sokak-7-sokak-guney, sokak-8-sokak-kuzey |
| CA-30 | Arka gökdelenler | kod: bayTexture, `cadde/shell.ts:42` | ORTA | ışıklı pencere dokusu güzel, kutu | yok | - | cadde/sokak-6-kapi-ic |
| CA-31 | Yoldan geçenler | hayvan glb, `cadde/passersby.ts:40` | PREMIUM | zebra, kirpi, kunduz; canlı | var | - | cadde/sokak-4-saksi, sokak-5-kapi-dis |

### 2.3 Takım ofisleri (6)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CA-40 | Cam ofis kabuğu, çatı şeridi | kod, `cadde/offices.ts:31` | ORTA | cam soluk gri, ince siyah profiller; içeri bakınca "sis" gibi | yok | - | cadde/ofis-dis-bati, ofis-dis-dogu |
| CA-41 | Kapı üstü ofis tabelası | canvas, `cadde/offices.ts:94` | PREMIUM | okunur, takım renkli | var | - | cadde/ofis-dis-bati |
| CA-42 | Ekip masası + bankları | kod, `station/seats.ts:16-40` | KÖTÜ | düz mor-gri levha + turuncu şerit, kahverengi blok bank; 6 ofiste aynı | yok | U7 | cadde/ofis-masa-yakin, tema-1-kesif |
| CA-43 | Masa laptopu + kupa + defter | kod, `station/seats.ts:52,64` | ORTA | masada minik düz plakalar | yok | U8, U36 | cadde-ek/calisan-1, cadde/ofis-masa-yakin |
| CA-44 | Lounge kanepesi (turuncu) | KayKit `couch_pillows`, `cadde/kaykit.ts:85` | ORTA | yuvarlak hatlı ama düz dokusuz, mavi yastıklar düz; stok KayKit | `kanepe` (cognac deri 2,0 m), `kafe-koltuk` | - (yerleştirilecek) | cadde/ofis-lounge-1, -3-yastik |
| CA-45 | Ayaklı lamba | KayKit `lamp_standing` | KÖTÜ | ince direk, dev soluk lavanta konik abajur, aşırı küçük (1,26 m), ışık hissi yok | yok | U4 | cadde/ofis-lounge-3-yastik, -4-lamba-sehpa |
| CA-46 | Sehpa | KayKit `table_low` | KÖTÜ | 0,2 m yüksekliğinde koyu kahverengi düz tabla, sehpadan çok paspas | yok | U5 | cadde/ofis-lounge-1, -6-bati-row2 |
| CA-47 | Lounge halısı | KayKit `rug_rectangle_stripes_A` | KÖTÜ | küçük solgun şeritli levha, zeminle karışıyor | yok | U6 | cadde/ofis-lounge-1 |
| CA-48 | Ficus + beyaz saksı + ahşap stand | Meshy `fikus`, `interiors.ts:50` | PREMIUM | parlak yapraklar, seramik saksı | var | - | cadde/ofis-lounge-3-yastik |
| CA-49 | Çiçekli saksı, yılan bitkisi, monstera | Meshy `cicek-saksi` + `plants.glb` | PREMIUM | renkli çiçekler, iyi form | var | - | cadde/ofis-lounge-3-yastik |
| CA-50 | Arka duvar temaları (harita, renk örnekleri, mimari şema, iğne panosu, GEÇTİ/KALDI, kamera duvarı) | kod: kutular, `cadde/interiors.ts:20-139` | ORTA | düz renkli levhalar; okunur ama posterler çıplak | yok | - | cadde/tema-1-kesif ... tema-6-guvenlik |
| CA-51 | Sunucu rafları (4) | kod, `cadde/interiors.ts:50` | ORTA | siyah kutu + ışık şeritleri; okunur | yok | U32 | cadde/tema-3-muhendislik |
| CA-52 | Kitaplıklar | Meshy `kitaplik` | PREMIUM | kitaplar, ceviz | var | - | cadde/suit-5-mudur-odalari |
| CA-53 | Tavan ışık panelleri | kod, `interiors.ts:150` | ORTA | beyaz parlak şeritler, iş görür | yok | - | cadde/tema-2-tasarim |

### 2.4 Yönetim suiti (`cadde/suite.ts`)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CA-60 | Yönetici masaları (lider, asistan, 4 müdür) | Meshy `yonetici-masa`/`ofis-masa`, `suite.ts:118,191` | PREMIUM | ceviz, deri kaplama, iyi | var | - | cadde/suit-5-mudur-odalari, cadde-ek/calisan-2 |
| CA-61 | Yönetici koltukları | Meshy `yonetici-koltuk`/`ofis-sandalye` | PREMIUM | siyah deri, krom | var | - | cadde/suit-5-mudur-odalari |
| CA-62 | Lider odası deri kanepesi | Meshy `kanepe`, `suite.ts:110,123` | PREMIUM | cognac deri | var | - | cadde-ek/calisan-2 |
| CA-63 | Toplantı odası (masa + sandalye) | Meshy `konsey-masasi`, `toplanti-sandalye`, `cadde/index.ts:69` | PREMIUM | yuvarlak ceviz, siyah sandalye | var | - | cadde/suit-3-toplanti |
| CA-64 | Suit kahve köşesi | Meshy `kahve-tezgahi`, `kahve-makinesi`, `suite.ts:146` | PREMIUM | espresso, makine | var | - | cadde/suit-4-kahve |
| CA-65 | Duvar ekranları, yan tahtalar | kod, `suite.ts` | ORTA | ekran içeriği canlı, çerçeve düz | `pano-cercevesi` | - | cadde/suit-2-lider-masa, suit-5-mudur-odalari |

---

## 3. Kale (`castle`, `world/castle/*`, `shared/maps/castle.ts`)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KA-01 | Taş zemin | canvas, `castle/textures.ts` | ORTA | büyük kahverengi karolar, siyah derzler kalın | yok | - | castle/kale-2-salon-kapi, kale-22-hali-zemin |
| KA-02 | Taş duvarlar | canvas, `castle/shell.ts` | ORTA | blok dokusu okunur; tekdüze | yok | - | castle/kale-20-kalkan |
| KA-03 | Sütunlar + sivri kemerler | kod, `castle/props.ts:25,50` | PREMIUM | heybetli, ışıkla yumuşak | yok | - | castle/kale-2-salon-kapi, kale-19-sutun-sancak |
| KA-04 | Ahşap çatı kirişleri | kod, `castle/shell.ts` | PREMIUM | koyu kirişler, kemerli kafes | yok | - | castle/kale-21-tavan-kiris |
| KA-05 | Vitray pencereler | kod, `castle/props.ts:185` | PREMIUM | renkli mozaik | yok | - | castle/kale-16-vitray |
| KA-06 | Gül pencere | kod, `castle/props.ts:209` | PREMIUM | tekerlek vitray | yok | - | castle/kale-17-gul-pencere |
| KA-07 | Sancaklar | kod, `castle/props.ts:156` | ORTA | düz turuncu/kırmızı şerit | yok | - | castle/kale-18-avize, kale-1-taht-uzak |
| KA-08 | Kalkan + kılıç plaketleri | kod, `castle/props.ts:285` | ORTA | düz turuncu haç, kılıçlar ince | yok | U-yok (düşük) | castle/kale-20-kalkan |
| KA-09 | Duvar meşaleleri | kod, `castle/props.ts:78` | PREMIUM | parlak alev, halo | yok | - | castle/kale-12-pano-ajan |
| KA-10 | Mangallar | kod, `castle/props.ts:99` | PREMIUM | alevli, parlak | yok | - | castle/kale-6-mangal |
| KA-11 | Şömine | kod, `castle/props.ts:310` | PREMIUM | taş çerçeve, alev, sıcak ışık | yok | - | castle/kale-10-sömine |
| KA-12 | Fıçılar ("Bira") | kod, `castle/props.ts:351` | ORTA | 3'lü yığın, düz kahverengi, kuşak ince | yok | U29 | castle/kale-11-fici |
| KA-13 | Avize | kod, `castle/props.ts:130` | ORTA | demir halka, küçük mumlar; uzaktan iyi | yok | U30 | castle/kale-18-avize, kale-21-tavan-kiris |
| KA-14 | Demir kılıç tahtı + kürsü | kod, `castle/throne.ts` | ORTA | kılıç bıçaklar etkileyici, koltuk bloğu düz siyah-kırmızı | yok | U31 | castle/kale-3-taht-yakin |
| KA-15 | Heykeller (2) | kod, `castle/props.ts:235` | KÖTÜ | bej kutu gövde + yüzsüz blok; heykel gibi okunmuyor, gövde formsuz | yok | U15 | castle/kale-3-taht-yakin, kale-4-heykel-mum |
| KA-16 | Mumluklar | kod, `castle/props.ts:394` | PREMIUM | üç kollu ince mumluk | yok | - | castle/kale-3-taht-yakin |
| KA-17 | Kırmızı halı + altın şerit | kod, `castle/props.ts:225` | PREMIUM | tüm salonu bağlıyor | yok | - | castle/kale-2-salon-kapi |
| KA-18 | Uzun ziyafet masaları + banklar (4 masa) | kod, `castle/seats.ts:17` | KÖTÜ | düz ahşap levha, kalın kutu ayak; her biri 10 m aynı plaka; üstündeki kupa/mumlar minik | yok | U16, U17 | castle/kale-7-masa-genel, kale-8-masa-yakin |
| KA-19 | Küçük konsey masası + sandalyeler | kod, `castle/seats.ts:85,194` | KÖTÜ | masa yuvarlak ceviz iyi (ORTA), sandalyeler siyah kutu; sırt düz | `konsey-masasi` (cadde tarzı, kaleye uymaz) | U18 | castle/kale-9-konsey-masasi |
| KA-20 | Zırhlar (4) | kod, `castle/props.ts:262` | ORTA | gri, mızraklı, kutu uzuvlar | yok | U28 | castle/kale-14-zirh, kale-15-buyuk-kapi |
| KA-21 | Merge gongu | kod, `features/gong/world.ts:28` | ORTA | kırmızı torii + turuncu disk (kale havasına yabancı) | `gong` | - | castle/kale-13-gong |
| KA-22 | Panolar + ajan kürsüleri | kod, `castle/boards.ts`, `castle/seats.ts:139` | ORTA | tahta çerçeve pano; minik sevimli ajan | `pano-cercevesi`, `kursu` | - | castle/kale-12-pano-ajan, kale-23-istasyon-ajan |
| KA-23 | Büyük kemerli kapı | kod, `castle/shell.ts` | ORTA | ahşap çift kanat, halka kulplar | yok | - | castle/kale-15-buyuk-kapi |
| KA-24 | Kralın Eli (+ köylü çalışanlar) | kod `Person`, `castle/people.ts:17`, `world/costumes.ts:203` | ORTA | kapsül gövde + yeşil önlük + cadı şapkası; sevimli ama basit | `npc-rehber`, `npc-dede` | - | castle/kale-5-kralin-eli, kale-4-heykel-mum |
| KA-25 | Zindan: kafesli hücreler, koridor, merdiven | kod, `world/dungeon.ts` | ORTA | demir parmaklıklar iyi, karanlık; taş zemin sade | yok | - | castle/zindan-1-koridor, zindan-2-hucre, zindan-3-merdiven |

---

## 4. Uzay istasyonu (`station`, `world/station/*`, `shared/maps/station.ts`)

| Id | Nesne | Nasıl yapılmış | Karar | Neden | Hazır premium | Üretim | Görüntü |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ST-01 | Güverte zemini + turuncu şeritler | canvas/kod, `station/shell.ts:80`, `props.ts:58` | PREMIUM | koyu plaka, turuncu çizgi, temiz | yok | - | station/ist-1-salon-ileri, ist-20-zemin-seritler |
| ST-02 | Gövde panelleri, kaburga kirişleri, tavan lambaları | kod, `station/props.ts:19,41` | PREMIUM | tutarlı bilim-kurgu dili | yok | - | station/ist-17-tavan-kaburga |
| ST-03 | Viewport pencereler + uzay (Dünya, ay, halkalı gezegen, güneş panelleri) | kod, `station/space.ts:187`, `planets.ts` | PREMIUM | Dünya canlı, yıldızlar | yok | - | station/ist-14-gozlem-penceresi, ist-15-saksi |
| ST-04 | Hologram küre | kod, `station/props.ts:81` | PREMIUM | parlak tel küre, taban | yok | - | station/ist-7-hologram |
| ST-05 | Bank masalar (4 uzun) | kod, `station/seats.ts:16` | KÖTÜ | düz beyaz levha + siyah kutu ayak, tek turuncu şerit | yok | U7 | station/ist-5-bank-genel, ist-6-bank-yakin |
| ST-06 | Kaptan koltuğu | kod, `station/seats.ts:222` | ORTA | sade gri döner koltuk, küçük | yok | U20 | station/ist-3-kaptan-koltugu, ist-4-on-camlar |
| ST-07 | Dümen konsolları | kod, `station/seats.ts:222` | ORTA | siyah kutu, 2 renkli ekran | yok | U21 | station/ist-3-kaptan-koltugu |
| ST-08 | Birinci Subay | kod `Person`, `station/people.ts:14` | ORTA | kapsül gövde, şapka | `npc-karsilayici`, `npc-bekci` | - | station/ist-21-karsilayici |
| ST-09 | Güvenlik | kod `Person`, `station/people.ts:95` | ORTA | siyah giysili, kırmızı vizör; sade | `npc-bekci` | - | station/ist-13-hava-kilidi |
| ST-10 | Duvar panoları/ekranlar | kod, `station/props.ts:66`, `boards.ts` | PREMIUM | cam ekran, turuncu çerçeve | yok | - | station/ist-8-pano-ajan, ist-9-ekranlar-arka |
| ST-11 | Ajan konsolları | kod, `station/seats.ts:80` | ORTA | minik robot, kürsü düz | `kursu` | - | station/ist-10-konsol |
| ST-12 | Merge gongu | kod, `features/gong/world.ts:28` | ORTA | kırmızı torii (altın disk) | `gong` | - | station/ist-11-gong |
| ST-13 | Sıcak içecek makinesi | kod, `station/props.ts:169` | ORTA | siyah kutu, mavi ekran; düz | `kiosk` | - | station/ist-12-icecek-makinesi |
| ST-14 | Hidroponik saksılar | kod, `station/props.ts:125` | ORTA | beyaz kasa, koni bitkiler, pembe şerit | `saksi` | U27 | station/ist-15-saksi |
| ST-15 | Kargo sandıkları + üstündeki mavi kutular | kod, `station/props.ts:147` | KÖTÜ | turuncu-kahverengi düz küpler, üstünde mavi kutu; sandık gibi değil | yok | U19 | station/ist-16-sandik, ist-19-hatch-kapi |
| ST-16 | Briefing masası + sandalyeler + ekran | kod, `station/seats.ts:132,182` | ORTA | yuvarlak beyaz masa, siyah sandalyeler; sade | `konsey-masasi`, `toplanti-sandalye` | - | station/ist-18-toplanti-masasi |
| ST-17 | Hava kilidi + kapı | kod, `station/airlock.ts:50` | PREMIUM | sarı-siyah şerit, pencereli kapı, uyarı levhası | yok | - | station/ist-13-hava-kilidi |
| ST-18 | Kenetlenme kapısı (hatch) | kod, `station/shell.ts` | PREMIUM | kapı çerçevesi, yuvarlak lombozlu | yok | - | station/ist-19-hatch-kapi |

---

## Üretilecekler (en kötü ve en görünür olandan başlayarak, en çok 40; yinelenenler tek sırada)

Prompt şablonu `blender/scripts/meshy_props.py` içindeki STYLE ("A single {thing}, isolated on a plain pure white background ... premium stylized 3D game asset ...") ile birleşir; aşağıdaki her prompt `{thing}` + `{detail}` kısmıdır. Boyut: **genişlik x derinlik x yükseklik, metre** (gerçek dünya). Meshy üretiminde renkler dokuya gömülü olduğundan arabalar "açık gri boya" istendi ki kodda tonlanabilsin.

| # | Anahtar | Prompt | Boyut (g x d x y m) | Yerleşim | Neden / görüntü |
| --- | --- | --- | --- | --- | --- |
| U1 | `kafe-tabure` | A single cafe bistro stool, round woven rattan seat on four slim tapered black metal legs with a thin footrest ring, clean and symmetrical. | 0,38 x 0,38 x 0,46 | Cadde parasol masaları (3/masa), eski ofis balkonu | CA-02: kütük gibi tabureler; cadde/kafe-parasol-2-tabure-alcak |
| U2 | `semsiye` | A single large open cafe parasol, taut terracotta and cream striped canvas canopy with eight clean even panels and a scalloped edge, slim black metal pole with a brass finial, a heavy round dark base plate, no table. | 2,9 x 2,9 x 2,45 | Cadde kafe, çatı barı şezlonglar | CA-01: buruşuk lekeli tente; cadde/kafe-parasol-4-tente-alt |
| U3 | `kafe-masa` | A single round bistro cafe table, white carrara marble top with a thin brass rim on a slim black cast-iron pedestal with a round base. | 0,70 x 0,70 x 0,74 | Cadde kafe (3 parça olarak U1+U2+U3 birleşince `kafe-masasi` yerine geçer), balkon | CA-03: kirli doku |
| U4 | `ayakli-lamba` | A single standing floor lamp, slim matte-brass pole on a round weighted dark marble base, a cream linen drum shade, warm glow. | 0,40 x 0,40 x 1,65 | Cadde takım ofisleri (6), eski ofis lounge | CA-45; cadde/ofis-lounge-3-yastik |
| U5 | `sehpa` | A single low oval coffee table, solid oak top with a slim brass edge on a tapered walnut pedestal, nothing on top. | 1,00 x 0,60 x 0,42 | Cadde ofis lounge (6), eski ofis lounge (ölçek 0,9 yuvarlak yerine) | CA-46, OF-12; office/lounge-6-sehpa-yakin |
| U6 | `hali` | A single rectangular wool area rug seen at a slight angle, soft geometric pattern in muted terracotta, cream and navy, thin fringe, very flat, nothing on it. | 2,00 x 1,40 x 0,02 | Cadde ofis lounge, eski ofis (pembe levha yerine) | CA-47, OF-14 |
| U7 | `ekip-masasi` | A single long communal team work table with two matching bench seats along its long sides, pale oak top, slim black steel frame, a built-in brass cable channel along the middle, no objects on it. | 3,00 x 1,50 (bank dahil) x 0,76 (bank oturak 0,45) | Cadde takım ofisleri ve kafe uzun masası, istasyon bankları (uzunluk modülü: 3 m, tekrarlanır) | CA-13, CA-42, ST-05; cadde/ofis-masa-yakin, station/ist-5-bank-genel |
| U8 | `laptop` | A single open silver laptop, lid tilted back about 110 degrees, thin aluminum body, black keyboard deck and a blank dark screen, no logo, no text. | 0,356 x 0,248 x 0,23 (açık) | Tüm masalar (oyunda ölçek 1; ekran dokusu kodda) | OF-03, CA-43 |
| U9 | `supercar-lambo` | A single low wedge-shaped Italian supercar, sharp angular body with a flat nose, scissor door, large rear wing, glossy light grey paint so it can be tinted, black windows, four chunky alloy wheels, no logos, no license plate, no text. | 4,6 x 2,0 x 1,12 | Eski ofis garajı (5 araba, renk kodda) | OF-72; office/ext-5-mavi-lambo-otopark |
| U10 | `supercar-ferrari` | A single sleek front-engined berlinetta supercar, long hood and flowing rounded body, glossy light grey paint so it can be tinted, black windows, five-spoke alloy wheels, no logos, no license plate, no text. | 4,6 x 2,0 x 1,2 | Eski ofis garajı (4 araba) | OF-73; office/ext-4-ferrariler |
| U11 | `pof` | A single round floor pouf, soft padded fabric in a solid color with a stitched seam and a small leather handle. | 0,60 x 0,60 x 0,40 | Eski ofis lounge (yassı disk puflar yerine), ölçek 1,6 ile yatma torbası | OF-13; office/lounge-3-puflar |
| U12 | `sezlong` | A single teak wood sun lounger with a thick white cushion, backrest raised, slim brass hinges. | 0,75 x 2,00 x 0,75 | Çatı barı (3) | OF-97; office/cati-7-korkuluk-sehir |
| U13 | `cati-kanepe` | A single outdoor lounge sofa, woven grey rattan frame with thick teal cushions and two scatter cushions, slim legs. | 2,20 x 0,90 x 0,80 | Çatı ateş çukuru çevresi (3) | OF-96; office/cati-4-ates-cukuru |
| U14 | `ates-cukuru` | A single round stone fire pit with a dark steel inner bowl and a ring of glowing coals, low stacked stone rim, no flames modelled. | 1,80 x 1,80 x 0,50 | Çatı barı (alev kodda) | OF-95; office/cati-4-ates-cukuru |
| U15 | `heykel` | A single marble knight statue in full plate armor holding a sword point down, on a square carved stone plinth, weathered cream marble. | 0,90 x 0,90 x 2,40 | Kale tahtı yanları (2) | KA-15; castle/kale-4-heykel-mum |
| U16 | `ziyafet-masasi` | A single long medieval banquet table, thick dark oak plank top with chunky carved trestle legs and a stretcher bar, nothing on it. | 2,50 x 0,90 x 0,78 | Kale 4 uzun masa (4 modül/masa) | KA-18; castle/kale-8-masa-yakin |
| U17 | `ziyafet-banki` | A single long medieval oak bench with a thick plank seat on two carved legs. | 2,50 x 0,30 x 0,45 | Kale masaları | KA-18 |
| U18 | `konsey-sandalyesi` | A single carved dark oak high-back chair with a red velvet seat cushion and brass studs. | 0,60 x 0,60 x 1,30 | Kale küçük konsey masası (5) | KA-19; castle/kale-9-konsey-masasi |
| U19 | `kargo-sandigi` | A single sci-fi cargo crate, rounded-edge metal box in orange and dark grey with corner guards, a recessed handle, no stencil text. | 0,80 x 0,80 x 0,80 | İstasyon (3 yer) | ST-15; station/ist-16-sandik |
| U20 | `kaptan-koltugu` | A single spaceship captain's command chair, high-back padded in dark grey with white piping, armrests with small glowing control strips, swivel pedestal base. | 1,10 x 1,00 x 1,35 | İstasyon köprüsü | ST-06; station/ist-3-kaptan-koltugu |
| U21 | `dumen-konsolu` | A single sci-fi helm console, angled desk-height console with two glowing blue touch screens and soft lit buttons, dark grey body with orange trim, slim base. | 1,90 x 0,86 x 1,10 | İstasyon köprüsü (2) | ST-07; station/ist-4-on-camlar |
| U22 | `mobil-beyaz-tahta` | A single mobile whiteboard on a wheeled aluminum stand with a slim frame and a small marker tray, blank white board. | 1,30 x 0,60 x 1,90 | Eski ofis (4 x 2,2 dev tahta yerine; ekran dokusu kodda) | OF-24; office/beyaz-tahta-2 |
| U23 | `espresso` | A single prosumer two-group espresso machine in brushed stainless steel with a dark body, a steam wand and two portafilters, one small glowing light. | 0,60 x 0,55 x 0,50 | Eski ofis mutfağı | OF-21; office/mutfak-3-makine-tezgah |
| U24 | `mutfak-tezgah` | A single kitchen counter module with a sink: teal-blue cabinet fronts with brass handles, a thick oak worktop and a small chrome faucet. | 2,40 x 0,65 x 0,92 | Eski ofis mutfağı (2 modül) | OF-20 |
| U25 | `yuksek-masa` | A single tall round cocktail table, slim dark steel pedestal and base, a smooth dark grey top. | 0,70 x 0,70 x 1,10 | Çatı barı (3) | OF-94; office/cati-5-yuksek-masalar |
| U26 | `bar-tabure` | A single bar stool with a round red leather seat, chrome footrest ring and slim black legs. | 0,40 x 0,40 x 0,78 | Çatı barı (6) | OF-93; office/cati-3-bar |
| U27 | `hidroponik-saksi` | A single long white hydroponic planter box with a softly glowing pink-white LED strip along the base, filled with lush green leafy plants. | 2,40 x 0,70 x 0,60 | İstasyon (2) | ST-14; station/ist-15-saksi |
| U28 | `zirh` | A single full suit of steel plate armor standing on a small wooden stand, holding a halberd, polished with brass trim. | 0,70 x 0,60 x 1,95 | Kale (4) | KA-20; castle/kale-14-zirh |
| U29 | `ficilar` | A single stack of three oak barrels on a dark wooden rack with iron hoops and a small brass tap. | 1,70 x 1,00 x 1,20 | Kale (şömine karşısı) | KA-12; castle/kale-11-fici |
| U30 | `avize` | A single wrought iron ring chandelier with twelve lit candles and hanging chains, medieval. | 1,60 x 1,60 x 1,20 | Kale (4) | KA-13; castle/kale-18-avize |
| U31 | `taht` | A single throne made of fused iron sword blades with a dark red leather seat and a tall spiky back, no steps. | 1,90 x 1,90 x 2,60 | Kale | KA-14; castle/kale-3-taht-yakin |
| U32 | `sunucu-rafi` | A single server rack cabinet, matte black with a perforated door and rows of small glowing green and blue status lights. | 0,60 x 1,00 x 2,00 | Cadde mühendislik ofisi (4) | CA-51; cadde/tema-3-muhendislik |
| U33 | `jukebox` | A single retro jukebox, glossy red body with a curved top arch and chrome trim, a blank dark display and a lower speaker grille. | 0,90 x 0,70 x 1,55 | Eski ofis lounge (kodla yapılan yerine; düşük öncelik, mevcut PREMIUM) | OF-16 |
| U34 | `arcade` | A single upright arcade cabinet, dark blue body with orange side panels, a blank dark screen, a joystick and three buttons on an orange control panel, no text. | 0,70 x 0,90 x 1,80 | Eski ofis lounge (düşük öncelik) | OF-17 |
| U35 | `sarkit-lamba` | A single pendant ceiling lamp, warm brass dome shade with a thin black cord. | 0,45 x 0,45 x 0,35 (abajur) | Eski ofis (6-8 adet) | OF-36; office/tavan-lamba |
| U36 | `kupa` | A single ceramic coffee mug, glossy glaze, simple handle. | 0,085 x 0,085 x 0,097 | Tüm masalar | OF-04, CA-43 |

Notlar: U1+U2+U3 üçü birlikte yeni bir `kafe-masasi` yapar (`cadde/props.ts:111` içinde üç parça kodla yerleştirilir) ve şimdilik tek parça `kafe-masasi` modelinin tabureleri ve tentesi sorunlu olduğundan, alternatif olarak tüm seti yeniden üretmek için şu prompt kullanılabilir: "A single cafe bistro table set, a round white marble top table on a black pedestal, three slim rattan bistro stools with metal legs, and a large taut terracotta and cream striped parasol with a clean scalloped edge, crisp even panels, a thin black pole." (2,9 x 2,9 x 2,45; tabure oturağı 0,46). Geçici çözüm: KayKit `kaykit-cafe.glb` içindeki `chair_stool` (0,38 x 0,38 x 0,25 x 0,5 ölçek; bkz. `docs/nesne-envanteri.md` cadde bölümü sonu) tabureler için kullanılabilir.

## Hazır olup yerleştirilecekler

| # | Hazır model | Nereye yerleştirilecek | Ne yerine | Not / görüntü |
| --- | --- | --- | --- | --- |
| H1 | `kanepe` (cognac deri, 2,0 x 0,9 x 0,85) | Cadde takım ofislerinin lounge'u (6) | KayKit `couch_pillows` (`cadde/kaykit.ts:94-100`) | cadde/ofis-lounge-1; yeni yerleşim `put('kanepe', ...)` suite.ts:110 gibi |
| H2 | `kanepe` | Eski ofis lounge ve loft | `lounge.glb sofa` (4,2 m) ve loft'un kırmızı bloğu | office/lounge-1-kanepe-onden; sığdırmak için iki kanepe yan yana (ya da U-düzeni), `layout.ts:461` yerleşimini 3 yer yerine 2 x 3 yap |
| H3 | `kafe-koltuk` | Eski ofis lounge (kanepenin iki yanı), loft | yassı puflar yanına | cadde-ek/kafe-armchair-yakin |
| H4 | `kitaplik` | Eski ofis kitaplığı (`features/bookshelf/world.ts:24`) | kodla yapılan (zaten PREMIUM; gerekmez, yalnız ölçek sorunu için) | düşük öncelik |
| H5 | `ofis-masa` + `ofis-sandalye` | Eski ofis masaları (`office/seats.ts:21,42`), istasyon masalarının uçları | kutu masa/sandalye | office/masa-yakin-2 |
| H6 | `toplanti-sandalye` + `konsey-masasi` | Eski ofis toplantı odası (`office/meeting-room.ts`), istasyon briefing (`station/seats.ts:132,182`) | renkli kutu sandalyeler | office/toplanti-odasi-1 |
| H7 | `yonetici-masa` + `yonetici-koltuk` | Eski ofis loft'u (patron masası) | kahverengi kutu masa | office/loft-1-genel |
| H8 | `kursu` (anahtar kodda hiçbir yerde kullanılmıyor) | Tüm haritalarda ajan konsolları: eski ofis `office/seats.ts:172`, cadde/istasyon `station/seats.ts:80`, kale `castle/seats.ts:139` | düz tabla kürsüler | office/ajan-kiosku-1, station/ist-10-konsol |
| H9 | `pano-cercevesi` (anahtar kodda kullanılmıyor) | Tüm duvar panoları: eski ofis `office/room.ts:59,89`, cadde panoları, kale/istasyon panoları, eski ofis TV'si | kahverengi/düz çerçeveler | office/panolar-uzak, cadde/kafe-5-pano-bati |
| H10 | `agac-genis`, `agac-ince`, `lamba`, `cop-kutusu`, `hidrant`, `bank` | Eski ofis sokağı/otoparkı (`world/outside.ts:184,241`), balkon bankı | küre yapraklı ağaçlar, kodla lamba | office/ext-6-yol-agac-lamba |
| H11 | `kiosk` (içecek makinesi) | İstasyon `station/props.ts:169` | siyah kutu dispenser | station/ist-12-icecek-makinesi |
| H12 | `kahve-makinesi` | Eski ofis mutfağı yan köşesi (zemin tipi) | yalnız U23 gelene dek geçici | office/mutfak-1-genel |
| H13 | `saksi`, `cicek-saksi`, `fikus`, `cali` | İstasyon hidroponik (`saksi`), çatı çalı sınırı (`cali`), eski ofis köşeleri | düz kutu çalı bloğu, kutu saksı | office/cati-4-ates-cukuru, station/ist-15-saksi |
| H14 | `gong` | İstasyon ve kale gongları (`features/gong/world.ts:28`) | kodla yapılan torii gong | station/ist-11-gong, castle/kale-13-gong |
| H15 | `buzdolabi` | Eski ofis mutfağı yanına ikinci buzdolabı / ofis kitaplık yanı | - | opsiyonel |
| H16 | `npc-karsilayici`, `npc-bekci`, `npc-rehber`, `npc-dede`, `npc-cicekci`, `npc-kurye`, `npc-barista` (glb) | Cadde karşılayıcı (`cadde/people.ts:35`), kale Kralın Eli ve gardiyan (`castle/people.ts:17,52`), istasyon Birinci Subay/Güvenlik (`station/people.ts:14,95`) | kapsül gövdeli `Person` | castle/kale-5-kralin-eli, station/ist-21-karsilayici |

## Taranan alan ve çekim sayıları

Çekim sayıları ve ekran görüntüsü klasörleri `TARAMA/` altında: `office` (kat içi, dış ve çatı), `cadde`, `cadde-ek`, `castle` (zindan dahil), `station`. Temas sayfaları: `TARAMA/office-sheets/office-sheet-*.png`, `TARAMA/cadde-sheet-*.png`, `TARAMA/cadde-ek-sheet.png`, `TARAMA/castle-sheet-*.png`, `TARAMA/station-sheet-*.png`.
