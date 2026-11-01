# Living Terminal 0.2

VS Code içinde gerçek Claude Code’un arkasında, terminal alanının tamamını kaplayan 24 canlı ASCII dünya. Alt bölümde **Living Terminal** sekmesini aç; **Yeni Claude oturumu** veya **Konuşmaya devam et** seç.

Tema: Claude Code içinde **`/theme` → `Living · …`**. Hareket ve parlaklık: **`/living`** veya panelin sağ üstündeki ayarlar. Cmd+C seçili metni kopyalar, Cmd+V yapıştırır; Ctrl+C Claude’un çalışan yanıtını durdurur.

Yerel macOS Apple Silicon, VS Code 1.100+ ve kurulu Claude Code gerektirir. Living Themes Claude eklentisinin aynı sürümü kullanıcı kapsamında kurulmalıdır. `CLAUDE_CONFIG_DIR` kullanıyorsan VS Code’u da bu ortam değişkeniyle başlat.

## Çalışma şekli

- Panel gizlenince Claude çalışmaya devam eder; arka plan animasyonu durur.
- Sekmedeki × çalışan süreci durdurmadan önce onay ister.
- VS Code yeniden yüklenince oturum bilgileri geri gelir; süreç otomatik yeniden başlatılmaz. Devam düğmesi `/resume` akışını açar.
- Eski standart terminal süreçleri bu panele taşınmaz. Mevcut konuşmaya devam etmek için önce eski oturumu uygun şekilde kapatıp burada devam et.
- Standart terminalde tam arka plan yoktur ve dört satırlık eski şerit çizilmez.
- Terminal içeriği yalnızca bellekte tutulur. Diske görünüm tercihleri ve konuşmaya devam için oturum kimliği/proje metaverisi yazılır. Telemetri veya ağ servisi yoktur; Claude’un kendi bağlantısı normal şekilde devam eder.
- Dev Island Terminal Router 0.1.1 kuruluysa bildirimden ilgili Canlı Terminal oturumuna dönüş desteklenir.

Geliştirme: `npm install`, `npm run build`, `npm run check`, `npm test`, `npm run package`. VSIX, yalnızca gerekli darwin-arm64 node-pty ikililerini içerir. İkili `spawn-helper` dosyasının çalıştırılabilir biti derlemede ve pakette doğrulanır.
