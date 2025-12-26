/**
 * Audio capture and playback hook using Web Audio API
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { float32ToPCM16Base64, base64PCM16ToFloat32 } from "../utils/audio";
import audioCaptureProcessorUrl from "../utils/audio-capture-processor.ts?url";

const CHUNK_DURATION_MS = 100;

interface UseAudioStreamOptions {
  /** Optional callback to create an AnalyserNode using the stream's AudioContext */
  createAnalyser?: (audioContext: AudioContext) => AnalyserNode;
}

interface UseAudioStreamReturn {
  isCapturing: boolean;
  isPlaying: boolean;
  startCapture: (onAudioData: (base64Audio: string) => void) => Promise<number>;
  stopCapture: () => void;
  stopPlayback: () => void;
  playAudio: (base64Audio: string) => void;
  audioLevel: number;
  sampleRate: number;
  /** Get the AudioContext used for playback (creates one if not exists) */
  getAudioContext: () => AudioContext;
}

export function useAudioStream({ createAnalyser }: UseAudioStreamOptions = {}): UseAudioStreamReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletRegisteredRef = useRef(false);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentPlaybackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize audio context with native sample rate
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Let browser choose native sample rate for optimal performance
      audioContextRef.current = new AudioContext();
      const nativeSampleRate = audioContextRef.current.sampleRate;
      setSampleRate(nativeSampleRate);
      console.log(`Audio context initialized with native sample rate: ${nativeSampleRate}Hz`);

      // Create analyser node if callback provided
      if (createAnalyser && !analyserNodeRef.current) {
        analyserNodeRef.current = createAnalyser(audioContextRef.current);
        console.log("Analyser node created for lip-sync");
      }
    }
    return audioContextRef.current;
  }, [createAnalyser]);

  // Start audio capture - returns the detected sample rate
  const startCapture = useCallback(
    async (onAudioData: (base64Audio: string) => void): Promise<number> => {
      try {
        // Initialize audio context first to get native sample rate
        const audioContext = getAudioContext();
        const nativeSampleRate = audioContext.sampleRate;

        // Request microphone access with native sample rate
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: nativeSampleRate,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        mediaStreamRef.current = stream;

        // Resume context if suspended
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        // Register AudioWorklet module (once per context)
        if (!workletRegisteredRef.current) {
          //  await audioContext.audioWorklet.addModule("/audio-capture-processor.js");
          await audioContext.audioWorklet.addModule(audioCaptureProcessorUrl);
          workletRegisteredRef.current = true;
          console.log("AudioWorklet module registered");
        }

        // Create source from microphone
        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Create AudioWorklet node for audio processing
        const chunkSizeSamples = Math.floor((nativeSampleRate * CHUNK_DURATION_MS) / 1000);
        const workletNode = new AudioWorkletNode(audioContext, "audio-capture-processor", {
          processorOptions: {
            chunkSizeSamples,
          },
        });

        // Handle messages from AudioWorklet
        workletNode.port.onmessage = (event: MessageEvent) => {
          if (event.data.type === "audioData") {
            const chunk = event.data.audioData as Float32Array;

            // Calculate audio level on main thread
            let sum = 0;
            for (let i = 0; i < chunk.length; i++) {
              sum += chunk[i] * chunk[i];
            }
            const rms = Math.sqrt(sum / chunk.length);
            setAudioLevel(rms);

            // Convert to PCM16 and send
            const base64Audio = float32ToPCM16Base64(chunk);
            onAudioData(base64Audio);
          }
        };

        workletNodeRef.current = workletNode;

        // Connect nodes
        source.connect(workletNode);
        workletNode.connect(audioContext.destination);

        setIsCapturing(true);
        console.log(`Audio capture started at ${nativeSampleRate}Hz (native)`);

        // Return the sample rate for immediate use
        return nativeSampleRate;
      } catch (error) {
        console.error("Failed to start audio capture:", error);
        throw error;
      }
    },
    [getAudioContext]
  );

  // Stop audio capture
  const stopCapture = useCallback(() => {
    // Signal the worklet to stop processing
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: "stop" });
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsCapturing(false);
    setAudioLevel(0);
    console.log("Audio capture stopped");
  }, []);

  // Stop audio playback
  const stopPlayback = useCallback(() => {
    // Stop currently playing audio source
    if (currentPlaybackSourceRef.current) {
      try {
        currentPlaybackSourceRef.current.stop();
        currentPlaybackSourceRef.current.disconnect();
      } catch {
        // Source may already be stopped, ignore error
      }
      currentPlaybackSourceRef.current = null;
    }

    // Clear the playback queue
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    console.log("Audio playback stopped (interrupted)");
  }, []);

  // Play next chunk from queue
  const playNextChunk = useCallback((audioContext: AudioContext) => {
    if (playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      currentPlaybackSourceRef.current = null;
      return;
    }

    const chunk = playbackQueueRef.current.shift()!;
    // Use native sample rate for playback (no resampling needed)
    const audioBuffer = audioContext.createBuffer(1, chunk.length, audioContext.sampleRate);
    audioBuffer.getChannelData(0).set(chunk);

    console.log(
      `[Playback] Playing chunk: ${chunk.length} samples at ${audioContext.sampleRate}Hz, duration: ${((chunk.length / audioContext.sampleRate) * 1000).toFixed(1)}ms`
    );

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Connect through analyser if available, otherwise direct to destination
    if (analyserNodeRef.current) {
      source.connect(analyserNodeRef.current);
      analyserNodeRef.current.connect(audioContext.destination);
    } else {
      source.connect(audioContext.destination);
    }

    // Store reference to current source for interruption handling
    currentPlaybackSourceRef.current = source;

    source.onended = () => {
      // Clear reference when playback ends naturally
      if (currentPlaybackSourceRef.current === source) {
        currentPlaybackSourceRef.current = null;
      }
      playNextChunk(audioContext);
    };

    source.start();
  }, []);

  // Play audio
  const playAudio = useCallback(
    (base64Audio: string) => {
      try {
        const audioContext = getAudioContext();
        const float32Data = base64PCM16ToFloat32(base64Audio);

        console.log(`[Playback] Queueing audio chunk: ${float32Data.length} samples at ${audioContext.sampleRate}Hz`);

        // Add to playback queue
        playbackQueueRef.current.push(float32Data);

        // Start playback if not already playing
        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          setIsPlaying(true);
          playNextChunk(audioContext);
        }
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    },
    [getAudioContext, playNextChunk]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopCapture]);

  return {
    isCapturing,
    isPlaying,
    startCapture,
    stopCapture,
    stopPlayback,
    playAudio,
    audioLevel,
    sampleRate,
    getAudioContext,
  };
}
