const fs = require("fs");
const https = require("https");
const express = require("express");
const WebSocket = require("ws");
const dgram = require("dgram");

const LED_DEVICES = [
  { ip: '192.168.68.60', count: 89 },
  { ip: '192.168.68.64', count: 90 },
];

const udpSocket = dgram.createSocket('udp4');

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: [r, g, b] = [v, t, p]; break;
    case 1: [r, g, b] = [q, v, p]; break;
    case 2: [r, g, b] = [p, v, t]; break;
    case 3: [r, g, b] = [p, q, v]; break;
    case 4: [r, g, b] = [t, p, v]; break;
    case 5: [r, g, b] = [v, p, q]; break;
  }
  return [r, g, b].map(x => Math.floor(x * 255));
}

function renderPacket(count, volume, hue) {
  const lit = Math.floor(volume * count);
  const leds = [];

  for (let i = 0; i < count; i++) {
    if (i < lit) {
      const adjustedHue = (hue + i / count) % 1.0;
      const [r, g, b] = hsvToRgb(adjustedHue, 1, 1);
      leds.push(r, g, b);
    } else {
      leds.push(0, 0, 0);
    }
  }

  return Buffer.from([0x02, 0x01, ...leds]);
}

const app = express();
const server = https.createServer({
  key: fs.readFileSync('certs/key.pem'),
  cert: fs.readFileSync('certs/cert.pem'),
}, app);

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const { volume, hue } = JSON.parse(message.toString());
      for (const dev of LED_DEVICES) {
        const pkt = renderPacket(dev.count, volume, hue);
        udpSocket.send(pkt, 0, pkt.length, 21324, dev.ip);
      }
    } catch (e) {
      console.error("Failed to process message:", e);
    }
  });
});

server.listen(3001, () => {
  console.log("Secure WebSocket + Express listening on https://<pi-ip>:3001");
});
