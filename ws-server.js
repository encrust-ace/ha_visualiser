const WebSocket = require('ws');
const dgram = require('dgram');

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

function renderPacketLinear(count, volume, hue) {
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

function renderPacketCenterPulse(count, volume, hue) {
  const lit = Math.floor(volume * count);
  const leds = new Array(count * 3).fill(0);
  const center = Math.floor(count / 2);

  for (let i = 0; i < lit; i++) {
    const offset = Math.floor(i / 2);
    const left = center - offset;
    const right = center + offset;

    const adjustedHue = (hue + offset / count) % 1.0;
    const [r, g, b] = hsvToRgb(adjustedHue, 1, 1);

    if (left >= 0) {
      leds[left * 3] = r;
      leds[left * 3 + 1] = g;
      leds[left * 3 + 2] = b;
    }
    if (right < count) {
      leds[right * 3] = r;
      leds[right * 3 + 1] = g;
      leds[right * 3 + 2] = b;
    }
  }

  return Buffer.from([0x02, 0x01, ...leds]);
}

function renderPacketRainbowFlow(count, volume, hue) {
  const leds = [];

  for (let i = 0; i < count; i++) {
    const shiftHue = (hue + i / count) % 1.0;
    const [r, g, b] = hsvToRgb(shiftHue, 1, volume); // volume controls brightness
    leds.push(r, g, b);
  }

  return Buffer.from([0x02, 0x01, ...leds]);
}

function renderPacketSparkle(count, volume, hue) {
  const leds = new Array(count * 3).fill(0);
  const sparkleCount = Math.floor(volume * count * 0.4);

  for (let i = 0; i < sparkleCount; i++) {
    const index = Math.floor(Math.random() * count);
    const sparkleHue = (hue + Math.random() * 0.2) % 1.0;
    const [r, g, b] = hsvToRgb(sparkleHue, 1, 1);

    leds[index * 3] = r;
    leds[index * 3 + 1] = g;
    leds[index * 3 + 2] = b;
  }

  return Buffer.from([0x02, 0x01, ...leds]);
}

function renderPacket(count, volume, hue, effect = 'linear-fill') {
  switch (effect) {
    case 'center-pulse':
      return renderPacketCenterPulse(count, volume, hue);
    case 'rainbow-flow':
      return renderPacketRainbowFlow(count, volume, hue);
    case 'sparkle':
      return renderPacketSparkle(count, volume, hue);
    case 'linear-fill':
    default:
      return renderPacketLinear(count, volume, hue);
  }
}

const wss = new WebSocket.Server({ port: 3001 }, () =>
  console.log("WebSocket server running on ws://localhost:3001")
);

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const { volume, hue, effect } = JSON.parse(message.toString());

      for (const dev of LED_DEVICES) {
        const pkt = renderPacket(dev.count, volume, hue, effect);
        udpSocket.send(pkt, 0, pkt.length, 21324, dev.ip);
      }
    } catch (e) {
      console.error("Failed to process message:", e);
    }
  });
});
