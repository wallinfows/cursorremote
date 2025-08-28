# RemoteCursor

Enable bilateral communication between Cursor and a remote mobile-based website, allowing you to manage and submit chats to Cursor on your home computer even when you're away.

## 🎯 Vision

RemoteCursor enables seamless remote access to Cursor's chat functionality through a mobile-optimized web interface. The goal is to provide a secure, real-time connection that allows you to:

- Submit new chats to Cursor from anywhere
- View and manage existing chat history
- Receive real-time updates from Cursor
- Maintain the full power of Cursor's AI assistance remotely

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │◄──►│  WebSocket       │◄──►│  Desktop Agent  │
│   (Web-based)   │    │  Bridge          │    │  (Home PC)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Components

- **Desktop Agent**: Interfaces with Cursor's API/processes on your home computer
- **WebSocket Bridge**: Real-time bidirectional communication layer
- **Mobile App**: Web-based mobile interface for remote access
- **Documentation**: Comprehensive guides and API documentation

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Git
- Cursor installed on your home computer

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd RemoteCursor
   ```

2. Install dependencies for each component:
   ```bash
   # Desktop Agent
   cd desktop-agent
   npm install

   # WebSocket Bridge
   cd ../websocket-bridge
   npm install

   # Mobile App
   cd ../mobile-app
   npm install
   ```

3. Configure the desktop agent with your Cursor settings

4. Start the services:
   ```bash
   # Start desktop agent
   cd desktop-agent
   npm start

   # Start WebSocket bridge
   cd ../websocket-bridge
   npm start

   # Start mobile app
   cd ../mobile-app
   npm start
   ```

## 📁 Project Structure

```
RemoteCursor/
├── desktop-agent/     # Cursor interface on home PC
├── websocket-bridge/  # Real-time communication layer
├── mobile-app/        # Web-based mobile interface
├── docs/             # Documentation and guides
└── scripts/          # Development utilities
```

## 🔧 Development

This project is currently in active development. Each component will have its own detailed documentation and setup instructions.

## 📄 License

[License information to be added]

## 🤝 Contributing

[Contribution guidelines to be added]
