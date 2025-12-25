/**
 * Audio amplitude analysis hook for lip-sync animation.
 * Uses Web Audio API's AnalyserNode for real-time amplitude extraction.
 */

import { useRef, useCallback, useEffect } from "react";

interface UseAudioAmplitudeReturn {
  /** Ref containing current amplitude (0-1), read in animation frame */
  amplitudeRef: React.RefObject<number>;
  /** AnalyserNode to connect to audio graph */
  analyserNode: AnalyserNode | null;
  /** Create analyser for given AudioContext */
  createAnalyser: (audioContext: AudioContext) => AnalyserNode;
  /** Start continuous amplitude sampling */
  startSampling: () => void;
  /** Stop sampling and reset amplitude */
  stopSampling: () => void;
}

const SMOOTHING_UP = 0.3; // Fast rise when audio starts
const SMOOTHING_DOWN = 0.1; // Slow decay when audio stops
const AMPLITUDE_SCALE = 3.0; // Normalize quiet audio
const FFT_SIZE = 256; // Small FFT for performance

export function useAudioAmplitude(): UseAudioAmplitudeReturn {
  const amplitudeRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const createAnalyser = useCallback((audioContext: AudioContext) => {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.3;
    analyserRef.current = analyser;
    const buffer = new ArrayBuffer(analyser.frequencyBinCount);
    dataArrayRef.current = new Uint8Array(buffer);
    return analyser;
  }, []);

  const sample = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) {
      // Keep trying if analyser not ready yet
      rafIdRef.current = requestAnimationFrame(sample);
      return;
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate average amplitude from frequency data
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length / 255; // Normalize to 0-1
    const scaled = Math.min(1, average * AMPLITUDE_SCALE);

    // Exponential smoothing with asymmetric rise/fall
    const current = amplitudeRef.current;
    const factor = scaled > current ? SMOOTHING_UP : SMOOTHING_DOWN;
    amplitudeRef.current = current + (scaled - current) * factor;

    // Debug: Log amplitude occasionally
    if (Math.random() < 0.01 && amplitudeRef.current > 0.01) {
      console.log(`[Amplitude] ${amplitudeRef.current.toFixed(3)}`);
    }

    rafIdRef.current = requestAnimationFrame(sample);
  }, []);

  const startSampling = useCallback(() => {
    if (rafIdRef.current) return; // Already sampling
    sample();
  }, [sample]);

  const stopSampling = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    amplitudeRef.current = 0;
  }, []);

  useEffect(() => {
    return () => stopSampling(); // Cleanup on unmount
  }, [stopSampling]);

  return {
    amplitudeRef,
    analyserNode: analyserRef.current,
    createAnalyser,
    startSampling,
    stopSampling,
  };
}
