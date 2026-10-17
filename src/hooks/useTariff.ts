'use client';

/**
 * YolNet & YolNet Lite - useTariff Hook
 * Şehir seçimi, canlı tarife çekimi ve çevrimdışı durum yönetimi
 */

import { useState, useEffect, useCallback } from 'react';
import { CityTariff, PlateOption, TariffSource } from '@/types/taxi';
import { loadTariffs, AVAILABLE_PLATES } from '@/services/tariffService';

interface UseTariffReturn {
  tariffs: CityTariff[];
  selectedPlate: string;
  setSelectedPlate: (plate: string) => void;
  currentTariff: CityTariff | null;
  availablePlates: PlateOption[];
  source: TariffSource;
  isLoading: boolean;
  error: string | null;
  refreshTariffs: () => Promise<void>;
  feedbackMessage: string | null;
}

const SELECTED_PLATE_KEY = 'yolnet_selected_plate';

export function useTariff(defaultPlate: string = '34'): UseTariffReturn {
  const [tariffs, setTariffs] = useState<CityTariff[]>([]);
  const [selectedPlate, setSelectedPlateState] = useState<string>(defaultPlate);
  const [source, setSource] = useState<TariffSource>('mock');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchTariffData = useCallback(async (showFeedback = false) => {
    setIsLoading(true);
    setError(null);
    if (showFeedback) {
      setFeedbackMessage(null);
    }

    try {
      const result = await loadTariffs();
      setTariffs(result.tariffs);
      setSource(result.source);

      if (showFeedback) {
        setFeedbackMessage('Tarifeler Güncellendi ✓');
        setTimeout(() => {
          setFeedbackMessage(null);
        }, 3000);
      }
    } catch (err) {
      setError('Tarife verisi yüklenemedi.');
      console.error('[useTariff] Hata:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlate = localStorage.getItem(SELECTED_PLATE_KEY);
      if (savedPlate) {
        setSelectedPlateState(savedPlate);
      }
    }
    fetchTariffData(false);
  }, [fetchTariffData]);

  const setSelectedPlate = useCallback((plate: string) => {
    setSelectedPlateState(plate);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SELECTED_PLATE_KEY, plate);
      } catch {
        // localStorage hatası yok sayılır
      }
    }
  }, []);

  const refreshTariffs = useCallback(async () => {
    await fetchTariffData(true);
  }, [fetchTariffData]);

  const currentTariff =
    tariffs.find((t) => t.plateCode === selectedPlate) ||
    tariffs[0] ||
    null;

  return {
    tariffs,
    selectedPlate,
    setSelectedPlate,
    currentTariff,
    availablePlates: AVAILABLE_PLATES,
    source,
    isLoading,
    error,
    refreshTariffs,
    feedbackMessage,
  };
}
