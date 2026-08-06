# 🎨 CampusXpose

Welcome to **CampusXpose**! This is a vibrant, interactive platform designed to connect the campus community through an incredibly unique, hand-drawn and sketch-like aesthetic. It's not just a social network; it's a living notebook of campus life!

---

## ✨ Features & Functionality

### 💬 Real-Time Messaging & Chat
- **Direct Messaging (DMs):** Chat instantly with other users in a beautifully themed sketch-book interface. Includes read receipts and unread message badges.
- **Message Requests:** Privacy first! New conversations from people you don't know slide out in a slick side-panel for you to accept or delete.
- **Global & Community Chat:** Jump into the public channels to see what's trending across the campus.
- **Audio Calls:** Built-in audio calling and call logs directly integrated into your DM threads.

### 🎭 Anonymous Confessions
- Share your deepest thoughts or funniest campus moments completely anonymously. A safe space for the campus to vent and relate.

### 📱 QR Code Integration
- **Scan & Connect:** Every user gets a unique CampusXpose QR code. Just point your camera at a friend's code to instantly open a DM with them.

### 🔔 Push Notifications
- Never miss a beat! Opt-in to web push notifications to get alerted when you receive new messages, even when the app is closed.

### 🎮 Mini-Games Hub
- Take a break from studying with our integrated mini-games like **2048**, **Knife Thrower**, and **Arrow Puzzle**. 
- Compete with friends for the highest scores on the leaderboards!

### ⚙️ Admin Dashboard
- A comprehensive control center for moderators to manage users, handle reports, update campus news, configure advertisements, and oversee the entire platform.

---

## 🛠️ Technology Stack

CampusXpose is built using a modern, blazing-fast web stack designed for scale and performance:

### Frontend
- **React 19 & TypeScript:** The core UI library and typed language for robust development.
- **Vite & TanStack Start / Router:** Lightning-fast builds, server-side rendering (SSR), and seamless file-based routing.
- **Tailwind CSS v4:** For rapid styling, featuring custom utility classes (like `wobbly-*` and `sketch-card`) to bring the hand-drawn aesthetic to life.
- **Radix UI (shadcn/ui) & Vaul:** Accessible, unstyled components that we've deeply customized to match the sketch theme.
- **Framer Motion:** Powering the smooth, dynamic micro-animations that make the UI feel alive.

### Backend & Database
- **Supabase:** The ultimate backend-as-a-service!
  - **PostgreSQL Database:** Securely storing users, messages, and content.
  - **Supabase Realtime:** Powering the instant message delivery and presence indicators (online/offline status).
  - **Supabase Auth:** Managing secure user logins and sessions.
  - **Edge Functions:** Handling complex backend logic like push notification dispatching and game analytics securely.

### Libraries & Tools
- **Zod:** For strict schema validation.
- **React Dropzone:** Handling file and image uploads.
- **React QR Scanner / QR Code:** Generating and reading user connect codes.

---

## 🖌️ The Design Aesthetic

CampusXpose isn't meant to look like another boring corporate app. We've heavily customized the UI to feel like a student's personal notebook:
- **Wobbly Borders:** Using custom SVG filters and CSS (`wobbly-sm`, `wobbly-md`) to give every button and container a hand-drawn, imperfect edge.
- **Ink & Marker Colors:** Our color palette relies on `--ink`, `--paper`, and `--marker` css variables to simulate pen and highlighter on physical paper.
- **Dynamic Micro-Interactions:** Buttons that tilt when hovered, and dialogue boxes that pop open like sketched sticky notes!

---

*Get ready to explore your campus like never before. Dive in and start sketching your CampusXpose story!*
