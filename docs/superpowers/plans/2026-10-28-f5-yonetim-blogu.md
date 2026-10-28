# F5 — Yönetim bloğu, ofis içleri ve dış mekân · plan

Mahmut'un isteği: Aslan (CEO) için premium bir ofis. İçinde asistanı, ona rapor veren müdürler, 10 kişilik toplantı
odası ve CEO odasının yanında Mahmut'a ayrı güzel bir oda. Ayrıca bütün ofislerin içleri, dışarıdaki ağaçlar, bankları,
kahve makinesi, sandalyeler yeniden tasarlanacak; ekran görüntülerinden Meshy'ye ürettirilecek.

## Yerleşim (caddenin başı, kuzey ucu)

Liderlik binasının (bölge 0) yerine 44 × 10 m'lik **yönetim bloğu**. Güney cephesi cam (caddeye bakar), kuzey duvarı
cam (şehir manzarası). Odalar cam bölmeli, pirinç çerçeveli.

```
 z=-36.5 ┌───────────┬───────────┬───────────┬─────────────────────┐
         │ MAHMUT'UN │   CEO     │ KAHVE     │ TOPLANTI ODASI      │
         │   ODASI   │   ODASI   │ KÖŞESİ    │ (10 kişilik masa)   │
 z=-31   ├─────┬─────┴─────┬─────┴───────────┴───────┬─────────────┤
         │  müdür masaları  · asistan masası (açık ofis, cam cephe) │
 z=-26.5 └───────────────────────[ giriş ]─────────────────────────┘
          x=-22                                                  x=22
```

- **CEO odası:** koyu ceviz zemin, geniş yönetici masası (pirinç kenar, deri koltuk), kanepe ve alçak masa, kitaplık,
  halı, kuzey duvarı boydan boya cam. Kapısı lobiye (asistanın önüne) açılır. Aslan'ın masası (desk-1).
- **Mahmut'un odası:** CEO odasının hemen yanında (batı), açık meşe zemin, komuta masası ve büyük ekranlar, rahat
  koltuk, kupa rafı, kuzeyde cam. Kapısı lobiye açılır. Ajan oturmaz (senin odan).
- **Asistan ve müdürler:** lobide, CEO kapısının önünde asistan (Kızıl Panda, desk-2), yanında 4 müdür masası (desk-3…6:
  Susamuru fe-lead, Kaplan be-lead, Tavşan bug-hunter, Geyik verify-be). Cam cepheye bakarlar.
- **Toplantı odası:** 10 kişilik uzun masa, 10 deri sandalye, duvarda büyük ekran, beyaz tahta. (Canlı toplantı özelliği
  şimdilik 5 koltuklu masada kalır, kafenin güneyinde; 10'a çıkarmak sunucuyu da ilgilendiren ayrı bir iş.)
- **Kahve köşesi:** CEO ile toplantı odası arasında bar, kahve makinesi, iki tabure.

## Model (paylaşılan)

- `PropConfig`: `style?: string` (odanın türü), `label?: string` (kapı tabelası).
- Yeni prop türü `suite` (blok): boyutu, `rotY` dik açılı. Oda yerleşimi `suiteRooms(p)` ile hesaplanır (saf, test edilir):
  adı, türü, dikdörtgeni, kapısı. Duvarlar kapı boşluklu dikdörtgenlere bölünür (çarpışma ve yol planı).
- `TableConfig`: `first?: boolean` (koltukları desk-1.. sırasının başına), `look?: 'bench' | 'desk'` (yönetici masası ve
  koltuk; bank çizilmez, koltuk başına çarpışma kutusu).
- `zones.ts`: `suite` da bir bölge (bütün blok).
- Sunucu: `ordu/sablonlar/yazilim.json` — ilk ofis "Yönetim", müdürlere `desk`.

## Ofis içleri (her ofis kendi işini anlatır, ışık parlak)

| Ofis | İç tasarım |
|---|---|
| Keşif | Duvarda dünya haritası, orta masada maket/harita, dürbün rafı, sandık ve yeşil aksan |
| Tasarım stüdyosu | Mercan renk duvarı, çizim tahtaları, renk örneği panosu, geniş ekran, rahat koltuklar |
| Mühendislik | Çift monitörlü masalar, sunucu dolabı (LED'li), mavi aksan, beyaz tahta |
| Hata laboratuvarı | İp bağlantılı pano (dedektif duvarı), büyüteç lambası, mor aksan |
| Test laboratuvarı | Laboratuvar tezgâhı, GEÇTİ/KALDI ışıklı levha, turkuaz aksan |
| Güvenlik merkezi | Kamera ekran duvarı, dolaplar, gri aksan |

Hepsinde: parlak tavan ışıkları, açık renkli zemin, KayKit mobilya (kanepe, raf, lamba, resim), bitkiler.

## Dış mekân

Ağaçlar (gerçek yapraklı, sıralı saksılı), bankalar (ahşap-metal), sokak lambaları (modern), kafe masası ve şemsiye,
kahve tezgâhı ve makinesi, saksılar. Ofis sandalyesi ve masalar da yeniden yapılır.

## Üretilecek varlıklar (Meshy, ekran görüntüsünden)

Her varlık: ekran görüntüsü → Meshy image-to-image (premium yeniden çizim, beyaz zemin, 6 kredi) → image-to-3D dokulu
(30). 16 varlık, her biri için 2 öneri: 16 × (12 + 30) = **672 kredi**; tek öneriyle 576.

Sokak ağacı, sokak lambası, bank, kafe masası ve şemsiye, kahve tezgâhı, kahve makinesi, ofis sandalyesi, ofis masası,
yönetici masası, yönetici koltuğu, deri kanepe, kitaplık, büyük saksı, ofis bitkisi (fikus), çiçek saksısı, toplantı
sandalyesi.

## Sıra

1. Plan (bu belge), yerleşim. 2. Paylaşılan model + test ajanı. 3. İstemci: yönetim bloğu. 4. Varlık üretimi (paralel).
5. Ofis içleri ve dış mekân. 6. Gözden geçirme, PR.
