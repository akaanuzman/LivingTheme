# Living Themes 0.4.1 — doğrudan terminal doğrulaması

48 tema sürümünde eski 24 sahne korunur ve 24 yeni kompozisyon eklenir. Tam alan testindeki benzersizlik karşılaştırması renkleri değil karakter geometrisini karşılaştırır.

## Gerçekten çalıştırılanlar

- `npm test`: 32 katalog, tercih eşitleme, atomik kayıt ve eski saf ASCII motoru testi geçti.
- `terminal/` altında `npm test`: 13 test geçti (5 tam alan birleştirici, 4 yönlendirme ve 4 gerçek zsh/kabuk kurulum testi). 48 farklı dünyanın 48×18 ve 160×48 boyutlarında çizimi ve zamanla değişmesi; Türkçe, geniş Unicode hücreleri, gerçek RGB metin ve diff arka planları; ters/gizli yazı; metin aralarındaki sakin alan; gizleme; tam kareye eşdeğer artımlı çizim ve veri azaltma doğrulandı.
- `claude plugin test .`: 5 mod testi geçti. Yerleşik `/theme` korunması, şerit çizilmemesi, gerçek kontrol paneli, parlaklık/hareket sınırları, `/clear` ve zamanlayıcı kapanışı doğrulandı.
- `claude plugin validate --strict .`: geçti. Gereksiz `classic.SessionStart` kancası yoktur.
- Terminal kaynakları ve ortak modüller strict TypeScript kontrolünden geçti.
- `terminal/tests/smoke-pty.py`: **gerçek Claude Code 2.1.309** ile iki gerçek PTY oturumunda 8 kabul kontrolü geçti. API anahtarı/OAuth token devralınmadı; geçici `CLAUDE_CONFIG_DIR` kullanıldı; model isteği sayısı **0**.

Dağıtım paketi de ayrı bir dizine açılarak denendi: bağımsız native PTY başlatma, UTF-8 yankısı ve alternatif ekran temizliği geçti. Kurulan `~/.local/bin/living --living-doctor` doğru gerçek Claude yolunu doğruladı; Claude eklentisinin önbelleğinde sürüm doğrulanır.

## Otomatik `claude` komutu — 0.4.1

- `LIVING_TEST_AUTOMATIC=1` ile gerçek PTY kabulü tekrar çalıştırıldı: iki zsh oturumunda doğrudan `claude` komutu kullanılarak 8 kontrol geçti. Model isteği: 0. Ayrı `living` çağrısı kullanılmadı.
- Gerçek zsh ve PTY üzerinde izleme amaçlı yerel bir CLI ile etkileşimli `claude` ve `--resume` çağrılarının çiziciyi bir kez açtığı, CLI 37 koduyla çıkınca yeniden başlatılmadığı ve aynı kodun korunduğu doğrulandı.
- Aynı testte `-p`, `plugin list`, `--version` ve borulu kullanımın animasyonsuz çıktısı, boşluk/Türkçe/literal kabuk işaretleri içeren argümanları ve çıkış kodları aynen korundu.
- Kabuk kurulumunun tekrar çalıştırılması ikinci blok eklemez. Özel yedek 0600 izinlidir; diğer ayarlar ve kullanıcı tarafından sonradan eklenen satırlar korunur. Kaldırma yalnızca işaretli bloğu siler. Başkasına ait mevcut geçici dosya silinmez.
- Bağlantı zsh işleviyle yapılır. PATH, kurulu Claude ikili dosyası, VS Code ayarları ve çalışan oturumlar değiştirilmez. Bash/fish gibi başka kabuklar otomatik entegrasyon kapsamına alınmaz; onlarda elle `living` kullanılabilir.

## Gerçek PTY kabul kontrolleri

1. Gerçek Claude Code ve kendi `/theme` seçicisi tam ekran terminal birleştiricisinin içinde çalışır.
2. İki Claude oturumu ortak sahne ve duraklatmayı takip eder.
3. `/living brightness 65`, gizle/göster ve devam kontrolleri tam alan çizimine ulaşır.
4. Gerçek Claude girişinde `Türkçe: ığüşöç İĞÜŞÖÇ` aynen görünür. Bu metin modele gönderilmemiştir.
5. Koi Pond, Jellyfish ve Cloud Drift gerçek `/theme` menüsünden değiştirilir.
6. Yeni Whale Song, Dragon Flight ve Black Hole, genişleyen gerçek 48 temalı `/theme` menüsünden seçilir.
7. Gerçek PTY 140×42’den 76×26’ya küçültülür; `/clear` sonrasında sahne tercihi korunur.
8. Yerleşik `dark` seçimine dönüş canlı figürleri kapatır. Test oturumları sonunda `/exit` ile kapatılır; başlatıcının çıkış temizliği uygulanır.

`report.json` bu çalışmanın otomatik sonucudur. `Living-Themes-real-terminal.cast` gerçek terminale gönderilen ANSI çıktının asciinema v2 kaydıdır. PNG ve GIF dosyaları bu gerçek PTY akışının xterm ayrıştırıcısıyla yeniden çizilmiş görüntüleridir; işletim sistemi ekran görüntüsü değildir. Sahte Claude yanıtı veya katalog maketi içermez. Test yapılandırması giriş yapmadığından ekranda giriş uyarısı bulunabilir; normal kullanım kullanıcının mevcut Claude yapılandırmasını ve hesabını devralır.

## Henüz doğrulanmayanlar

- Apple Terminal, iTerm2, Ghostty gibi her uygulamanın kendi fare seçimi/kopyalama davranışı için ayrı görsel kabul yapılmadı.
- Canlı model konuşması, araç çalıştırma, soru/izin ekranlarının tümü ve Dev Island’dan bu başlatıcıya özel dönüş bu terminal sürümünde uçtan uca kabul edilmedi. Mevcut Claude izin mekanizması değiştirilmez.
- Kabuk geçmişi yerine alternatif ekran kullanılır. 3.000 satırlık VT ayrıştırıcı geçmişi tutulur; terminalin kendi normal kaydırma geçmişine bütün animasyon kareleri yazılmaz. Claude’un kendi kaydırma davranışı ona iletilen girişlerle çalışır; bütün terminal uygulamalarında ayrıca kabul edilmiş sayılmaz.
- Aynı Mac’teki diğer Claude oturumlarının özel vurgu renklerini API ile değiştirmesi kabul kapsamına alınmadı; orada da `/theme` gerekebilir.
- Grafik masaüstü fan konseptinin birebir kopyası hedeflenmez. Bu sürümde gerçek terminal hücreleriyle tüm alanı kaplayan animasyon uygulanmıştır.

## Tekrarlama

```sh
cd /Users/kaanuzman/Desktop/dev/LivingThemes
npm test
claude plugin test .
claude plugin validate --strict .
cd terminal
npm run build
npm test
LIVING_TEST_OUTPUT=/private/tmp/living-proof python3 tests/smoke-pty.py
```

Deneme kayıtları yalnızca bu betiğin oluşturduğu geçici Claude oturumlarından alınır. Kullanıcının aktif konuşmalarına girilmez veya bunlar kaydedilmez.
