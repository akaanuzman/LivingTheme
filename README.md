# Living Themes — terminalin tamamında canlı Claude Code

**`claude` yaz → `/theme` → tema seç.** Kurulum zsh’de normal `claude` komutuna canlı başlatıcıyı otomatik bağlar. Ardından Claude’un **`/theme` → `Living · …`** menüsünden 48 sahneden birini seç: arka plan terminal alanının tamamına yayılır. Konuşmalar, komut girişi, menüler ve diff renkleri ön planda kalır. VS Code, tarayıcı veya ayrı masaüstü uygulaması gerekmez.

Bu sürüm önceki dört satırlık şeridi kaldırır. Canlı görüntüyü bir PTY birleştiricisi üretir: Claude’un gerçek terminal çıktısı xterm’in başsız VT ayrıştırıcısından geçer; dolu metin hücreleri ve özel arka plan renkleri korunur, boş alanlara ASCII dünya çizilir. Animasyon modeli çağırmaz, prompt veya araç izni eklemez. Claude’un kurulu ikili dosyası ve normal hesabı kullanılır.

## Bu Mac’te başlat

Node 24+ ve Claude Code gereklidir. Bu çalışma dizinindeki paketler ve derlenmiş başlatıcı hazırdır:

```sh
claude
```

Yeni bir zsh terminali aç ve `claude` yaz; ardından **`/theme` → `Living · Koi Pond`** seç. `Jellyfish`, `Cloud Drift`, `Honu Lagoon` ve diğer temalar aynı listede bulunur. Kurulum betiği çalıştırılmışsa kısa komut da kullanılabilir:

```sh
~/.local/bin/living
```

Mevcut konuşmayı devam ettirmek için `claude --resume` veya Claude içinde `/resume` kullan. Başlatıcı mevcut çalışan Claude süreçlerini taşımaz; yeni bir gerçek Claude süreci açar. İlk deneme için sahneyi açılışta belirtmek de mümkündür:

```sh
~/.local/bin/living --living-theme koi-pond
```

Bu seçenek ilk sahneyi belirler; sonraki `/theme` seçimi yönetimi devralır. Diğer Claude seçenekleri aynen iletilir. `--living-claude /tam/yol/claude`, `--living-fps 15`, `--living-list`, `--living-doctor` ve `--living-help` başlatıcıya aittir. Varsayılan 10 FPS; sınır 1–30 FPS’dir. Daha sakin bir görünüm için `LIVING_THEMES_REDUCE_MOTION=1 ~/.local/bin/living` sabit sahne çizer.

## Claude içindeki kontroller

- `/theme`: gerçek Claude tema listesi. Tema değiştirme bunun üzerinden yapılır.
- `/living`: duraklatma, görünürlük, parlaklık ve hareket yoğunluğu paneli.
- `/living pause`, `/living resume`: sahneyi mevcut karede durdur/devam ettir.
- `/living hide`, `/living show`: canlı sahneyi gizle/göster.
- `/living brightness 65`, `/living intensity 40`: yüzde cinsinden ayarlar.
- `/living status`: yerel tema, paylaşılan seçim ve kontrol değerleri.
- `/exit`: Claude ve başlatıcı kapanır; terminal normal kabuk ekranına döner.

Aynı `CLAUDE_CONFIG_DIR` kullanan canlı Claude oturumları seçim ve kontrolleri ortak küçük JSON dosyalarından izler. Yerleşik veya başka bir eklenti teması seçilince canlı figürler kapanır. Özel Claude vurgu renklerini diğer açık oturumlarda da `/theme` ile seçmek gerekebilir; daha önce kabul edilen bu sınırlama korunur.

## 48 dünya

| Video esintileri | Sakin doğa | Uzay | Şehir ve fantastik |
| --- | --- | --- | --- |
| Claude Ember | Fireflies | Aurora | Neon Tokyo |
| Cloud Drift | Moonlit | Saturn Rings | Matrix Rain |
| Honu Lagoon | Sakura Rain | Meteor Shower | Synthwave Road |
| Koi Pond | Bamboo Mist | Nebula | Clockwork Garden |
| Jellyfish | Autumn Creek | Lunar Horizon | Crystal Cave |
| Paper Boats | Snow Cabin | Solar Flare | Lava Forge |

Büyük figürler, parçacıklar ve ortam dokuları terminalin bütün boyutlarına göre çizilir. Hücrelerin fiziksel en/boy oranı hesaba katılır; panel uzarken figürler şerit gibi gerilmez. Metin satırlarındaki kelimelerin arasına sahne karakteri girmez; yazıların altındaki sakin zemin okunabilirliği korur.


### 0.4 ile gelen 24 yeni dünya

| Okyanusun derinlikleri | Gökyüzü masalları | Saklı dünyalar | Kozmik oyun alanı |
| --- | --- | --- | --- |
| Whale Song | Dragon Flight | Mushroom Grove | Black Hole |
| Manta Ballet | Phoenix Rise | Enchanted Library | Orbital Station |
| Seahorse Reef | Butterfly Meadow | Teahouse Rain | Rocket Launch |
| Octopus Den | Floating Islands | Desert Caravan | Alien Orchard |
| Coral Garden | Sky Lanterns | Bonsai Zen | Retro Arcade |
| Submarine Voyage | Thunderstorm | Midnight Express | Hologram City |

