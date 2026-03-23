# AURA V-SAGE BudgetTrip Planner

> "Smart AI Planning for Budget-Friendly Group Trips"

AURA V-SAGE is a modern, AI-powered web application designed to help users plan budget-friendly group trips effortlessly. Built with React, TypeScript, and Firebase, it features a sleek, animated user interface and robust authentication.

## ✨ Features

- **Secure Authentication**: Supports multiple login methods including Email/Password, Phone Number (OTP), and Google Sign-In via Firebase Auth.
- **Real-time Data**: Utilizes Firebase Firestore for real-time user data synchronization and storage.
- **Modern UI/UX**: Beautiful, glassmorphism-inspired design with smooth animations powered by Framer Motion.
- **Responsive Design**: Fully responsive layout built with Tailwind CSS, ensuring a seamless experience across desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend Framework**: [React 18](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend & Auth**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A Firebase project with Authentication (Email, Phone, Google) and Firestore enabled.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/aura-v-sage.git
   cd aura-v-sage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase Environment Variables**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
   *(Note: If the project uses `firebase-applet-config.json`, ensure that file is populated with your Firebase credentials).*

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 📦 Build for Production

To build the app for production, run:
```bash
npm run build
```
The compiled assets will be generated in the `dist` folder.

## 📄 License

This project is licensed under the MIT License.
