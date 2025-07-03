'use client';

import { useEffect, useRef, useState } from 'react';

const EFFECTS = [
  { value: 'linear-fill', label: 'Linear Fill' },
  { value: 'center-pulse', label: 'Center Pulse' },
  { value: 'rainbow-flow', label: 'Rainbow Flow' },
  { value: 'sparkle', label: 'Sparkle' },
];

export default function HomePage() {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState('linear-fill');

  // Load localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('mic_enabled') === 'true';
    const effect = localStorage.getItem('selected_effect');
    if (enabled) setIsEnabled(true);
    if (effect) setSelectedEffect(effect);
  }, []);

  useEffect(() => {
    localStorage.setItem('mic_enabled', String(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    localStorage.setItem('selected_effect', selectedEffect);
  }, [selectedEffect]);

  // Clean up everything (socket, mic, ctx, animation)
  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (socketRef.current) {
      console.log('🔌 Closing WebSocket');
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    analyserRef.current = null;
  };

  // Main handler
  const startVisualizer = async () => {
    cleanup();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      source.connect(analyser);

      const socket = new WebSocket('ws://localhost:3001');
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket connected');
        const loop = () => {
          if (
            !socketRef.current ||
            socketRef.current.readyState !== WebSocket.OPEN ||
            !analyserRef.current
          ) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          const volume = dataArray.slice(1, 20).reduce((a, b) => a + b, 0) / (20 * 255);
          const hue = (Date.now() * 0.0001) % 1;

          socket.send(JSON.stringify({ volume, hue, effect: selectedEffect }));
          animationRef.current = requestAnimationFrame(loop);
        };
        loop();
      };

      socket.onerror = () => {
        console.error('WebSocket error');
        socket.close();
      };

      socket.onclose = () => {
        console.log('🔌 WebSocket closed');
      };

    } catch (err) {
      console.error('Mic access failed', err);
      setIsEnabled(false);
    }
  };

  // React to toggle and effect changes
  useEffect(() => {
    if (isEnabled) {
      startVisualizer();
    } else {
      cleanup();
    }

    return cleanup; // also run on unmount
  }, [isEnabled, selectedEffect]);

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'black',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎶 LED UDP Visualizer</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          style={{
            padding: '0.5rem 1rem',
            background: isEnabled ? 'green' : 'gray',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          onClick={() => setIsEnabled(prev => !prev)}
        >
          {isEnabled ? '🛑 Stop Visualizer' : '▶️ Start Visualizer'}
        </button>

        <select
          style={{
            padding: '0.5rem',
            background: '#222',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '5px',
          }}
          value={selectedEffect}
          onChange={(e) => setSelectedEffect(e.target.value)}
        >
          {EFFECTS.map(effect => (
            <option key={effect.value} value={effect.value}>{effect.label}</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#aaa' }}>
        Selected Effect: <strong>{selectedEffect}</strong>
      </p>
    </main>
  );
}
