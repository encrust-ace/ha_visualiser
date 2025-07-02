'use client';

import { useEffect, useRef } from 'react';

export default function HomePage() {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);


useEffect(() => {
  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const socket = new WebSocket(`wss://${window.location.hostname}:3001`);

    socketRef.current = socket;

    socket.onopen = () => {
      const loop = () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.slice(1, 20).reduce((a, b) => a + b, 0) / (20 * 255);
        const hue = (Date.now() * 0.0001) % 1;

        socketRef.current.send(JSON.stringify({ volume, hue }));
        requestAnimationFrame(loop);
      };

      loop();
    };
  };

  start();
}, []);


  return (
    <main style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'black', color: 'white' }}>
      <h1 style={{ fontSize: '2rem' }}>🎶 LED UDP Visualizer</h1>
    </main>
  );
}
