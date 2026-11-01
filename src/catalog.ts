export type Palette = { bg: string; text: string; accent: string; secondary: string; muted: string; glow: string };
export type Theme = { id: string; name: string; group: string; description: string; palette: Palette };
const theme = (id: string, name: string, group: string, description: string, colors: string[]): Theme => ({
  id, name, group, description,
  palette: { bg: colors[0]!, text: colors[1]!, accent: colors[2]!, secondary: colors[3]!, muted: colors[4]!, glow: colors[5]! },
});
export const THEMES: Theme[] = [
  theme('claude-ember', 'Claude Ember', 'Video esintileri', 'Köz gibi nefes alan ASCII yıldızı', ['#201713','#efdfd1','#f5a17a','#c8ab78','#654432','#ffd4a3']),
  theme('cloud-drift', 'Cloud Drift', 'Video esintileri', 'Gökyüzünde süzülen katmanlı bulutlar', ['#122536','#e2f1ff','#97cefa','#c5e4f7','#365975','#fff0c4']),
  theme('honu-lagoon', 'Honu Lagoon', 'Video esintileri', 'Mercanların üzerinde yüzen kaplumbağalar', ['#082b30','#d1f5ec','#63d4bd','#e1c66b','#236c71','#fff1ad']),
  theme('koi-pond', 'Koi Pond', 'Video esintileri', 'Nilüferler arasında balıklar ve su halkaları', ['#142a25','#e0f0df','#efa47d','#a5cd86','#385e50','#fff1c7']),
  theme('jellyfish', 'Jellyfish', 'Video esintileri', 'Derin mavide yükselen ışıklı denizanaları', ['#101c35','#dbe8fc','#c7a5fa','#75d0e9','#344f79','#f3d4ff']),
  theme('paper-boats', 'Paper Boats', 'Video esintileri', 'Dalgalar üzerinde sallanan kâğıt tekneler', ['#172e38','#e0f3f3','#f0dfb3','#78c4ca','#39616e','#ffffff']),
  theme('fireflies', 'Fireflies', 'Sakin doğa', 'Çimenlerin üstünde yanıp sönen ateş böcekleri', ['#14241c','#e6edd6','#d0dc7a','#88b69c','#35543b','#fff7a0']),
  theme('moonlit', 'Moonlit', 'Sakin doğa', 'Ay ışığında kayan gece bulutları', ['#191d36','#e8e7f6','#bcb9f2','#7e9dc4','#3a4165','#fff0c9']),
  theme('sakura-rain', 'Sakura Rain', 'Sakin doğa', 'Kiraz dallarından dökülen yapraklar', ['#2b1f2b','#f8e6ef','#f4accb','#cbacde','#674359','#fff0f4']),
  theme('bamboo-mist', 'Bamboo Mist', 'Sakin doğa', 'Bambu gövdeleri arasında gezinen sis', ['#172923','#e1efe4','#a5c98b','#a0c9ba','#3e5e4c','#deebbd']),
  theme('autumn-creek', 'Autumn Creek', 'Sakin doğa', 'Sonbahar yaprakları taşıyan dere', ['#2b231b','#f3e7cf','#e4a15e','#b8bb7b','#68523b','#ffe0a0']),
  theme('snow-cabin', 'Snow Cabin', 'Sakin doğa', 'Kar yağarken bacası tüten dağ evi', ['#1b2634','#e7eff7','#a9c8e7','#f4bd80','#435970','#ffffff']),
  theme('aurora', 'Aurora', 'Uzay', 'Gökyüzünde kıvrılan kutup ışığı perdeleri', ['#101f2a','#dbedf2','#76d8af','#b8a0e8','#2b5260','#c8f8e4']),
  theme('saturn-rings', 'Saturn Rings', 'Uzay', 'Satürn etrafında dönen halka parçacıkları', ['#242131','#eee8f5','#d9bd85','#b9a1d6','#5a4d6e','#ffebc4']),
  theme('meteor-shower', 'Meteor Shower', 'Uzay', 'Yıldızların arasından geçen meteorlar', ['#141d30','#e0e9fa','#94c5f8','#c5b1e5','#33496c','#fff3cb']),
  theme('nebula', 'Nebula', 'Uzay', 'Zamanla şekil değiştiren kozmik gaz bulutları', ['#251c33','#efdef8','#d5a3e8','#87bddc','#634573','#ffe0f6']),
  theme('lunar-horizon', 'Lunar Horizon', 'Uzay', 'Kraterli ufukta yükselen uzak yıldız', ['#232735','#e6e8ed','#c4cadd','#90afcf','#4f576f','#f7e7b1']),
  theme('solar-flare', 'Solar Flare', 'Uzay', 'Güneş yüzeyinden yükselen plazma kemerleri', ['#301c19','#f9e1d3','#f7b16e','#e68168','#78452f','#fff0ae']),
  theme('neon-tokyo', 'Neon Tokyo', 'Şehir ve fantastik', 'Yağmurlu sokaklarda titreyen neonlar', ['#201e31','#eae3f6','#eb9dcc','#86cfe0','#53496b','#ffe5a0']),
  theme('matrix-rain', 'Matrix Rain', 'Şehir ve fantastik', 'Sütunlar boyunca akan karakterler', ['#102219','#d7f5df','#89d99d','#b9e67e','#2c6541','#e4ffbd']),
  theme('synthwave-road', 'Synthwave Road', 'Şehir ve fantastik', 'Güneşin altında akan perspektif yol', ['#2c1c35','#f3e1f4','#f0a0ca','#8bb8ed','#69416c','#ffd3a5']),
  theme('clockwork-garden', 'Clockwork Garden', 'Şehir ve fantastik', 'Yapraklar arasında dönen pirinç dişliler', ['#24291e','#ecebd5','#d2bd7d','#9ecb9a','#576044','#fff1af']),
  theme('crystal-cave', 'Crystal Cave', 'Şehir ve fantastik', 'Kristallerde dolaşan ışık kırılmaları', ['#20243b','#e6e8ff','#bca9fa','#91d8e2','#4c4d7a','#faf0ff']),
  theme('lava-forge', 'Lava Forge', 'Şehir ve fantastik', 'Taşların arasından akan lav ve kıvılcımlar', ['#2d201d','#f1e2d8','#eda073','#d9bd79','#715043','#ffe1a2']),
  theme('whale-song', 'Whale Song', 'Okyanusun derinlikleri', 'Dev balinalar, ışık huzmeleri ve yükselen köpükler', ['#071c2b','#def0f9','#7cb8db','#64d8cb','#234b61','#e0fbff']),
  theme('manta-ballet', 'Manta Ballet', 'Okyanusun derinlikleri', 'Dalgalanan geniş kanatlarıyla süzülen vatozlar', ['#081f2d','#dcecf5','#9ed7e5','#64a7de','#294e69','#daf9fa']),
  theme('seahorse-reef', 'Seahorse Reef', 'Okyanusun derinlikleri', 'Kıvrık kuyruklu denizatları ve salınan yosunlar', ['#112a2a','#e3f4e7','#f0bd73','#75c8ac','#356357','#fff0c9']),
  theme('octopus-den', 'Octopus Den', 'Okyanusun derinlikleri', 'Kıvrılan sekiz kol ve mağara içinde ışıklı planktonlar', ['#211932','#f0e5fc','#d7a1ea','#84bfdc','#51436e','#ffe1fa']),
  theme('coral-garden', 'Coral Garden', 'Okyanusun derinlikleri', 'Dallanan mercan ormanı ve rengârenk balık sürüleri', ['#092932','#e1f3ee','#f0a49b','#8ad4bd','#2c5d6b','#ffdfb5']),
  theme('submarine-voyage', 'Submarine Voyage', 'Okyanusun derinlikleri', 'Dönen pervane, aydınlık lombozlar ve kabarcık izi', ['#102635','#ecf1df','#e4c77c','#84c4d1','#3a596a','#fff3b2']),
  theme('dragon-flight', 'Dragon Flight', 'Gökyüzü masalları', 'Gökyüzünde kanat çırpan dev ejderha ve dağ siluetleri', ['#211b31','#ece4f6','#b7a0e2','#7fbaa8','#4c405e','#f5d5a1']),
  theme('phoenix-rise', 'Phoenix Rise', 'Gökyüzü masalları', 'Alev kanatlı anka, akan kuyruk tüyleri ve kıvılcımlar', ['#291b25','#f9e6dc','#eea176','#d28ea8','#6b3d43','#fff1ab']),
  theme('butterfly-meadow', 'Butterfly Meadow', 'Gökyüzü masalları', 'Kanat çırpan kelebekler, çiçekler ve uçuşan polenler', ['#1d2630','#f3eaf4','#dca4df','#a0d8b2','#4d5964','#fff1b8']),
  theme('floating-islands', 'Floating Islands', 'Gökyüzü masalları', 'Havada süzülen adalar ve aşağı dökülen şelaleler', ['#172638','#e5f2ff','#a5d3c0','#aebde9','#435b73','#f5dfb2']),
  theme('sky-lanterns', 'Sky Lanterns', 'Gökyüzü masalları', 'Yıldızlı gecede yükselen büyük kâğıt fenerler', ['#281e2e','#f7e7ed','#f0ba80','#c99dca','#62465d','#fff0b4']),
  theme('thunderstorm', 'Thunderstorm', 'Gökyüzü masalları', 'Koyu fırtına bulutları, sağanak ve çatallanan şimşekler', ['#172332','#e6effb','#b9c8f0','#7d9ebc','#3e5169','#f2ecff']),
  theme('mushroom-grove', 'Mushroom Grove', 'Saklı dünyalar', 'Işıklı dev mantarlar ve aralarında dolaşan sporlar', ['#16241f','#e7f3df','#b3d792','#d5b1e1','#3c5b4b','#eafdb4']),
  theme('enchanted-library', 'Enchanted Library', 'Saklı dünyalar', 'Uçuşan kitaplar, dev raflar ve dönen sihirli harfler', ['#28212d','#f5e9dc','#d6b485','#b5a0da','#63505c','#ffe7b4']),
  theme('teahouse-rain', 'Teahouse Rain', 'Saklı dünyalar', 'Çay fincanından yükselen buhar ve pencere ardında yağmur', ['#232b29','#f1ecdc','#c9bc91','#9ec4bd','#52635a','#ffe9bb']),
  theme('desert-caravan', 'Desert Caravan', 'Saklı dünyalar', 'Hilal altında ilerleyen develer ve kayan kum tepeleri', ['#292439','#f6ebda','#e1bb86','#a9a3d6','#655675','#ffe6b2']),
  theme('bonsai-zen', 'Bonsai Zen', 'Saklı dünyalar', 'Budanmış bonsai, taranmış kum ve yavaş düşen yapraklar', ['#202b25','#e6efde','#a9c38d','#d4bd8b','#53684f','#edf5c6']),
  theme('midnight-express', 'Midnight Express', 'Saklı dünyalar', 'Gece treninin aydınlık vagonları ve kayan yıldızlı manzara', ['#1c2432','#e9eef7','#d2b890','#91b4d9','#42556e','#ffe9b4']),
  theme('black-hole', 'Black Hole', 'Kozmik oyun alanı', 'Kara deliğin çevresinde akan eğik birikim diski', ['#151a2c','#e9e8fa','#e4ad80','#b39de3','#3f4569','#fff0ce']),
  theme('orbital-station', 'Orbital Station', 'Kozmik oyun alanı', 'Dönen uzay istasyonu, güneş panelleri ve yörünge izleri', ['#122536','#e5f0fc','#a5d5e6','#dbb98b','#3c5a72','#eff9ff']),
  theme('rocket-launch', 'Rocket Launch', 'Kozmik oyun alanı', 'Yükselen roket, motor alevi ve genişleyen duman bulutu', ['#221f33','#f0e7fb','#d2b6ed','#f0b07d','#54466f','#ffedb0']),
  theme('alien-orchard', 'Alien Orchard', 'Kozmik oyun alanı', 'Yabancı gezegende salınan ışıklı ağaçlar ve iki ay', ['#172b2d','#e3f5ed','#8fdbc1','#c5a1e4','#3d6266','#f3ebaf']),
  theme('retro-arcade', 'Retro Arcade', 'Kozmik oyun alanı', 'Hareket eden uzaylı filosu, piksel gemisi ve lazerler', ['#201c35','#f4e9ff','#bda0f0','#88d7d1','#4c426c','#ffe7a3']),
  theme('hologram-city', 'Hologram City', 'Kozmik oyun alanı', 'Yüzen holografik kuleler ve hareket eden veri köprüleri', ['#142736','#e4f4fa','#7ed4dc','#c8a9eb','#3b586e','#e4fcff']),
];
export const findTheme = (value: string): Theme | undefined => {
  const prefix = 'custom:living-themes:';
  return value.startsWith(prefix) ? THEMES.find(t => t.id === value.slice(prefix.length)) : undefined;
};
export const themeValue = (id: string): string => `custom:living-themes:${id}`;
export function themeJSON(t: Theme) {
  const p = t.palette;
  return { name: `Living · ${t.name}`, base: 'dark', overrides: {
    claude: p.accent, claudeShimmer: p.glow, text: p.text, inverseText: p.bg,
    inactive: p.secondary, inactiveShimmer: p.text, subtle: p.muted,
    suggestion: p.secondary, permission: p.glow, permissionShimmer: p.text,
    promptBorder: p.accent, promptBorderShimmer: p.glow, planMode: p.secondary,
    autoAccept: '#9dcca9', success: '#9dcca9', error: '#f0a09e', warning: '#e5ca8e',
    diffAdded: '#203d2d', diffRemoved: '#492a30', diffAddedWord: '#315d40', diffRemovedWord: '#6c3c46',
    userMessageBackground: p.bg, composerSidebarBackground: p.bg, selectionBg: p.muted,
  }};
}
