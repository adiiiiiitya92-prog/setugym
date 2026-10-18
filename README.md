# SetuGym - AI-Powered Fitness & Gym Management Platform

SetuGym is a modern, full-stack fitness and gym management platform built with an Expo / React Native mobile & web frontend, a Node.js Express backend, Supabase PostgreSQL, Firebase Cloud Messaging (FCM), and Groq AI workout intelligence.

---

## 🚀 Key Features

- **Multi-Role Role-Based Architecture**:
  - **Super Admin**: High-level platform control, gym owner onboarding, tenant monitoring.
  - **Gym Owner**: Member management, subscription plans, trainer assignment, financial tracking & expense ledger.
  - **Trainer**: Client roster, workout regimen planning, attendance verification, member progress metrics.
  - **Member**: Dynamic digital gym pass, QR attendance scanning, workout logging, AI fitness chatbot.
- **Smart Attendance & Geofencing**:
  - In-app QR code generation & scanner.
  - Location verification with geofencing support.
- **Groq AI Fitness & Workout Engine**:
  - Integrated AI chatbot powering personalized workout guidance and routine recommendations.
- **Push Notification Engine**:
  - Real-time event notifications and FCM integration for native iOS & Android push messaging.
- **Offline / Local-First Resilience**:
  - Local state hydration, AsyncStorage caching, and graceful fallback support.

---

## 🏗️ Architecture & Project Structure

```plaintext
setugym/
├── frontend/             # Expo React Native App (iOS, Android, Web)
│   ├── app/              # Expo Router routes & role-based screens
│   ├── components/       # Reusable UI components & animations
│   ├── constants/        # Mock data, color palettes, theme tokens
│   ├── context/          # AuthContext, GymContext, ThemeContext
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Supabase & backend API client services
│   ├── assets/           # Logos, icons, and brand graphics
│   └── app.json          # Expo project configuration
├── backend/              # Node.js Express API Server
│   ├── routes/           # Attendance, Notifications (FCM), AI routes
│   ├── server.js         # Express app entrypoint
│   └── supabaseClient.js # Supabase Admin privileged client
├── supabase/             # Database Architecture
│   ├── migrations/       # SQL schema migrations & triggers
│   └── combined_schema.sql
├── scripts/              # Database maintenance & inspection tools
└── fcm_setup_guide.md    # Production Firebase setup walkthrough
```

---

## 🛠️ Tech Stack

- **Frontend**: Expo SDK 57, React Native 0.86, React 19, NativeWind (TailwindCSS), React Native Paper, Lucide / Expo Vector Icons
- **Backend**: Node.js, Express.js, Firebase Admin SDK
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **AI Engine**: Groq AI API (`openai/gpt-oss-120b`)
- **Push Notifications**: Firebase Cloud Messaging (FCM) & Expo Notifications

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20 LTS recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/go) app on mobile or an Android/iOS emulator

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` inside `backend/` from the template:
```bash
cp .env.example .env
```
Fill in your Supabase project URL, Service Role Key, and Groq API Key in `backend/.env`.

(Optional: Place your Firebase Admin SDK `service-account-file.json` in `backend/` for push notifications).

Start the backend:
```bash
npm start
```
The server will run on `http://localhost:5001`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` inside `frontend/` from the template:
```bash
cp .env.example .env
```
Configure your public Supabase URL and Anon Key in `frontend/.env`.

Run the development server:
```bash
npm start
```

- Press `w` to open in browser (Web mode).
- Press `a` for Android emulator or scan QR code via **Expo Go** on Android.
- Press `i` for iOS simulator.

---

## 🔒 Security & Privacy

- All sensitive secret keys, service account credentials (`*firebase-adminsdk*.json`, `service-account-file.json`), and private `.env` files are strictly excluded from version control via `.gitignore`.
- Template files (`.env.example`, `service-account-file.example.json`) are provided for straightforward local setup.

---

## 📄 License
SetuGym is proprietary software developed for modern fitness facilities. All rights reserved.
