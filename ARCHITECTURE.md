# Teknik Mimari (ARCHITECTURE.md)

> **Proje Adı:** Kasif  
> **Mimari Model:** Offline-First, Local-Storage Centric, Modular Monolith

---

## 1. Mimari Genel Bakış

Kasif uygulaması, internet bağlantısına ihtiyaç duymadan tam performans çalışabilen **Offline-First** mimari prensibiyle tasarlanmıştır. Tüm statik içerikler uygulama içinde gömülü veritabanı ile gelirken, kullanıcı etkileşimleri (notlar, favoriler, geçmiş) yerel SQLite veritabanında saklanır.

---

## 2. Dizin Yapısı ve Modüler Tasarım

Proje dizin yapısı modüler ve ölçeklenebilir bir yapıda kurgulanmıştır:

```text
Kasif/
├── app/                  # Expo Router ekranları ve dosya tabanlı rota yapısı
│   ├── (tabs)/           # Alt sekmeler (Anasayfa, Kütüphane, Arama, Favoriler, Ayarlar)
│   ├── content/          # İçerik detay ekranları
│   └── _layout.tsx       # Kök yönlendirici ve sağlayıcılar
├── assets/               # Görseller, ikonlar ve fontlar
├── components/           # Yeniden kullanılabilir UI bileşenleri (Button, Card, Header vb.)
├── constants/            # Renkler, tema sabitleri ve uygulama ayarları
├── database/             # SQLite veritabanı şeması, migration ve FTS5 sorguları
├── store/                # Zustand durum yönetimi store'ları
├── types/                # TypeScript tip tanımları
└── utils/                # Yardımcı fonksiyonlar ve servisler
```

---

## 3. Veri Akışı ve Veritabanı Mimarisi

- **SQLite Veritabanı:** Uygulama ilk açılışında yerel SQLite veritabanı (`kasif.db`) başlatılır ve önceden yüklenmiş içerik tabloları oluşturulur.
- **FTS5 Entegrasyonu:** Büyük metin arşivlerinde (hadisler ve makaleler) milisaniyeler içinde arama yapmak amacıyla SQLite FTS5 modülü kullanılır.
- **Zustand Store:** UI durumu, aktif tema ve geçici filtreleme parametreleri Zustand ile yönetilirken kalıcı veriler SQLite üzerinden senkronize edilir.

---

## 4. Dağıtım ve Yayınlama Mimarisi

- **Android:** Test aşamaları için doğrudan **APK** üretimi; Google Play Store için **AAB** (Android App Bundle) formatı.
- **iOS:** TestFlight ve App Store dağıtımları için EAS Build entegrasyonu.
- **Web:** Expo Web desteği ile tarayıcı üzerinden erişilebilirlik.
