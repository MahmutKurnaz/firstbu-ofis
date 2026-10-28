# Kaynaklar ve harcamalar

Ajan Şehri'nin dış kaynaklardan gelen varlıkları ve her ücretli üretim (Selma'nın kuralı: her üretimden önce
fiyat, sonra kayıt). Krediler Higgsfield kredisidir.

## Ücretsiz (CC0)

| Varlık | Kaynak | Lisans | Nerede |
| --- | --- | --- | --- |
| KayKit City Builder Bits 1.0 | github.com/KayKit-Game-Assets (Kay Lousberg) | CC0 | `src/client/models/kaykit-city.glb` |
| KayKit Furniture Bits 1.0 | aynı | CC0 | `src/client/models/kaykit-furniture.glb` |
| KayKit Restaurant Bits 1.0 | aynı | CC0 | `src/client/models/kaykit-cafe.glb` |

## Ücretli üretimler

Onay: Mahmut, 2026-10-28, aslan için yaklaşık 61 kredi. Başlangıç bakiyesi 590,53.

| Tarih | Ne | Model | Adet | Kredi | İş id |
| --- | --- | --- | --- | --- | --- |
| 2026-10-28 | Aslan konsepti, 4 açılı (4 öneri; sonrakilerde 2) | gpt_image_2_5 (low) | 4 | 1,00 | 64ba283a…, c365bc76…, bc81ba1c… (seçilen), f0e12b27… |
| 2026-10-28 | Aslan ayrı açılar (ön, sol, arka, sağ) | gpt_image_2_5 (low) | 4 | 1,00 | 7c06a32c…, e715eeb5…, 4741bbd1…, 15134c3c… |
| 2026-10-28 | Aslan 3D, dokulu, iskeletli (A-poz, 12k üçgen) | multi_image_to_3d (Meshy) | 1 | 35 | b6f9c461… |
| 2026-10-28 | Aslan animasyonları: bekleme (Idle, 0), yürüme (Casual_Walk, 30), oturma (Chair_Sit_Idle_M, 33) | 3d_rigging (Meshy) | 3 | 24 | 00f73030…, 3ef100fc…, 377c4138… |
| 2026-10-28 | Aslan kahve içme klibi (Sit_and_Drink, 343) | 3d_rigging (Meshy) | 1 | 8 | e0b94b0e… |

Toplam: 69 kredi (aslan için onaylanan ~61, sonra kahve klibi için ayrıca onaylanan 8). Kalan bakiye yaklaşık 521,5.

## Kendi karakterlerimiz

| Karakter | Rol | Dosya | Klipler | Nasıl yapıldı |
| --- | --- | --- | --- | --- |
| Aslan, premium ve kaslı sürüm (lacivert takım, altın kravat iğnesi) | lead (`character: "aslan"`) | `src/client/models/aslan.glb` (1,6 MB, yalnızca bir ajan giyince yüklenir) | idle, walk, sit, drink (+ kodla klavyede yazma ve etrafa bakma) | Meshy konsept görseli (nano-banana-2) → Meshy image-to-3D (meshy-7.1) → Meshy rigging → Meshy animations (`action_ids`) → `blender/scripts/merge_clips.mjs --from` |
| Aslan, ilk sevimli sürüm | `character: "aslan-sevimli"` ile seçilir | `src/client/models/aslan-sevimli.glb` (2,2 MB) | idle, walk, sit, drink | Higgsfield konsepti → Meshy multi_image_to_3d (Higgsfield üzerinden) → klipler |

## Meshy doğrudan (Mahmut'un kendi hesabı, 5.500 aylık kredi) — aslan 2. sürüm (premium, kaslı)

Onay: Mahmut, 2026-10-28, ~72 Meshy kredisi (iki yol). Anahtar macOS Anahtar Zinciri'nde (`meshy-api`), repoda yok.

| Tarih | Ne | Model | Kredi | İş id |
| --- | --- | --- | --- | --- |
| 2026-10-28 | 2 konsept görsel, A-poz (kaslı, premium aslan) | nano-banana-2 | 12 | 01a18133-0218…, 01a18133-0702… |
| 2026-10-28 | Seçilen görselden 3D, dokulu (2K), A-poz | meshy-7.1 image-to-3d | 30 | 01a18133-bee6… |
| 2026-10-28 | Yazıdan 3D şekil (preview) | meshy-7.1 text-to-3d | 20 | 01a18133-c487… |
| 2026-10-28 | Yazıdan 3D doku (refine, 2K) | meshy-7.1 text-to-3d | 10 | 01a18135-36a4… |

| 2026-10-28 | İskelet (rigging), seçilen görselden 3D'ye | Meshy rigging | 5 | 01a1813b-a12c… |
| 2026-10-28 | 4 animasyon tek dosyada: Idle (0), Casual_Walk (30), Chair_Sit_Idle_M (33), Sit_and_Drink (343) | Meshy animations (`action_ids`) | 12 | 01a1813d-f00d… |

Toplam: 89 Meshy kredisi (72 + ayrıca onaylanan 17). Bakiye 5.500 → 5.411.
Sonuç: görselden 3D (01a18133-bee6…) yazıdan 3D'den belirgin biçimde daha iyi: aslan başı, yele ve kuyruk korunuyor; yazı yolu insan eli ve saçına kaçıyor, kuyruk yok.

## Kadro konseptleri (Meshy, doğrudan) — 29 karakter × 2 öneri

Onay: Mahmut, 2026-10-28 ("hepsi olur … tasarlamaya başla"), 348 Meshy kredisi. Model: nano-banana-2, A-poz, tanesi 6 kredi, toplam 58 görsel.
Karakterler ve istemler: `docs/karakterler.md` ve `blender/scripts/meshy_concepts.py`. Görseller (küçültülmüş) ve iş numaraları: `docs/konseptler/` (`tasks.json` karakter → iki iş id'si).

| Tarih | Ne | Kredi |
| --- | --- | --- |
| 2026-10-28 | 13 rol + 10 yedek hayvan + 6 NPC için 58 konsept görsel | 348 |

Bakiye: 5.411 → 5.063.
