# Ekipler (ordu.json)

Back to the [README](../README.md).

Her proje (kat), ajanlarını **ofis → ekip → rol** olarak düzenleyebilir. Yapı, projenin
`.agent-office/ordu.json` dosyasında durur. Bu dosya git'e girmez, çünkü ofis `.agent-office/`'i
`.git/info/exclude`'a ekler. **☰ → Ekipler** paneli bu yapıyı gösterir: her rolün durumu, şu an ne yaptığı
ve son raporu. Paneldeki düğmeler:

- **➕ İşe al:** rol için bir ajan açar. Ajan rolün masasına (`desk`) ya da boş ilk masaya oturur.
  `claude --agent <agent>` ile, yani projenin kendi `.claude/agents/<agent>.md` dosyasıyla başlar. Model ve
  efor rol dosyasından gelir, `ordu.json`'da `model` / `effort` verilmişse o kullanılır. Ajan ortak checkout'ta
  çalışır, ayrı bir worktree'de değil.
- **💻 Terminal:** rolün ajanının terminalini açar.
- **📝 İş ver:** çalışan role bir sonraki prompt'unu yazar.

Rol olarak işe alınan her ajanın ilk prompt'u şu sırayla kurulur:
1. Kısa bir **ofis notu**: diğer rolleri `hire_worker` (`role` alanıyla) ile işe alabileceğini ve onlara
   `tell_worker` ile yazabileceğini, merge, push ve para harcayan işler için onay istemesi gerektiğini anlatır.
2. Rolün `brief` dosyası.
3. `reportDir` verilmişse görev klasörü: `Görev id: <id> · çalışma klasörün: <reportDir>/<id>/`.
4. Verilen iş. İş verilmediyse rolün `prompt`'u.

Ajanlar da birbirini işe alabilir. agent-office MCP'sindeki `hire_worker` aracı artık `role` alır. Rolün
masası, ajan dosyası, modeli ve eforu o rolden gelir.

## Dosya

```json
{
  "version": 1,
  "reportDir": ".claude/work",
  "offices": [
    { "id": "muhendislik", "name": "Mühendislik ofisi", "teams": [
      { "id": "backend", "name": "Backend", "color": "#4a8fe7", "roles": [
        { "name": "be-lead", "title": "Kaplan", "agent": "be-lead", "character": "kaplan" }
      ] }
    ] }
  ]
}
```

| Alan | Ne |
| --- | --- |
| `reportDir` | Görev klasörlerinin yeri, proje içinde göreli. Panel her rol için o görevin `report.md` dosyasındaki `Durum:` satırını gösterir. `verify…` rolleri için `verify.md` dosyasındaki `Sonuç: GEÇTİ/KALDI` satırını gösterir. |
| `name` | Rolün adı (`a-z 0-9 - _`). Bütün dosyada tekil olmalı. |
| `title` | Ajanın adı, yoksa `name` kullanılır. |
| `agent` | `.claude/agents/<agent>.md`. Dosya yoksa ajan `--agent` olmadan açılır ve bir uyarı gösterilir. |
| `model`, `effort` | Rol dosyasındaki modeli ve eforu ezer. |
| `brief` | İlk prompt'un başına eklenecek talimat dosyası. Önce projede, sonra bu reponun `ordu/` klasöründe aranır. |
| `prompt` | İş verilmeden işe alınınca yapacağı iş (zamanlanmış roller için). |
| `desk` | Rolün sabit masası (`desk-3`). |
| `resident` | Hep açık kalan rol (lider). |
| `character` | Karakter kataloğundaki hayvan (ileride 3D karakteri seçecek). |

`ordu.json` yoksa roller `.claude/agents/*.md` dosyalarından türetilir: tek ofis, tek ekip. Dosya bozuksa
panel nedenini Türkçe gösterir ve yine türetilmiş yapıyı kullanır.

## Cadde haritasında

⚙️ Ayarlar → 🏢 Bina → Harita → **🏙️ Cadde** seçilince her ofis caddede kendi cam binasına yerleşir. `offices`
listesindeki sıra, binaların sırasıdır: birincisi caddenin başındaki lider ofisine, sonrakiler batı ve doğu
sırayla aşağı doğru yerleşir. Binanın tabelasında ofisin adı yazar, çatısında ve arka duvarında ilk ekibin rengi
görünür. `desk` verilmemiş bir rol işe alınınca kendi ofisindeki boş bir masaya oturur. Ofis doluysa ilk boş
masaya geçer. Bir ofisin kapısında **E**'ye basınca Ekipler panelinde o ofis öne gelir.

## Şablonlar

`ordu/sablonlar/yazilim.json`, bir lider altında 15 rollük bir yazılım ekibidir: keşif, frontend,
backend, hata avı, doğrulama ve güvenlik. Liderin talimatı `ordu/roller/lead.md`'dedir. Kullanmak için:

```bash
cp ordu/sablonlar/yazilim.json <proje>/.agent-office/ordu.json
```
