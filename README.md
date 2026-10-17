# 🚕 YolNet — Taksi Rota, Canlı Trafik & Ücret Hakemi (Yolcu + Şoför)

**YolNet**, Türkiye'deki taksi yolcuları ve taksi şoförleri için geliştirilmiş; **Canlı Trafik & Karayolu Rota Motoru**, **Köprü/Tünel/Otoyol Gişe Hakemi**, **Taksi Segment Kıyaslama (Sarı, Turkuaz, VIP, XL)**, **Grup Hesap Bölüştürme**, **Fiyat & Güzergah Denetçisi** ve **Şoför Sefer Net Kâr / Vardiya Kasası** özelliklerini tek ekranda sunan modern bir web uygulamasıdır (PWA).

## ✨ Öne Çıkan Özellikler

1. **Çift Katmanlı Hibrit Rota & Trafik Motoru (%80 Dinamik Kota Koruması):**
   - Sabit 5 kullanım limiti yoktur. Bağlı API motorunun istek limitinin **%80'ine** gelene kadar tüm kullanıcılar birincil **Canlı Trafik & Telemetri Motorunu** kesintisiz kullanır.
   - İstek kotası **%80'e** ulaştığında kalan %20'lik canlı trafik kotası **YolNet PRO** üyelerine ayrılır; standart kullanıcılar ise hiçbir kesinti yaşamadan **Ücretsiz Sınırsız Muadil Rota & Saatlik Trafik Motoruna** aktarılır ve ekranda veri kaynağı şeffafça belirtilir.
2. **Çift Modlu Deneyim (👤 Yolcu Modu & 🚕 Şoför Modu):**
   - **Yolcu Modu:** Sarı / Turkuaz (+%15) / XL (+%30) / Siyah VIP (+%100) fiyat kıyaslaması, 1–4 kişi hesap bölüştürme, özel araç yakıt maliyeti kıyaslaması, *"Trafik sakinleşince çıkarsam ne kadar kar ederim?"* zamanlama asistanı ve **ALO 153 / Tüketici Fiyat Denetçisi**.
   - **Şoför Modu:** LPG / Dizel / Benzin / Elektrik tüketimine ve boş dönüş riskine göre **Sefer Net Kâr Analizi**, **Günlük Vardiya & Ciro Kasası** ve yabancı turistler için tek tuşla açılan **Tam Ekran Müşteri Bilgi Kartı (₺ / € / $)**.
3. **20 Büyükşehir & Turizm Bölgesi + Anlık UKOME Tarife Kalibrasyonu:**
   - İstanbul, Ankara, İzmir, Antalya, Bursa, Muğla (Bodrum/Marmaris/Fethiye), Kocaeli, Adana, Mersin, Gaziantep, Konya, Eskişehir, Samsun, Kayseri, Trabzon, Aydın, Tekirdağ, Sakarya, Diyarbakır ve Denizli güncel tarifeleri ve popüler noktaları dahildir.

## 🚀 Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açarak kullanabilirsiniz.
