# Mobilya ve yapı ölçüleri

Dünyadaki her eşyanın gerçek hayattaki ölçüsü: en × derinlik × yükseklik, metre. Ölçüler [`blender/furniture.json`](../blender/furniture.json) dosyasındadır; **tek kaynak** odur. Blender betiği (`build_meshy_props.py`) her modeli bu ölçüye getirir (her eksen ayrı: Meshy'nin çizdiği şekil ne olursa olsun masa doğru yükseklikte çıkar), `tests/furniture.test.ts` bitmiş modelleri ve koddaki sabitleri bu dosyaya karşı denetler, bu belge de ondan yazılır:

```bash
node blender/scripts/furniture_doc.mjs
```

## İnsanlar

Adults: median stature 1.755 m (men) and 1.626 m (women), 95th percentile 1.87 m and 1.74 m; seated eye height 0.75-0.80 m, popliteal height 0.39-0.43 m (5th-95th: 0.38-0.51 m). Our characters are 1.30-2.10 m (docs/karakterler.md); the lion lead 1.85 m, Mahmut 1.8 m.

Kaynaklar: [people-ncsu](https://www.ergocenter.ncsu.edu/wp-content/uploads/sites/18/2017/09/Anthropometric-Summary-Data-Tables.pdf), [people-gvsu](https://www.gvsu.edu/cms4/asset/30F6D8A1-9140-75C7-2CAACF4A83B9D5A8/seatingmeasurements.pdf)

## Sabitler (kodda da aynıdır)

| Ne | Değer | Aralık ve kaynak |
| --- | --- | --- |
| Masa üstü (`TABLE_TOP`) | 76 cm | Desk height 71-76 cm. |
| Oturak (`BENCH_TOP`) | 45 cm | Bench and chair seats 43-48 cm. |
| Kapı kanadı | 0.91 × 2.13 m | A commercial door leaf is 0.91 x 2.13 m (36 x 84 in); the clear opening is at least 0.81 m wide and 2.03 m high (ADA). Our suite doorways are double doors, 2.0 m. |
| Tavan (zemin kat cam ofis) | 4.2 m | Finished ceilings of Class A offices run 3.0-3.7 m (10-12 ft), floor to floor 3.75-4.3 m. Ours are ground-floor glass offices at 4.2 m, the tall end (taller ground floors are common; no source for the number). |
| 10 kişilik toplantı masası | 3.8 × 1.4 × 0.76 m, kişi başı 76 cm | A table for ten is 3.0-3.7 m (10-12 ft) by 1.2-1.5 m (48-58 in), 61-76 cm of edge a person, the room 0.9 m clear all round. |

The station's kit (world/station/kit.ts: TABLE_TOP, BENCH_TOP) has the desk and the bench seat, and a worker's seat anchor and laptop sit to them, so every desk and chair a worker uses matches them.

Kaynaklar: [desk-din](https://yaasa.com/en/blogs/yaasa-blog/schreibtisch-masse), [door-civils](https://civils.ai/blog/minimum-door-dimension-requirements/), [floor-cre](https://www.adventuresincre.com/glossary/floor-floor-height/), [conference-of2go](https://www.officefurniture2go.com/answers/conference-tables/what-size-conference-table-for-10-people.html), [conference-branch](https://www.branchfurniture.com/blogs/turn-key/conference-table-size-buying-guide)

## Eşyalar

| Anahtar | Yer | en × der. × yük. (m) | Ayrıntı | Gerçek hayatta (bulunan aralık) | Kaynak | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| `agac` | cadde | 2.20 × 2.20 × 4.00 | — | Planted street tree, 2 in caliper: about 3-3.6 m (10-12 ft); mature 8 m and up. Tree pit: 1.35 m square typical (Sydney), 1.5 m preferred (Honolulu); the bed here is wider than a pit, a planter curb round it. | [tree-honolulu](https://www.honolulu.gov/dpp/street-tree-standards/), [tree-sydney](https://meetings.cityofsydney.nsw.gov.au/documents/s67913/Attachment), [tree-stock](https://iris.londoncouncils.gov.uk/viewer/tree-caliper-size-chart.html) | kaynaklı |
| `lamba` | cadde | 1.30 × 0.45 × 4.50 | — | Pedestrian-scale lamps 3-5 m: 3.7-5.2 m with 15 ft acorn posts (Encinitas), 4.5-6 m on sidewalks (Global Street Design Guide). | [lamp-gdc](https://globaldesigningcities.org/?p=20476), [lamp-encinitas](https://encinitasca.gov/home/showpublisheddocument/8140/638314156997070000) | kaynaklı |
| `bank` | cadde | 1.80 × 0.60 × 0.85 | oturak 46 cm | Seat 45-48 cm (18-19 in; 17.7 in on the Tor bench), 1.8 m for three, back 30-46 cm over the seat, seat depth 38-50 cm. | [bench-wabash](https://wabashvalley.com/blogs/blog/standard-bench-dimensions), [bench-dambis](https://www.dambis.ee/en/product/park-bench-nisha/) | kaynaklı |
| `kafe-masasi` | cadde | 2.70 × 2.70 × 2.40 | oturak 45 cm, üst 74 cm | Bistro table 71-76 cm with 43-48 cm stools; a 9 ft (2.7 m) market umbrella stands 2.3-2.45 m (7.5-8 ft) overall. | [cafe-bbqguys](https://www.bbqguys.com/a/28806/learn/outdoor-living/buying-guides/furniture/table-chair-height), [umbrella-jeco](https://www.walmart.com/ip/Jeco-UBF92-9-ft-Aluminum-Steel-Umbrella-Fabric-Tan/120360055), [umbrella-golden](https://blog.wellappointedhouse.com/products/9-golden-state-patio-umbrella-in-aruba) | kaynaklı |
| `kahve-tezgahi` | cadde | 4.00 × 1.10 × 1.75 | üst 105 cm | Counter height 36-42 in (0.91-1.07 m): 1.05 m. The espresso machine on it brings it to 1.75 m. (No counter standard found: common practice.) | [cafe-bbqguys](https://www.bbqguys.com/a/28806/learn/outdoor-living/buying-guides/furniture/table-chair-height) | kısmen |
| `kahve-makinesi` | cadde | 0.90 × 0.70 × 1.80 | — | Floor-standing drinks machines (vending cabinets) are about 1.8 m (72 in) tall. Countertop bean-to-cup units are only 0.44-0.6 m, so this is the floor kind. (No standard found: common practice.) | [machine-ggm](https://www.ggmgastro.com/en-gb-eur/commercial-bean-to-cup-coffee-machine-16-drink-options-5-touchscreen-kvacb) | kısmen |
| `saksi` | cadde | 3.00 × 0.80 × 1.10 | — | Commercial planter boxes run 0.6-1.8 m long (0.9-1.2 m most common) up to 3.0 x 1.07 x 1.2 m for the largest; 12-48 in high. This is a large one: box 55 cm, shrubs to 1.1 m. | [planter-pots](https://potsplantersandmore.com/buying-guides/commercial-planter-sizing/) | kaynaklı |
| `ofis-masa` | ofis | 1.40 × 0.70 × 0.76 | üst 76 cm | Fixed desk 71-76 cm (DIN: 74 +/- 2 cm); width 1.2-1.8 m, depth 0.6-0.76 m. | [desk-din](https://yaasa.com/en/blogs/yaasa-blog/schreibtisch-masse), [desk-guide](https://eurekaergonomic.com/blogs/eureka-ergonomic-blog/standard-desk-dimensions-guide), [desk-ansi](https://www.officefurniture2go.com/answers/desk-space-planning/ansi-bifma-office-workstation-space-planning.html) | kaynaklı |
| `cicek-saksi` | ofis | 0.70 × 0.70 × 0.80 | — | Large floor pot 60-75 cm across; 80 cm with flowers. (Common practice.) | [planter-pots](https://potsplantersandmore.com/buying-guides/commercial-planter-sizing/) | kısmen |
| `ofis-sandalye` | ofis | 0.62 × 0.62 × 1.00 | oturak 46 cm | Task chair seat 43-53 cm (17-21 in), overall 0.95-1.09 m (37-43 in); 5th-percentile woman to 95th-percentile man need 38-51 cm. | [chair-branch](https://branchfurniture.com/cdn/shop/files/specs-open-box-task-chair.pdf), [chair-zoro](https://www.zoro.com/i/G6706161/), [people-gvsu](https://www.gvsu.edu/cms4/asset/30F6D8A1-9140-75C7-2CAACF4A83B9D5A8/seatingmeasurements.pdf) | kaynaklı |
| `yonetici-masa` | ofis | 1.80 × 0.90 × 0.76 | üst 76 cm | Executive desk 1.5-1.8 m wide, 0.76-0.91 m deep, 71-76 cm high. | [desk-guide](https://eurekaergonomic.com/blogs/eureka-ergonomic-blog/standard-desk-dimensions-guide), [desk-din](https://yaasa.com/en/blogs/yaasa-blog/schreibtisch-masse) | kaynaklı |
| `yonetici-koltuk` | ofis | 0.72 × 0.72 × 1.20 | oturak 48 cm | High-back executive chair: seat 45-55 cm, overall up to 1.25 m (49 in). | [chair-zoro](https://www.zoro.com/i/G6706161/) | kaynaklı |
| `kanepe` | ofis | 2.00 × 0.90 × 0.85 | oturak 45 cm | Three-seater: 1.83-2.44 m long (2.1 m average), 0.81-1.0 m deep, 0.76-0.91 m high, seat 43-48 cm. | [sofa-castlery](https://www.castlery.com/us/blog/sofa-sizes-and-dimensions), [sofa-interior](https://shop.interiorcompany.com/blogs/guides/standard-sofa-sizes) | kaynaklı |
| `kitaplik` | ofis | 0.90 × 0.33 × 1.83 | — | Office bookcase: 1.83 m (72 in, five shelves), 76-107 cm wide, 30-38 cm (12-15 in) deep. | [bookcase-of2go](https://www.officefurniture2go.com/answers/bookcases-shelving/what-are-the-standard-sizes-for-an-office-bookcase.html) | kaynaklı |
| `fikus` | ofis | 0.90 × 0.90 × 1.50 | — | Indoor fiddle-leaf fig: 1.2-1.8 m. (Common practice.) | — | kısmen |
| `toplanti-sandalye` | ofis | 0.60 × 0.60 × 0.92 | oturak 46 cm | Meeting chair: seat 43-53 cm, back to about 0.9 m. | [chair-branch](https://branchfurniture.com/cdn/shop/files/specs-open-box-task-chair.pdf), [chair-zoro](https://www.zoro.com/i/G6706161/) | kaynaklı |
| `agac-genis` | cadde | 3.00 × 3.00 × 4.50 | — | Broad street tree, 4.5 m (planted stock 3-3.6 m, grows on); its bed a little wider than a 1.5 m pit. | [tree-honolulu](https://www.honolulu.gov/dpp/street-tree-standards/), [tree-sydney](https://meetings.cityofsydney.nsw.gov.au/documents/s67913/Attachment), [tree-stock](https://iris.londoncouncils.gov.uk/viewer/tree-caliper-size-chart.html) | kaynaklı |
| `agac-ince` | cadde | 1.60 × 1.60 × 4.80 | — | Columnar street tree, 4.8 m and slim, for the narrow edges. | [tree-honolulu](https://www.honolulu.gov/dpp/street-tree-standards/), [tree-sydney](https://meetings.cityofsydney.nsw.gov.au/documents/s67913/Attachment), [tree-stock](https://iris.londoncouncils.gov.uk/viewer/tree-caliper-size-chart.html) | kaynaklı |
| `cali` | cadde | 0.90 × 0.90 × 1.00 | — | Boxwood ball in a small stone planter, 1.0 m. (Common practice.) | [planter-pots](https://potsplantersandmore.com/buying-guides/commercial-planter-sizing/) | kısmen |
| `cop-kutusu` | cadde | 0.50 × 0.50 × 0.95 | — | Street litter bin, about 0.9-1.0 m high, 0.4-0.5 m across. (Common practice.) | — | kısmen |
| `hidrant` | cadde | 0.45 × 0.40 × 0.80 | — | Fire hydrant, about 0.75-0.9 m above the pavement. (Common practice.) | — | kısmen |
| `kafe-koltuk` | cadde | 0.80 × 0.80 × 0.82 | oturak 46 cm | Café armchair: seat 43-48 cm, 0.8 m across. | [sofa-castlery](https://www.castlery.com/us/blog/sofa-sizes-and-dimensions), [chair-branch](https://branchfurniture.com/cdn/shop/files/specs-open-box-task-chair.pdf) | kaynaklı |
| `kiosk` | cadde | 0.90 × 0.70 × 1.85 | — | Self-service drinks kiosk, like a vending cabinet, 1.85 m. (No standard found.) | [machine-ggm](https://www.ggmgastro.com/en-gb-eur/commercial-bean-to-cup-coffee-machine-16-drink-options-5-touchscreen-kvacb) | kısmen |
| `gong` | cadde | 2.00 × 0.70 × 2.20 | — | Ceremonial gong on its frame: a 2.2 m frame, a disc 0.9 m across. (No standard: common practice.) | — | kısmen |
| `kapi` | cadde | 7.00 × 0.60 × 4.60 | — | Street gateway: 7 m between its posts, 4.6 m high, clear of vehicles (4.5 m). (Common practice.) | — | kısmen |
| `konsey-masasi` | cadde | 2.20 × 2.20 × 0.76 | üst 76 cm | Round meeting table for five or six: 2.2 m across, 76 cm high. | [conference-of2go](https://www.officefurniture2go.com/answers/conference-tables/what-size-conference-table-for-10-people.html), [desk-din](https://yaasa.com/en/blogs/yaasa-blog/schreibtisch-masse) | kaynaklı |
| `kursu` | cadde | 0.60 × 0.50 × 1.10 | — | Standing lectern / kiosk top: 1.0-1.2 m. (Common practice.) | — | kısmen |
| `pano-cercevesi` | cadde | 3.30 × 0.12 × 2.10 | — | Wall information board: 3.3 x 2.1 m, the street boards (shared/maps/cadde.ts). | — | kısmen |
| `buzdolabi` | cadde | 0.70 × 0.70 × 1.90 | — | Glass-door beverage fridge: 1.8-2.0 m. (Common practice.) | — | kısmen |
| `menu-sehpasi` | cadde | 0.60 × 0.70 × 1.00 | — | Sidewalk A-frame menu board: about 1.0 m. (Common practice.) | — | kısmen |

"Kaynaklı": ölçü, listelenen sayfalardaki aralıktan seçildi. "Kısmen": bir standart bulunamadı, yaygın bir ölçü alındı (sayfada belirtildi).

## Binalar

Cadde binaları KayKit City Builder Bits'ten (CC0). Çizildikleri yükseklik 1.55-2.95 birim; sokağa 5 ile, kenar sıraya 1,5-1,9 ek çarpanla konur: **12-28 m**, yani kat başına 3,5-4 m ile 3-7 katlı. Zemin kat cam ofisler 4,2 m tavanlı, 44 m (yönetim) ve 14 × 18 m (ekip ofisleri). Yangın musluğu 0,8 m (yaygın ölçü, kaynak aranmadı).
