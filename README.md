# React TypeScript Vite App

A modern React application built with TypeScript, Vite, SCSS, and React Router.

## Features

- ⚡️ Vite for fast development and building
- ⚛️ React 18 with TypeScript
- 🎨 SCSS for styling with variables
- 🚦 React Router for client-side routing
- 🔧 ESLint for code quality
- 📦 NPM for package management

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- NPM

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── Home.tsx        # Homepage component
│   └── Home.scss       # Homepage styles
├── styles/             # Global styles
│   ├── index.scss      # Main stylesheet
│   └── variables.scss  # SCSS variables
├── App.tsx             # Main App component
├── App.scss            # App styles
├── main.tsx            # Application entry point
└── vite-env.d.ts       # Vite type definitions
```

## Technologies Used

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **SCSS** - CSS preprocessor
- **React Router** - Client-side routing
- **ESLint** - Code linting
