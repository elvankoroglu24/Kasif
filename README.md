# Kasif - İslami İçerik ve Araştırma Platformu

> **Proje Durumu:** Planning / Documentation Completed  
> **Sürüm:** v0.1.0-alpha  
> **Mimari Yaklaşım:** Offline-First, Yerel Veritabanı Odaklı, Yapay Zeka Araçlarından Bağımsız

---

## Genel Bakış

**Kasif**, kullanıcıların İslami içeriklere (hadis, zikir, dini metinler ve blog yazıları) hızlı, güvenilir ve tamamen çevrimdışı (offline-first) bir yapıda erişmesini sağlayan modern bir mobil ve web uygulamasıdır. Gizlilik ve veri sahipliğini ön planda tutan mimarisi sayesinde tüm kullanıcı verileri (favoriler, notlar, okuma geçmişi ve kişiselleştirilmiş ayarlar) doğrudan cihaz üzerinde güvenli bir şekilde saklanır.

---

## Temel Teknik Kararlar ve Mimari

Proje, güncel teknolojiler ve kararlı sürüm politikaları benimsenerek tasarlanmıştır:

- **Çekirdek Çerçeve:** React Native ve Expo (Güncel kararlı SDK sürümü).
- **Dil Desteği:** TypeScript (Strict Mode).
- **Yönlendirme:** Expo Router tabanlı dosya bazlı navigasyon.
- **Veritabanı:** Expo SQLite ve yüksek performanslı arama için SQLite FTS5 (Full-Text Search) entegrasyonu.
- **Durum Yönetimi (State Management):** Zustand.
- **Derleme ve Dağıtım:** EAS Build (Android için APK / Google Play için AAB, iOS için TestFlight/App Store, ayrıca Web desteği).
- **Platform Önceliği:** Android (Birincil), iOS (İkincil), Web (Üçüncü).

---

## Dokümantasyon

Projenin teknik detaylarına ve geliştirme süreçlerine aşağıdaki dokümanlardan ulaşabilirsiniz:

1. [PROJECT_SPEC.md](./PROJECT_SPEC.md) - Proje Spesifikasyonu ve Kapsam Tanımı
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Teknik Mimari ve Veri Akış Şeması
3. [TODO.md](./TODO.md) - Görev Listesi ve Geliştirme Planı
4. [CHANGELOG.md](./CHANGELOG.md) - Sürüm Geçmişi ve Değişiklik Günlüğü

---

## Lisans

Bu proje gizlilik ve açık kaynak standartlarına uygun olarak geliştirilmektedir. Tüm hakları saklıdır.
