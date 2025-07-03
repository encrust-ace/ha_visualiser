# 🎶 LED UDP Visualizer

A web-based audio visualizer that streams microphone audio to a Node.js WebSocket server, which then sends UDP packets to control addressable LED devices in real time. Built with Next.js and React for the frontend, and Node.js for the backend.

## Features

- Real-time audio visualization using your microphone.
- Multiple LED effects: Linear Fill, Center Pulse, Rainbow Flow, Wave Pulse Flow.
- WebSocket communication between frontend and backend.
- UDP packet output to configurable LED devices.
- Docker support for easy deployment.

## Project Structure

- `src/app/` – Next.js frontend (UI, styles, main page)
- `ws-server.js` – Node.js WebSocket + UDP server
- `Dockerfile` – Multi-service Docker setup
- `.github/workflows/docker.yml` – GitHub Actions for Docker image build/push

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Development

1. **Install dependencies:**
   ```sh
   npm install