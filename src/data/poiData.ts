/**
 * YolNet Lite - Şehirlere Özel Önemli Noktalar (Points of Interest - POI)
 * Havalimanı, Hayvanat Bahçesi, Şehir Hastanesi, Otogar, AVM ve Üniversiteler
 */

import { Coordinates } from '@/types/taxi';

export type PoiCategory = 'airport' | 'hospital' | 'zoo' | 'terminal' | 'mall' | 'university' | 'center';

export interface PoiItem {
  id: string;
  label: string;
  shortName: string;
  category: PoiCategory;
  coords: Coordinates;
  keywords: string[];
}

/**
 * Türkçe karakter uyumlu küçük harfe dönüştürücü
 */
export function toTurkishLower(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/İ/g, 'i');
}

/**
 * Türkçe karakterleri ASCII eşdeğerlerine dönüştürür ve küçük harfe çevirir.
 * "Beşiktaş" -> "besiktas", "Kadıköy" -> "kadikoy", "Şişli" -> "sisli"
 */
export function normalizeTurkish(str: string): string {
  if (!str) return '';
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CITY_POIS: Record<string, PoiItem[]> = {
  // 16 - BURSA
  '16': [
    {
      id: 'bursa-terminal',
      label: 'Bursa Şehirlerarası Otobüs Terminali (Otogar)',
      shortName: 'Bursa Otogar / Terminal',
      category: 'terminal',
      coords: { lat: 40.2642, lng: 29.0558 },
      keywords: ['otogar', 'terminal', 'otobüs', 'ulaşım'],
    },
    {
      id: 'bursa-sehir-hastanesi',
      label: 'Bursa Şehir Hastanesi (Doğanköy)',
      shortName: 'Bursa Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 40.2392, lng: 28.8785 },
      keywords: ['şehir hastanesi', 'hastane', 'doğanköy', 'sağlık'],
    },
    {
      id: 'bursa-hayvanat-bahcesi',
      label: 'Bursa Hayvanat Bahçesi (Soğanlı)',
      shortName: 'Bursa Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 40.2185, lng: 29.0494 },
      keywords: ['hayvanat bahçesi', 'zoo', 'soğanlı', 'botanik park'],
    },
    {
      id: 'bursa-havalimani',
      label: 'Bursa Yenişehir Havalimanı (YEI)',
      shortName: 'Yenişehir Havalimanı',
      category: 'airport',
      coords: { lat: 40.2553, lng: 29.5625 },
      keywords: ['havalimanı', 'havaalanı', 'yenişehir', 'uçak'],
    },
    {
      id: 'bursa-uludag-uni',
      label: 'Bursa Uludağ Üniversitesi (Görükle Kampüsü)',
      shortName: 'Uludağ Üniversitesi',
      category: 'university',
      coords: { lat: 40.2245, lng: 28.8732 },
      keywords: ['üniversite', 'uludağ', 'görükle', 'kampüs'],
    },
    {
      id: 'bursa-korupark',
      label: 'Korupark Alışveriş Merkezi (AVM)',
      shortName: 'Korupark AVM',
      category: 'mall',
      coords: { lat: 40.2458, lng: 28.9702 },
      keywords: ['avm', 'korupark', 'alışveriş', 'emek'],
    },
    {
      id: 'bursa-zafer-plaza',
      label: 'Zafer Plaza AVM (Osmangazi)',
      shortName: 'Zafer Plaza AVM',
      category: 'mall',
      coords: { lat: 40.1868, lng: 29.0594 },
      keywords: ['avm', 'zafer plaza', 'heykel', 'çarşı'],
    },
    {
      id: 'bursa-suryapi-marka',
      label: 'Sur Yapı Marka AVM (Nilüfer)',
      shortName: 'Sur Yapı Marka AVM',
      category: 'mall',
      coords: { lat: 40.2085, lng: 29.0062 },
      keywords: ['avm', 'sur yapı', 'marka avm', 'nilüfer'],
    },
    {
      id: 'bursa-heykel',
      label: 'Heykel / Tarihi Kent Meydanı (Osmangazi)',
      shortName: 'Heykel Kent Meydanı',
      category: 'center',
      coords: { lat: 40.1834, lng: 29.0645 },
      keywords: ['heykel', 'kent meydanı', 'merkez', 'osmangazi'],
    },
    {
      id: 'bursa-teleferik',
      label: 'Bursa Teleferik İstasyonu (Teferrüç)',
      shortName: 'Teleferik İstasyonu',
      category: 'center',
      coords: { lat: 40.1718, lng: 29.0811 },
      keywords: ['teleferik', 'uludağ', 'teferrüç'],
    },
  ],

  // 34 - İSTANBUL
  '34': [
    {
      id: 'ist-iga',
      label: 'İstanbul Havalimanı (İGA - Arnavutköy)',
      shortName: 'İstanbul Havalimanı (İGA)',
      category: 'airport',
      coords: { lat: 41.2753, lng: 28.7519 },
      keywords: ['havalimanı', 'iga', 'arnavutköy', 'uçak'],
    },
    {
      id: 'ist-saw',
      label: 'Sabiha Gökçen Havalimanı (SAW - Pendik)',
      shortName: 'Sabiha Gökçen Havalimanı',
      category: 'airport',
      coords: { lat: 40.8986, lng: 29.3092 },
      keywords: ['sabiha gökçen', 'saw', 'havalimanı', 'pendik'],
    },
    {
      id: 'ist-esenler',
      label: '15 Temmuz Demokrasi Otogarı (Esenler)',
      shortName: 'Esenler Otogarı',
      category: 'terminal',
      coords: { lat: 41.0402, lng: 28.8953 },
      keywords: ['otogar', 'esenler', 'terminal', 'otobüs'],
    },
    {
      id: 'ist-alibeykoy',
      label: 'Alibeyköy Cep Otogarı (Eyüpsultan)',
      shortName: 'Alibeyköy Cep Otogarı',
      category: 'terminal',
      coords: { lat: 41.0856, lng: 28.9486 },
      keywords: ['alibeyköy', 'cep otogarı', 'otobüs'],
    },
    {
      id: 'ist-cam-sakura',
      label: 'Başakşehir Çam ve Sakura Şehir Hastanesi',
      shortName: 'Çam ve Sakura Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 41.1097, lng: 28.7758 },
      keywords: ['şehir hastanesi', 'çam ve sakura', 'başakşehir', 'hastane'],
    },
    {
      id: 'ist-okmeydani-hastane',
      label: 'Prof. Dr. Cemil Taşcıoğlu Şehir Hastanesi (Okmeydanı)',
      shortName: 'Okmeydanı Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 41.0638, lng: 28.9734 },
      keywords: ['okmeydanı', 'şehir hastanesi', 'cemil taşcıoğlu', 'hastane'],
    },
    {
      id: 'ist-faruk-yalcin-zoo',
      label: 'Faruk Yalçın Hayvanat Bahçesi & Botanik Park',
      shortName: 'Faruk Yalçın Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 40.8175, lng: 29.3783 },
      keywords: ['hayvanat bahçesi', 'faruk yalçın', 'darıca', 'zoo'],
    },
    {
      id: 'ist-zorlu',
      label: 'Zorlu Center AVM (Zincirlikuyu / Beşiktaş)',
      shortName: 'Zorlu Center AVM',
      category: 'mall',
      coords: { lat: 41.0664, lng: 29.0172 },
      keywords: ['avm', 'zorlu center', 'zincirlikuyu', 'beşiktaş'],
    },
    {
      id: 'ist-cevahir',
      label: 'Cevahir AVM (Şişli / Mecidiyeköy)',
      shortName: 'Cevahir AVM',
      category: 'mall',
      coords: { lat: 41.0601, lng: 28.9877 },
      keywords: ['avm', 'cevahir', 'şişli', 'mecidiyeköy'],
    },
    {
      id: 'ist-mall-of-ist',
      label: 'Mall of İstanbul AVM (Başakşehir)',
      shortName: 'Mall of İstanbul',
      category: 'mall',
      coords: { lat: 41.0631, lng: 28.8078 },
      keywords: ['avm', 'mall of istanbul', 'başakşehir'],
    },
    {
      id: 'ist-itu',
      label: 'İstanbul Teknik Üniversitesi (İTÜ Ayazağa Kampüsü)',
      shortName: 'İTÜ Ayazağa Kampüsü',
      category: 'university',
      coords: { lat: 41.1054, lng: 29.0238 },
      keywords: ['itü', 'üniversite', 'maslak', 'ayazağa'],
    },
    {
      id: 'ist-boun',
      label: 'Boğaziçi Üniversitesi (Güney Kampüs / Bebek)',
      shortName: 'Boğaziçi Üniversitesi',
      category: 'university',
      coords: { lat: 41.0833, lng: 29.0506 },
      keywords: ['boğaziçi', 'üniversite', 'bebek', 'hisarüstü'],
    },
    {
      id: 'ist-kadikoy',
      label: 'Kadıköy Rıhtım / İskele Meydanı',
      shortName: 'Kadıköy Rıhtım',
      category: 'center',
      coords: { lat: 40.9904, lng: 29.0254 },
      keywords: ['kadıköy', 'rıhtım', 'iskele', 'moda'],
    },
    {
      id: 'ist-taksim',
      label: 'Taksim Meydanı & İstiklal Caddesi',
      shortName: 'Taksim Meydanı',
      category: 'center',
      coords: { lat: 41.0370, lng: 28.9850 },
      keywords: ['taksim', 'meydan', 'istiklal', 'beyoğlu'],
    },
    {
      id: 'ist-besiktas',
      label: 'Beşiktaş Meydanı & İskele / Çarşı',
      shortName: 'Beşiktaş Meydanı',
      category: 'center',
      coords: { lat: 41.0428, lng: 29.0077 },
      keywords: ['beşiktaş', 'çarşı', 'iskele', 'meydan', 'ortaköy', 'akaretler'],
    },
    {
      id: 'ist-uskudar',
      label: 'Üsküdar Meydanı & Marmaray / İskele',
      shortName: 'Üsküdar Meydanı',
      category: 'center',
      coords: { lat: 41.0267, lng: 29.0152 },
      keywords: ['üsküdar', 'marmaray', 'iskele', 'meydan', 'harem'],
    },
    {
      id: 'ist-sisli',
      label: 'Şişli Meydanı & Mecidiyeköy',
      shortName: 'Şişli / Mecidiyeköy',
      category: 'center',
      coords: { lat: 41.0601, lng: 28.9877 },
      keywords: ['şişli', 'mecidiyeköy', 'meydan', 'cevahir'],
    },
    {
      id: 'ist-bakirkoy',
      label: 'Bakırköy Özgürlük Meydanı & İskele',
      shortName: 'Bakırköy Meydanı',
      category: 'center',
      coords: { lat: 40.9782, lng: 28.8741 },
      keywords: ['bakırköy', 'özgürlük meydanı', 'incirli', 'ataköy'],
    },
  ],

  // 06 - ANKARA
  '06': [
    {
      id: 'ank-kizilay',
      label: 'Kızılay Meydanı',
      shortName: 'Kızılay Meydanı',
      category: 'center',
      coords: { lat: 39.9208, lng: 32.8541 },
      keywords: ['kızılay', 'meydan', 'güvenpark', 'çankaya'],
    },
    {
      id: 'ank-bilkent-sehir-hastanesi',
      label: 'Ankara Bilkent Şehir Hastanesi',
      shortName: 'Bilkent Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 39.9062, lng: 32.7588 },
      keywords: ['bilkent', 'şehir hastanesi', 'hastane', 'çankaya', 'ankara bilkent'],
    },
    {
      id: 'ank-genclik-parki',
      label: 'Gençlik Parkı',
      shortName: 'Gençlik Parkı',
      category: 'center',
      coords: { lat: 39.9349, lng: 32.8509 },
      keywords: ['gençlik parkı', 'gençlik park', 'ulus', 'opera', 'altındağ'],
    },
    {
      id: 'ank-esenboga',
      label: 'Esenboğa Havalimanı',
      shortName: 'Esenboğa Havalimanı',
      category: 'airport',
      coords: { lat: 40.1281, lng: 32.9951 },
      keywords: ['havalimanı', 'esenboğa', 'havaalanı', 'uçak'],
    },
    {
      id: 'ank-asti',
      label: 'AŞTİ Otogar',
      shortName: 'AŞTİ Otogar',
      category: 'terminal',
      coords: { lat: 39.9168, lng: 32.8122 },
      keywords: ['aşti', 'otogar', 'terminal', 'otobüs'],
    },
    {
      id: 'ank-gar',
      label: 'Ankara Garı',
      shortName: 'Ankara Garı',
      category: 'terminal',
      coords: { lat: 39.9358, lng: 32.8442 },
      keywords: ['ankara garı', 'tren garı', 'yht', 'gar', 'tandoğan'],
    },
    {
      id: 'ank-etlik-sehir-hastanesi',
      label: 'Etlik Şehir Hastanesi',
      shortName: 'Etlik Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 39.9723, lng: 32.8258 },
      keywords: ['etlik', 'şehir hastanesi', 'hastane', 'sağlık'],
    },
    {
      id: 'ank-tunali',
      label: 'Tunalı Hilmi / Kuğulu Park',
      shortName: 'Tunalı Hilmi',
      category: 'center',
      coords: { lat: 39.9032, lng: 32.8597 },
      keywords: ['tunalı', 'kuğulu park', 'kavaklıdere', 'çankaya'],
    },
    {
      id: 'ank-ankamall',
      label: 'Ankamall AVM',
      shortName: 'Ankamall AVM',
      category: 'mall',
      coords: { lat: 39.9506, lng: 32.8311 },
      keywords: ['avm', 'ankamall', 'aköprü'],
    },
    {
      id: 'ank-armada',
      label: 'Armada AVM',
      shortName: 'Armada AVM',
      category: 'mall',
      coords: { lat: 39.9133, lng: 32.8083 },
      keywords: ['avm', 'armada', 'söğütözü'],
    },
    {
      id: 'ank-odtu',
      label: 'ODTÜ Kampüsü',
      shortName: 'ODTÜ Kampüsü',
      category: 'university',
      coords: { lat: 39.8914, lng: 32.7846 },
      keywords: ['odtü', 'üniversite', 'kampüs'],
    },
    {
      id: 'ank-hacettepe',
      label: 'Hacettepe Beytepe Kampüsü',
      shortName: 'Hacettepe Kampüsü',
      category: 'university',
      coords: { lat: 39.8667, lng: 32.7364 },
      keywords: ['hacettepe', 'üniversite', 'beytepe'],
    },
    {
      id: 'ank-aoc-zoo',
      label: 'AOÇ Doğal Yaşam Parkı',
      shortName: 'AOÇ Parkı',
      category: 'zoo',
      coords: { lat: 39.9442, lng: 32.7933 },
      keywords: ['hayvanat bahçesi', 'aoç', 'doğal yaşam', 'çiftlik'],
    },
  ],

  // 35 - İZMİR
  '35': [
    {
      id: 'izm-adnan-menderes',
      label: 'İzmir Adnan Menderes Havalimanı (ADB)',
      shortName: 'Adnan Menderes Havalimanı',
      category: 'airport',
      coords: { lat: 38.2924, lng: 27.1570 },
      keywords: ['havalimanı', 'adnan menderes', 'gaziemir', 'uçak'],
    },
    {
      id: 'izm-otogar',
      label: 'İzmir Şehirlerarası Otobüs Terminali (Bornova)',
      shortName: 'İzmir Otogarı',
      category: 'terminal',
      coords: { lat: 38.4328, lng: 27.2144 },
      keywords: ['otogar', 'terminal', 'bornova', 'otobüs'],
    },
    {
      id: 'izm-bayrakli-sehir-hastanesi',
      label: 'Bayraklı Şehir Hastanesi',
      shortName: 'Bayraklı Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 38.4839, lng: 27.1706 },
      keywords: ['şehir hastanesi', 'bayraklı', 'hastane', 'sağlık'],
    },
    {
      id: 'izm-dogal-yasam-zoo',
      label: 'İzmir Doğal Yaşam Parkı (Sasalı Hayvanat Bahçesi)',
      shortName: 'Sasalı Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 38.4962, lng: 26.9531 },
      keywords: ['hayvanat bahçesi', 'doğal yaşam', 'sasalı', 'çiğli', 'zoo'],
    },
    {
      id: 'izm-ege-uni',
      label: 'Ege Üniversitesi Kampüsü (Bornova)',
      shortName: 'Ege Üniversitesi',
      category: 'university',
      coords: { lat: 38.4554, lng: 27.2272 },
      keywords: ['ege üniversitesi', 'bornova', 'kampüs'],
    },
    {
      id: 'izm-istinyepark',
      label: 'İstinyePark İzmir AVM (Balçova)',
      shortName: 'İstinyePark İzmir',
      category: 'mall',
      coords: { lat: 38.3972, lng: 27.0583 },
      keywords: ['avm', 'istinye park', 'balçova'],
    },
    {
      id: 'izm-konak',
      label: 'Konak Meydanı & Tarihi Saat Kulesi',
      shortName: 'Konak Saat Kulesi',
      category: 'center',
      coords: { lat: 38.4189, lng: 27.1287 },
      keywords: ['konak', 'saat kulesi', 'meydan', 'alsancak'],
    },
  ],

  // 07 - ANTALYA
  '07': [
    {
      id: 'ant-ayt',
      label: 'Antalya Havalimanı (AYT - Muratpaşa)',
      shortName: 'Antalya Havalimanı (AYT)',
      category: 'airport',
      coords: { lat: 36.8987, lng: 30.8005 },
      keywords: ['havalimanı', 'ayt', 'muratpaşa', 'uçak'],
    },
    {
      id: 'ant-otogar',
      label: 'Antalya Şehirlerarası Otobüs Terminali (Kepez)',
      shortName: 'Antalya Otogarı',
      category: 'terminal',
      coords: { lat: 36.9231, lng: 30.6653 },
      keywords: ['otogar', 'kepez', 'terminal', 'otobüs'],
    },
    {
      id: 'ant-sehir-hastanesi',
      label: 'Antalya Şehir Hastanesi (Kepezaltı)',
      shortName: 'Antalya Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 36.9631, lng: 30.6489 },
      keywords: ['şehir hastanesi', 'antalya', 'hastane', 'kepez'],
    },
    {
      id: 'ant-hayvanat-bahcesi',
      label: 'Antalya Hayvanat Bahçesi (Kepez Mesire Alanı)',
      shortName: 'Antalya Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 36.9644, lng: 30.6272 },
      keywords: ['hayvanat bahçesi', 'kepezaltı', 'zoo', 'doğa'],
    },
    {
      id: 'ant-akdeniz-uni',
      label: 'Akdeniz Üniversitesi Kampüsü (Konyaaltı)',
      shortName: 'Akdeniz Üniversitesi',
      category: 'university',
      coords: { lat: 36.8925, lng: 30.6517 },
      keywords: ['akdeniz üniversitesi', 'üniversite', 'konyaaltı'],
    },
    {
      id: 'ant-terracity',
      label: 'TerraCity AVM (Lara / Muratpaşa)',
      shortName: 'TerraCity AVM',
      category: 'mall',
      coords: { lat: 36.8525, lng: 30.7583 },
      keywords: ['avm', 'terracity', 'lara'],
    },
    {
      id: 'ant-kaleici',
      label: 'Kaleiçi & Tarihi Yat Limanı (Muratpaşa)',
      shortName: 'Kaleiçi Yat Limanı',
      category: 'center',
      coords: { lat: 36.8847, lng: 30.7044 },
      keywords: ['kaleiçi', 'yat limanı', 'merkez'],
    },
  ],

  // 10 - BALIKESİR
  '10': [
    {
      id: 'bal-otogar',
      label: 'Balıkesir Şehirlerarası Otobüs Terminali',
      shortName: 'Balıkesir Otogarı',
      category: 'terminal',
      coords: { lat: 39.6468, lng: 27.8682 },
      keywords: ['otogar', 'terminal', 'otobüs'],
    },
    {
      id: 'bal-sehir-hastanesi',
      label: 'Balıkesir Atatürk Şehir Hastanesi',
      shortName: 'Atatürk Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 39.6139, lng: 27.9172 },
      keywords: ['şehir hastanesi', 'atatürk hastanesi', 'sağlık'],
    },
    {
      id: 'bal-edremit-havalimani',
      label: 'Balıkesir Koca Seyit Havalimanı (EDO - Edremit)',
      shortName: 'Koca Seyit Havalimanı',
      category: 'airport',
      coords: { lat: 39.5552, lng: 27.0142 },
      keywords: ['havalimanı', 'koca seyit', 'edremit', 'körfez'],
    },
    {
      id: 'bal-bandirma-iskele',
      label: 'Bandırma İDO & Feribot İskelesi',
      shortName: 'Bandırma Feribot İskelesi',
      category: 'terminal',
      coords: { lat: 40.3556, lng: 27.9739 },
      keywords: ['bandırma', 'feribot', 'ido', 'iskele'],
    },
    {
      id: 'bal-uni',
      label: 'Balıkesir Üniversitesi (Çağış Kampüsü)',
      shortName: 'Balıkesir Üniversitesi',
      category: 'university',
      coords: { lat: 39.5297, lng: 28.0069 },
      keywords: ['üniversite', 'çağış', 'kampüs'],
    },
    {
      id: 'bal-avlu',
      label: 'Avlu Balıkesir Yaşam Merkezi & AVM',
      shortName: 'Avlu Balıkesir AVM',
      category: 'mall',
      coords: { lat: 39.6514, lng: 27.8767 },
      keywords: ['avm', 'avlu balıkesir', 'çarşı'],
    },
    {
      id: 'bal-merkez',
      label: 'Balıkesir Saat Kulesi / Ali Hikmet Paşa Meydanı',
      shortName: 'Saat Kulesi Meydanı',
      category: 'center',
      coords: { lat: 39.6484, lng: 27.8826 },
      keywords: ['merkez', 'saat kulesi', 'meydan'],
    },
  ],

  // 17 - ÇANAKKALE
  '17': [
    {
      id: 'can-ilce-merkezi',
      label: 'Çan İlçe Merkezi / Hükümet Meydanı',
      shortName: 'Çan İlçe Merkezi',
      category: 'center',
      coords: { lat: 40.0337, lng: 27.0503 },
      keywords: ['çan', 'merkez', 'meydan', 'belediye'],
    },
    {
      id: 'can-otogar',
      label: 'Çan Şehirlerarası Otobüs Terminali (Otogar)',
      shortName: 'Çan Otogarı',
      category: 'terminal',
      coords: { lat: 40.0303, lng: 27.0569 },
      keywords: ['çan otogar', 'otogar', 'terminal'],
    },
    {
      id: 'canakkale-otogar',
      label: 'Çanakkale Şehirlerarası Otobüs Terminali',
      shortName: 'Çanakkale Otogarı',
      category: 'terminal',
      coords: { lat: 40.1389, lng: 26.4403 },
      keywords: ['çanakkale otogar', 'terminal'],
    },
    {
      id: 'canakkale-hastane',
      label: 'Mehmet Akif Ersoy Devlet Hastanesi',
      shortName: 'Çanakkale Devlet Hastanesi',
      category: 'hospital',
      coords: { lat: 40.1258, lng: 26.4447 },
      keywords: ['hastane', 'devlet hastanesi', 'sağlık'],
    },
    {
      id: 'canakkale-havalimani',
      label: 'Çanakkale Havalimanı (CKZ)',
      shortName: 'Çanakkale Havalimanı',
      category: 'airport',
      coords: { lat: 40.1378, lng: 26.4267 },
      keywords: ['havalimanı', 'uçak'],
    },
    {
      id: 'canakkale-comu',
      label: 'Çanakkale Onsekiz Mart Üniversitesi (Terzioğlu Kampüsü)',
      shortName: 'ÇOMÜ Terzioğlu Kampüsü',
      category: 'university',
      coords: { lat: 40.1133, lng: 26.4172 },
      keywords: ['üniversite', 'çomü', 'terzioğlu'],
    },
    {
      id: 'canakkale-17-burda',
      label: '17 Burda Alışveriş Merkezi (AVM)',
      shortName: '17 Burda AVM',
      category: 'mall',
      coords: { lat: 40.1311, lng: 26.4258 },
      keywords: ['avm', '17 burda'],
    },
    {
      id: 'canakkale-iskele',
      label: 'Çanakkale Feribot İskelesi & Kordon Boyu',
      shortName: 'Kordon Feribot İskelesi',
      category: 'center',
      coords: { lat: 40.1553, lng: 26.4142 },
      keywords: ['iskele', 'kordon', 'feribot', 'gestaş'],
    },
  ],

  // 41 - KOCAELİ
  '41': [
    {
      id: 'koc-sehir-hastanesi',
      label: 'Kocaeli Şehir Hastanesi (İzmit)',
      shortName: 'Kocaeli Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 40.7925, lng: 29.9678 },
      keywords: ['şehir hastanesi', 'kocaeli', 'izmit', 'hastane'],
    },
    {
      id: 'koc-otogar',
      label: 'İzmit Şehirlerarası Otobüs Terminali',
      shortName: 'İzmit Otogarı',
      category: 'terminal',
      coords: { lat: 40.7711, lng: 29.9875 },
      keywords: ['otogar', 'izmit', 'terminal'],
    },
    {
      id: 'koc-ormanya-zoo',
      label: 'Ormanya Doğal Yaşam Parkı & Yaban Hayatı',
      shortName: 'Ormanya Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 40.7183, lng: 30.1692 },
      keywords: ['hayvanat bahçesi', 'ormanya', 'kartepe', 'doğal yaşam'],
    },
    {
      id: 'koc-kou',
      label: 'Kocaeli Üniversitesi (Umuttepe Kampüsü)',
      shortName: 'Kocaeli Üniversitesi Umuttepe',
      category: 'university',
      coords: { lat: 40.8222, lng: 29.9231 },
      keywords: ['üniversite', 'umuttepe', 'kampüs'],
    },
    {
      id: 'koc-41-burda',
      label: '41 Burda Alışveriş Merkezi (İzmit)',
      shortName: '41 Burda AVM',
      category: 'mall',
      coords: { lat: 40.7558, lng: 29.9511 },
      keywords: ['avm', '41 burda', 'izmit'],
    },
    {
      id: 'koc-cengiz-topel',
      label: 'Kocaeli Cengiz Topel Havalimanı (KCO)',
      shortName: 'Cengiz Topel Havalimanı',
      category: 'airport',
      coords: { lat: 40.7350, lng: 30.0831 },
      keywords: ['havalimanı', 'cengiz topel'],
    },
  ],

  // 26 - ESKİŞEHİR
  '26': [
    {
      id: 'esk-sehir-hastanesi',
      label: 'Eskişehir Şehir Hastanesi (Odunpazarı)',
      shortName: 'Eskişehir Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 39.7397, lng: 30.5794 },
      keywords: ['şehir hastanesi', 'eskişehir', 'hastane'],
    },
    {
      id: 'esk-otogar',
      label: 'Eskişehir Şehirlerarası Otobüs Terminali',
      shortName: 'Eskişehir Otogarı',
      category: 'terminal',
      coords: { lat: 39.7714, lng: 30.5608 },
      keywords: ['otogar', 'terminal', 'otobüs'],
    },
    {
      id: 'esk-sazova-zoo',
      label: 'Eskişehir Hayvanat Bahçesi (Sazova Bilim Kültür Parkı)',
      shortName: 'Sazova Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 39.7686, lng: 30.4747 },
      keywords: ['hayvanat bahçesi', 'sazova', 'zoo', 'masal şatosu'],
    },
    {
      id: 'esk-anadolu-uni',
      label: 'Anadolu Üniversitesi (Yunus Emre Kampüsü)',
      shortName: 'Anadolu Üniversitesi',
      category: 'university',
      coords: { lat: 39.7928, lng: 30.5011 },
      keywords: ['üniversite', 'anadolu üniversitesi', 'yunus emre'],
    },
    {
      id: 'esk-osmangazi-uni',
      label: 'Eskişehir Osmangazi Üniversitesi (Meşelik Kampüsü)',
      shortName: 'Osmangazi Üniversitesi (ESOGÜ)',
      category: 'university',
      coords: { lat: 39.7503, lng: 30.4856 },
      keywords: ['üniversite', 'osmangazi', 'esogü', 'meşelik'],
    },
    {
      id: 'esk-espark',
      label: 'Espark Alışveriş Merkezi (Tepebaşı)',
      shortName: 'Espark AVM',
      category: 'mall',
      coords: { lat: 39.7825, lng: 30.5103 },
      keywords: ['avm', 'espark', 'tepebaşı'],
    },
  ],

  // 01 - ADANA
  '01': [
    {
      id: 'ada-cukurova-havalimani',
      label: 'Çukurova Uluslararası Havalimanı (COV)',
      shortName: 'Çukurova Havalimanı',
      category: 'airport',
      coords: { lat: 36.9014, lng: 35.0664 },
      keywords: ['havalimanı', 'çukurova', 'havaalanı'],
    },
    {
      id: 'ada-sehir-hastanesi',
      label: 'Adana Şehir Eğitim ve Araştırma Hastanesi',
      shortName: 'Adana Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 37.0428, lng: 35.3456 },
      keywords: ['şehir hastanesi', 'adana', 'hastane'],
    },
    {
      id: 'ada-otogar',
      label: 'Adana Merkez Otogarı (Seyhan)',
      shortName: 'Adana Otogarı',
      category: 'terminal',
      coords: { lat: 36.9897, lng: 35.2658 },
      keywords: ['otogar', 'terminal', 'seyhan'],
    },
    {
      id: 'ada-cukurova-uni',
      label: 'Çukurova Üniversitesi (Balcalı Kampüsü)',
      shortName: 'Çukurova Üniversitesi',
      category: 'university',
      coords: { lat: 37.0569, lng: 35.3581 },
      keywords: ['üniversite', 'çukurova', 'balcalı'],
    },
    {
      id: 'ada-m1',
      label: 'M1 Adana Alışveriş Merkezi',
      shortName: 'M1 Adana AVM',
      category: 'mall',
      coords: { lat: 37.0094, lng: 35.2536 },
      keywords: ['avm', 'm1 adana'],
    },
  ],

  // 42 - KONYA
  '42': [
    {
      id: 'kon-havalimani',
      label: 'Konya Havalimanı (KYA)',
      shortName: 'Konya Havalimanı',
      category: 'airport',
      coords: { lat: 37.9789, lng: 32.5619 },
      keywords: ['havalimanı', 'konya', 'uçak'],
    },
    {
      id: 'kon-sehir-hastanesi',
      label: 'Konya Şehir Hastanesi (Karatay)',
      shortName: 'Konya Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 37.8647, lng: 32.5514 },
      keywords: ['şehir hastanesi', 'karatay', 'hastane'],
    },
    {
      id: 'kon-otogar',
      label: 'Konya Şehirlerarası Otobüs Terminali (Selçuklu)',
      shortName: 'Konya Otogarı',
      category: 'terminal',
      coords: { lat: 37.9497, lng: 32.5089 },
      keywords: ['otogar', 'selçuklu', 'terminal'],
    },
    {
      id: 'kon-karatay-zoo',
      label: 'Karatay Hayvanat Bahçesi & Şehir Parkı',
      shortName: 'Karatay Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 37.8703, lng: 32.5283 },
      keywords: ['hayvanat bahçesi', 'karatay', 'zoo'],
    },
    {
      id: 'kon-selcuk-uni',
      label: 'Selçuk Üniversitesi (Alaeddin Keykubat Kampüsü)',
      shortName: 'Selçuk Üniversitesi',
      category: 'university',
      coords: { lat: 38.0264, lng: 32.5117 },
      keywords: ['üniversite', 'selçuk', 'alaeddin keykubat'],
    },
    {
      id: 'kon-mevlana',
      label: 'Mevlana Meydanı & Müzesi',
      shortName: 'Mevlana Meydanı',
      category: 'center',
      coords: { lat: 37.8708, lng: 32.5050 },
      keywords: ['mevlana', 'müze', 'meydan'],
    },
  ],

  // 27 - GAZİANTEP
  '27': [
    {
      id: 'gaz-havalimani',
      label: 'Gaziantep Havalimanı (GZT)',
      shortName: 'Gaziantep Havalimanı',
      category: 'airport',
      coords: { lat: 36.9486, lng: 37.4786 },
      keywords: ['havalimanı', 'gaziantep', 'uçak'],
    },
    {
      id: 'gaz-sehir-hastanesi',
      label: 'Gaziantep Şehir Hastanesi (Şahinbey)',
      shortName: 'Gaziantep Şehir Hastanesi',
      category: 'hospital',
      coords: { lat: 37.0175, lng: 37.3886 },
      keywords: ['şehir hastanesi', 'şahinbey', 'hastane'],
    },
    {
      id: 'gaz-zoo',
      label: 'Gaziantep Hayvanat Bahçesi (Burç Tabiat Parkı - En Büyük)',
      shortName: 'Gaziantep Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 37.0319, lng: 37.3097 },
      keywords: ['hayvanat bahçesi', 'burç parkı', 'zoo', 'safari'],
    },
    {
      id: 'gaz-otogar',
      label: 'Gaziantep Şehirlerarası Otobüs Terminali',
      shortName: 'Gaziantep Otogarı',
      category: 'terminal',
      coords: { lat: 37.0983, lng: 37.3594 },
      keywords: ['otogar', 'terminal'],
    },
    {
      id: 'gaz-uni',
      label: 'Gaziantep Üniversitesi Kampüsü',
      shortName: 'Gaziantep Üniversitesi',
      category: 'university',
      coords: { lat: 37.0347, lng: 37.3342 },
      keywords: ['üniversite', 'kampüs'],
    },
  ],

  // 55 - SAMSUN
  '55': [
    {
      id: 'sam-carsamba',
      label: 'Samsun Çarşamba Havalimanı (SZF)',
      shortName: 'Çarşamba Havalimanı',
      category: 'airport',
      coords: { lat: 41.2583, lng: 36.5483 },
      keywords: ['havalimanı', 'çarşamba'],
    },
    {
      id: 'sam-otogar',
      label: 'Samsun Şehirlerarası Otobüs Terminali (İlkadım)',
      shortName: 'Samsun Otogarı',
      category: 'terminal',
      coords: { lat: 41.2581, lng: 36.3117 },
      keywords: ['otogar', 'ilkadım', 'terminal'],
    },
    {
      id: 'sam-omu',
      label: 'Ondokuz Mayıs Üniversitesi (Kurupelit Kampüsü)',
      shortName: 'Ondokuz Mayıs Üniversitesi',
      category: 'university',
      coords: { lat: 41.3656, lng: 36.1953 },
      keywords: ['üniversite', 'omü', 'kurupelit'],
    },
    {
      id: 'sam-dogupark-zoo',
      label: 'Samsun Doğupark Hayvanat Bahçesi',
      shortName: 'Doğupark Hayvanat Bahçesi',
      category: 'zoo',
      coords: { lat: 41.2858, lng: 36.3475 },
      keywords: ['hayvanat bahçesi', 'doğupark', 'zoo'],
    },
  ],

  // 61 - TRABZON
  '61': [
    {
      id: 'tra-havalimani',
      label: 'Trabzon Havalimanı (TZX)',
      shortName: 'Trabzon Havalimanı',
      category: 'airport',
      coords: { lat: 40.9953, lng: 39.7897 },
      keywords: ['havalimanı', 'trabzon'],
    },
    {
      id: 'tra-otogar',
      label: 'Trabzon Şehirlerarası Otobüs Terminali (Değirmendere)',
      shortName: 'Trabzon Otogarı',
      category: 'terminal',
      coords: { lat: 40.9989, lng: 39.7564 },
      keywords: ['otogar', 'değirmendere', 'terminal'],
    },
    {
      id: 'tra-ktu',
      label: 'Karadeniz Teknik Üniversitesi (KTÜ Kanuni Kampüsü)',
      shortName: 'KTÜ Kampüsü',
      category: 'university',
      coords: { lat: 40.9961, lng: 39.7739 },
      keywords: ['üniversite', 'ktü', 'kampüs'],
    },
    {
      id: 'tra-meydan',
      label: 'Trabzon Atatürk Alanı / Meydan Parkı',
      shortName: 'Meydan Parkı',
      category: 'center',
      coords: { lat: 41.0064, lng: 39.7289 },
      keywords: ['meydan', 'atatürk alanı', 'merkez'],
    },
  ],
};

/**
 * Verilen plaka kodundaki şehre ait POI listesini döndürür
 */
export function getCityPois(plate: string): PoiItem[] {
  return CITY_POIS[plate] || CITY_POIS['34'] || [];
}

/**
 * Akıllı harf filtreleme & Fuzzy / Typo Toleransı:
 * Girilen harfe/kelimeye göre seçili ildeki popüler noktalardan
 * Türkçe karakter (besiktas -> Beşiktaş, kadikoy -> Kadıköy) ve
 * yazım toleransıyla en uygun noktaları öncelikli listeler.
 */
export function filterPoisByQuery(pois: PoiItem[], query: string): PoiItem[] {
  const clean = toTurkishLower(query.trim());
  const normQuery = normalizeTurkish(query);
  if (!clean && !normQuery) return pois;

  // 1. Öncelik: Etiketi veya kısa adı sorguyla BAŞLAYANLAR (Türkçe veya normalize edilmiş)
  const startsWithList: PoiItem[] = [];
  // 2. Öncelik: Herhangi bir kelimesi sorguyla BAŞLAYANLAR
  const wordStartsWithList: PoiItem[] = [];
  // 3. Öncelik: İçerenler
  const containsList: PoiItem[] = [];
  // 4. Öncelik: Fuzzy / Typo toleransı (Harflerin sıralı varlığı)
  const fuzzyList: PoiItem[] = [];

  for (const item of pois) {
    const rawLabel = toTurkishLower(item.label);
    const rawShort = toTurkishLower(item.shortName);
    const normLabel = normalizeTurkish(item.label);
    const normShort = normalizeTurkish(item.shortName);
    const normKeywords = item.keywords.map(normalizeTurkish).join(' ');
    const allNormText = `${normLabel} ${normShort} ${normKeywords}`;
    const allRawText = `${rawLabel} ${rawShort} ${item.keywords.map(toTurkishLower).join(' ')}`;

    // 1. Başlangıç eşleşmesi
    if (
      rawLabel.startsWith(clean) ||
      rawShort.startsWith(clean) ||
      normLabel.startsWith(normQuery) ||
      normShort.startsWith(normQuery)
    ) {
      startsWithList.push(item);
    } else {
      // 2. Kelime başı eşleşmesi
      const normWords = allNormText.split(/\s+/);
      const rawWords = allRawText.split(/[\s,()/-]+/);
      if (
        normWords.some((w) => w.startsWith(normQuery)) ||
        rawWords.some((w) => w.startsWith(clean))
      ) {
        wordStartsWithList.push(item);
      } else if (allNormText.includes(normQuery) || allRawText.includes(clean)) {
        containsList.push(item);
      } else if (normQuery.length >= 3) {
        // 4. Yazım hatası ve eksik harf toleransı (Subsequence matching)
        let qIdx = 0;
        for (let i = 0; i < allNormText.length && qIdx < normQuery.length; i++) {
          if (allNormText[i] === normQuery[qIdx]) {
            qIdx++;
          }
        }
        if (qIdx === normQuery.length) {
          fuzzyList.push(item);
        }
      }
    }
  }

  return [...startsWithList, ...wordStartsWithList, ...containsList, ...fuzzyList];
}
