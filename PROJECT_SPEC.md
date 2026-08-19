# Proje Spesifikasyonu (PROJECT_SPEC.md)

> **Proje Adı:** Kasif  
> **Aşama:** Planning / Documentation Completed  
> **Kapsam:** İslami İçerik, Hadis, Zikir ve Dini Blog Platformu

---

## 1. Proje Amacı ve Kapsamı

Kasif, kullanıcıların günlük ibadetlerini desteklemek, güvenilir dini içeriklere (hadisler, zikirler, makaleler ve blog yazıları) erişmelerini sağlamak ve kişisel notlar ile favoriler tutmalarına olanak tanımak amacıyla geliştirilen offline-first bir mobil ve web uygulamasıdır.

### 1.1. Kapsam Dışı Bırakılanlar (İlk Sürüm)
- Bulut tabanlı senkronizasyon (Supabase / Firebase ilk sürümde yer almamaktadır).
- Kullanıcı kimlik doğrulama sistemi (Authentication - ilk sürüm tamamen yereldir).
- Yapay zeka destekli içerik üretimi veya sohbet botu entegrasyonları (Uygulama AI araçlarından tamamen bağımsızdır).

---

## 2. Teknik Altyapı ve Teknoloji Yığını

| Bileşen | Seçilen Teknoloji / Araç | Açıklama |
| :--- | :--- | :--- |
| **Framework** | React Native / Expo | Expo'nun güncel kararlı SDK sürümü |
| **Dil** | TypeScript | Strict mode aktif, tip güvenliği |
| **Navigasyon** | Expo Router | Dosya tabanlı modern yönlendirme |
| **Veritabanı** | Expo SQLite + FTS5 | Yerel veri saklama ve tam metin arama |
| **Durum Yönetimi** | Zustand | Hafif, hızlı ve esnek state yönetimi |
| **Derleme aracı** | EAS Build | Android (APK/AAB) ve iOS dağıtımları |
| **Test ve Kalite** | Jest / TypeScript Compiler | Kod kalitesi ve birim testler |

---

## 3. Fonksiyonel Gereksinimler

1. **Ana Sayfa / Keşfet:** Günün hadisi, öne çıkan zikirler ve güncel blog yazıları.
2. **Kütüphane / İçerik Modülü:** Kategorize edilmiş İslami içerikler ve detay sayfaları.
3. **Arama ve Filtreleme:** SQLite FTS5 destekli hızlı ve kelime bazlı arama mekanizması.
4. **Kişiselleştirme (Favoriler ve Notlar):** Kullanıcının beğendiği içerikleri favorilere eklemesi ve özel notlar alması.
5. **Okuma Geçmişi:** Kullanıcının incelediği içeriklerin yerel olarak kaydedilmesi.
6. **Ayarlar:** Tema seçimi (Koyu/Açık mod), bildirim tercihleri ve veri yedekleme/sıfırlama.
