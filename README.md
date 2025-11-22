# Electric Vehicle Dealer Management System - Frontend

## Tech Stack
- **React 19** - UI Framework
- **Vite** - Build tool & Dev server
- **React Router DOM** - Routing

## Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Server will run on: http://localhost:3000

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure
```
FRONTEND/
├── public/          # Static assets
├── src/
│   ├── Components/  # React components
│   ├── ManagerFeatures/  # Manager-specific features
│   ├── services/    # API services
│   ├── App.jsx      # Main App component
│   └── main.jsx     # Entry point
└── vite.config.js   # Vite configuration
```

## API Configuration
The frontend connects to backend API at `http://localhost:8080` (configured in vite.config.js proxy) 
