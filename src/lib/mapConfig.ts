/**
 * YolNet Lite - Harita ve Şehir Koordinatları Konfigürasyonu
 * Türkiye İl Merkez Koordinatları (CITY_CENTERS) ve Bounding Box Sınırları
 */

import { Coordinates } from '@/types/taxi';

// Türkiye İl Merkez Koordinatları (CITY_CENTERS)
export const CITY_CENTERS: Record<string, Coordinates> = {
  '34': { lat: 41.0082, lng: 28.9784 }, // İstanbul
  '06': { lat: 39.9334, lng: 32.8597 }, // Ankara
  '35': { lat: 38.4192, lng: 27.1287 }, // İzmir
  '16': { lat: 40.1885, lng: 29.0610 }, // Bursa (Heykel / Osmangazi)
  '07': { lat: 36.8969, lng: 30.7133 }, // Antalya
  '41': { lat: 40.7654, lng: 29.9408 }, // Kocaeli (İzmit)
  '01': { lat: 37.0000, lng: 35.3213 }, // Adana
  '26': { lat: 39.7767, lng: 30.5206 }, // Eskişehir
  '42': { lat: 37.8714, lng: 32.4846 }, // Konya
  '20': { lat: 37.7765, lng: 29.0864 }, // Denizli
  '55': { lat: 41.2867, lng: 36.3300 }, // Samsun
  '61': { lat: 41.0027, lng: 39.7168 }, // Trabzon
  '10': { lat: 39.6484, lng: 27.8826 }, // Balıkesir
  '17': { lat: 40.1553, lng: 26.4142 }, // Çanakkale (Çan: 40.0337, 27.0503)
  '48': { lat: 37.2153, lng: 28.3636 }, // Muğla
  '33': { lat: 36.8121, lng: 34.6415 }, // Mersin
  '27': { lat: 37.0662, lng: 37.3833 }, // Gaziantep
  '02': { lat: 37.7648, lng: 38.2786 }, // Adıyaman
  '03': { lat: 38.7507, lng: 30.5567 }, // Afyonkarahisar
  '04': { lat: 39.7191, lng: 43.0503 }, // Ağrı
  '05': { lat: 40.6533, lng: 35.8331 }, // Amasya
  '08': { lat: 41.1828, lng: 41.8183 }, // Artvin
  '09': { lat: 37.8444, lng: 27.8458 }, // Aydın
  '11': { lat: 40.1451, lng: 29.9799 }, // Bilecik
  '12': { lat: 38.8854, lng: 40.4983 }, // Bingöl
  '13': { lat: 38.4006, lng: 42.1095 }, // Bitlis
  '14': { lat: 40.7392, lng: 31.6089 }, // Bolu
  '15': { lat: 37.7203, lng: 30.2908 }, // Burdur
  '18': { lat: 40.6013, lng: 33.6134 }, // Çankırı
  '19': { lat: 40.5506, lng: 34.9556 }, // Çorum
  '21': { lat: 37.9144, lng: 40.2306 }, // Diyarbakır
  '22': { lat: 41.6771, lng: 26.5557 }, // Edirne
  '23': { lat: 38.6810, lng: 39.2264 }, // Elazığ
  '24': { lat: 39.7500, lng: 39.5000 }, // Erzincan
  '25': { lat: 39.9043, lng: 41.2679 }, // Erzurum
  '28': { lat: 40.9128, lng: 38.3895 }, // Giresun
  '29': { lat: 40.4600, lng: 39.4700 }, // Gümüşhane
  '30': { lat: 37.5744, lng: 43.7408 }, // Hakkari
  '31': { lat: 36.2023, lng: 36.1613 }, // Hatay
  '32': { lat: 37.7648, lng: 30.5566 }, // Isparta
  '36': { lat: 40.6014, lng: 43.0950 }, // Kars
  '37': { lat: 41.3887, lng: 33.7827 }, // Kastamonu
  '38': { lat: 38.7312, lng: 35.4787 }, // Kayseri
  '39': { lat: 41.7333, lng: 27.2167 }, // Kırklareli
  '40': { lat: 39.1425, lng: 34.1709 }, // Kırşehir
  '43': { lat: 39.4167, lng: 29.9833 }, // Kütahya
  '44': { lat: 38.3552, lng: 38.3095 }, // Malatya
  '45': { lat: 38.6191, lng: 27.4289 }, // Manisa
  '46': { lat: 37.5858, lng: 36.9371 }, // Kahramanmaraş
  '47': { lat: 37.3212, lng: 40.7245 }, // Mardin
  '49': { lat: 38.7432, lng: 41.5064 }, // Muş
  '50': { lat: 38.6244, lng: 34.7142 }, // Nevşehir
  '51': { lat: 37.9667, lng: 34.6833 }, // Niğde
  '52': { lat: 40.9839, lng: 37.8764 }, // Ordu
  '53': { lat: 41.0201, lng: 40.5234 }, // Rize
  '54': { lat: 40.7569, lng: 30.3783 }, // Sakarya
  '56': { lat: 37.9333, lng: 41.9500 }, // Siirt
  '57': { lat: 42.0231, lng: 35.1531 }, // Sinop
  '58': { lat: 39.7477, lng: 37.0179 }, // Sivas
  '59': { lat: 40.9833, lng: 27.5167 }, // Tekirdağ
  '60': { lat: 40.3167, lng: 36.5500 }, // Tokat
  '62': { lat: 39.1079, lng: 39.5401 }, // Tunceli
  '63': { lat: 37.1674, lng: 38.7955 }, // Şanlıurfa
  '64': { lat: 38.6823, lng: 29.4082 }, // Uşak
  '65': { lat: 38.4891, lng: 43.4089 }, // Van
  '66': { lat: 39.8181, lng: 34.8147 }, // Yozgat
  '67': { lat: 41.4564, lng: 31.7987 }, // Zonguldak
  '68': { lat: 38.3687, lng: 34.0370 }, // Aksaray
  '69': { lat: 40.2552, lng: 40.2249 }, // Bayburt
  '70': { lat: 37.1759, lng: 33.2287 }, // Karaman
  '71': { lat: 39.8468, lng: 33.5153 }, // Kırıkkale
  '72': { lat: 37.8812, lng: 41.1251 }, // Batman
  '73': { lat: 37.5164, lng: 42.4594 }, // Şırnak
  '74': { lat: 41.6344, lng: 32.3375 }, // Bartın
  '75': { lat: 41.1105, lng: 42.7022 }, // Ardahan
  '76': { lat: 39.9167, lng: 44.0333 }, // Iğdır
  '77': { lat: 40.6500, lng: 29.2667 }, // Yalova
  '78': { lat: 41.2061, lng: 32.6204 }, // Karabük
  '79': { lat: 36.7184, lng: 37.1212 }, // Kilis
  '80': { lat: 37.0742, lng: 36.2472 }, // Osmaniye
  '81': { lat: 40.8438, lng: 31.1565 }, // Düzce
};

