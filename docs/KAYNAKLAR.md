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

Toplam: 61 kredi (onaylanan ~61). Kalan bakiye yaklaşık 529,5.

## Kendi karakterlerimiz

| Karakter | Rol | Dosya | Klipler | Nasıl yapıldı |
| --- | --- | --- | --- | --- |
| Aslan (lacivert üç parça takım, altın kravat iğnesi) | lead | `src/client/models/aslan.glb` (2 MB, yalnızca bir ajan giyince yüklenir) | idle, walk, sit | Higgsfield konsepti → 4 ayrı açı → Meshy multi_image_to_3d (dokulu, iskeletli) → Meshy rigging klipleri → `blender/scripts/merge_clips.mjs` |