Güncellemeden sonra yeni bir terminalde `claude` ile bir oturum aç. Açık oturumun başlatıcısı eski sahne motorunu bellekte tutar; yalnızca `/reload-plugins` yeni tam ekran çizim kodunu yüklemez. Konuşmana `/resume` ile dönebilirsin. Ardından `/theme` menüsünden yeni sahneleri seç.

`npm run preview` tam alan motorundan 48 temalı, aramalı ve duraklatılabilir yerel bir HTML kataloğu üretir; bu katalog Claude oturumunun ekran görüntüsü değildir.

## Kurulum ve geliştirme

```sh
cd /Users/kaanuzman/Desktop/dev/LivingThemes
bash scripts/install-terminal.sh
```

Betik Claude eklentisini kullanıcı kapsamında günceller, isteğe bağlı elle başlatma için `~/.local/bin/living` bağlantısını oluşturur ve `.zshrc` içine işaretli tek bir yükleme bloğu ekler. Önceki kabuk dosyası `.zshrc.living-themes-backup` adıyla 0600 izinli yedeklenir. Mevcut diğer ayarlar korunur. Kurulumdan sonra yeni bir terminal açmak yeterlidir: **`claude` → `/theme`**.

Otomatik bağlantı yalnızca etkileşimli zsh’de çalışır. Kurulu Claude ikili dosyası ve PATH değiştirilmez. `claude -p`, `--help`, `--version`, eklenti/MCP yönetimi, SDK akışları, dosyaya yönlendirme ve borular gerçek Claude’a aynen iletilir. Erişilebilirlik modu, arka plan/masaüstü oturumları ve iç içe çağrılara animasyon eklenmez. Geçici olarak doğrudan CLI kullanmak için `LIVING_THEMES_DISABLE=1 claude` veya `command claude` kullanılabilir.

Yalnızca kabuk bağlantısını kaldırmak için `python3 scripts/install-shell.py --remove` çalıştır ve yeni bir terminal aç. Elle başlatmak için `~/.local/bin/living` hâlâ kullanılabilir. Claude’un mod API’si genel arka plan katmanı sunmadığından çizici başlangıçta bağlanır; bunu artık otomatik kabuk bağlantısı yönetir.

Kaynak derlemesi:

```sh
npm run build
cd terminal
npm ci
npm run build
npm test
cd ..
npm test
claude plugin test .
claude plugin validate --strict .
```

`terminal/` kendi `node-pty`, `@xterm/headless` ve esbuild bağımlılıklarıyla bağımsızdır. `shared/world.ts` 48 tam alan sahneyi, `terminal/src/compositor.ts` hücre çizimini, `terminal/src/main.ts` PTY ve terminal yaşam döngüsünü içerir. Önceki VS Code denemesi kaynak dizininde tutulur; terminal sürümünün çalışması veya derlenmesi buna bağlı değildir.

## Sınırlar ve doğrulama

Bu bir terminal hücresi çizimidir: videodaki grafik masaüstü arayüzünün birebir kopyası değildir. Referans video bir fan konseptidir. Aynı tam ekran sahne fikri gerçek Claude Code üzerinde uygulanır; orijinal video veya görsel varlıklar dağıtılmaz.

Başlatıcı terminalin alternatif ekranını kullanır. Claude’un kendi ekranı ve kaydırma davranışı çalışmaya devam eder; kabuğun normal kaydırma geçmişine animasyon kareleri eklenmez. Terminal uygulamasının fareyle seçim/kopyalama ve ekran görüntüsü davranışı uygulamaya göre değişebilir. Hızlı animasyon sırasında seçim zorlaşırsa önce `/living pause` kullan. Tüm yerel terminal uygulamalarında veya bütün izin ekranlarında görsel kabul yapılmış değildir. Testler ve gerçek PTY kaydı `docs/VALIDATION.md` içinde açıkça ayrılmıştır.

Depolanan tercihler: `$CLAUDE_CONFIG_DIR/plugins/living-themes/state-v1/` (varsayılan `~/.claude/...`). Kullanıcı konuşmaları başlatıcı tarafından dosyaya kaydedilmez. Tanılama amaçlı gerçek PTY testleri yalnızca geçici yapılandırmalı kendi oturumlarını kaydeder ve model isteği yapmaz.

Kaldırma: `~/.local/bin/living` bağlantısını sil ve `bash scripts/uninstall.sh` çalıştır. Proje ve Claude’un kendi kurulumu korunur.

## Kaynaklar

- [Claude Code mod çizim alanları](https://code.claude.com/docs/en/plugins/mods/interface)
- [Referans fan konsepti](https://x.com/handsher_NGU/status/2115618341675319417)
- [xterm.js](https://github.com/xtermjs/xterm.js)
- [node-pty](https://github.com/microsoft/node-pty)