// Geriye dönük uyumluluk için alias
export const CITY_COORDINATES = CITY_CENTERS;

// Türkiye İllerine Göre Coğrafi Bounding Box Kısıtlamaları (minLng, minLat, maxLng, maxLat)
export const CITY_BOUNDING_BOXES: Record<string, [number, number, number, number]> = {
  '16': [28.05, 39.60, 29.95, 40.65], // Bursa
  '34': [27.95, 40.75, 29.95, 41.55], // İstanbul
  '06': [31.50, 39.10, 33.95, 40.70], // Ankara
  '35': [26.25, 37.80, 28.30, 39.30], // İzmir
  '07': [29.20, 36.15, 32.60, 37.50], // Antalya
  '41': [29.35, 40.50, 30.40, 41.25], // Kocaeli
  '26': [29.90, 39.05, 32.10, 40.15], // Eskişehir
  '01': [34.75, 36.50, 36.45, 37.95], // Adana
  '10': [26.65, 39.15, 28.85, 40.60], // Balıkesir
  '17': [25.60, 39.40, 27.50, 40.70], // Çanakkale
  '42': [31.25, 36.65, 34.10, 39.30], // Konya
  '27': [36.45, 36.60, 38.10, 37.45], // Gaziantep
  '55': [35.05, 40.85, 37.20, 41.80], // Samsun
  '61': [39.10, 40.50, 40.50, 41.20], // Trabzon
  '48': [27.20, 36.50, 29.70, 37.60], // Muğla
  '33': [32.40, 36.00, 35.20, 37.40], // Mersin
  '20': [28.50, 37.15, 29.95, 38.30], // Denizli
  '32': [30.15, 37.30, 31.35, 38.45], // Isparta
};

export const DEFAULT_MAP_CENTER: Coordinates = CITY_CENTERS['34'];
export const DEFAULT_MAP_ZOOM = 13;

/**
 * Verilen plaka koduna göre şehir merkez koordinatını döndürür
 */
export function getCityCenter(plate: string): Coordinates {
  return CITY_CENTERS[plate] || DEFAULT_MAP_CENTER;
}

/**
 * Verilen plaka koduna göre ilin coğrafi sınır kutusunu (bounding box) döndürür
 */
export function getCityBoundingBox(plate: string): [number, number, number, number] | undefined {
  return CITY_BOUNDING_BOXES[plate];
}
