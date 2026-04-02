# Unichat — Industry-Grade Slack-Like Chat App

A full-stack React Native + Node.js real-time messaging app.

## Architecture
```
unichat/
├── backend/    # Node.js + Express + Socket.IO + MongoDB
└── mobile/     # React Native (Expo) application
```

## Features
- 🔐 Auth: Register, Login, JWT + refresh tokens
- 🏢 Workspaces: Create/join with invite codes
- 📢 Channels: Public/private with roles
- 💬 Direct Messages: 1:1 and group DMs, unread counts
- 🧵 Threads: Full threaded conversations
- 📎 **File Sharing**: Images, video, audio, documents via Cloudinary
- 🖼️ **Media Previews**: Tap-to-expand images, video thumbnails with play button
- ⭐ **Starred/Saved Messages**: Save any message, view in dedicated screen
- 👤 **User Profiles**: Full profile screen, tap any avatar
- 🔔 Notifications: Mentions, DMs, thread replies — all wired
- 🔍 Search: Messages, channels, users, files
- 😀 Reactions: Emoji reactions with quick picker
- 📌 Pinned messages
- 🟢 Presence: Online/Away/Busy/Offline with real-time updates
- ✏️ Typing indicators (animated dots)
- 📖 Unread counts per channel and DM
- 🗑️ Message delete (sender + channel admins)
- ✏️ Message edit
- 🌓 Theme-ready color system

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # Fill in MongoDB URI, JWT secrets, Cloudinary keys
npm run dev            # Starts on port 4000
npm run seed           # Seed demo data (4 users, 1 workspace, channels, messages)
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## Environment Variables (backend/.env)
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/unichat
JWT_SECRET=change-this
JWT_REFRESH_SECRET=change-this-too

# Cloudinary (get free at cloudinary.com — required for file uploads)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

## API Routes
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET | /api/workspaces | List workspaces |
| POST | /api/workspaces | Create workspace |
| POST | /api/workspaces/join/:code | Join by invite code |
| GET | /api/channels/workspace/:id | List channels |
| POST | /api/channels | Create channel |
| GET | /api/messages/channel/:id | Get messages |
| POST | /api/messages | Send message |
| PUT | /api/messages/:id | Edit message |
| DELETE | /api/messages/:id | Delete message |
| POST | /api/messages/:id/react | React to message |
| POST | /api/messages/:id/pin | Pin/unpin |
| GET | /api/dms?workspaceId=xxx | List DMs |
| POST | /api/dms | Create/get DM |
| GET | /api/dms/:id/messages | DM messages |
| POST | /api/files/upload | Upload file (multipart) |
| GET | /api/starred?workspaceId=xxx | Saved messages |
| POST | /api/starred | Star message |
| DELETE | /api/starred/:messageId | Unstar |
| GET | /api/search?q=&workspaceId= | Search |
| GET | /api/notifications | Notifications |
| PUT | /api/notifications/mark-all-read | Mark all read |
| GET | /api/users/profile/:id | User profile |
| PUT | /api/users/profile | Update profile |

## Test Accounts (after seeding)
- alex@unichat.com / password123
- sarah@unichat.com / password123
- jordan@unichat.com / password123
- marcus@unichat.com / password123

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO, MongoDB/Mongoose, JWT, Cloudinary, Multer
- **Mobile**: React Native (Expo), Redux Toolkit, Socket.IO Client, Expo Image Picker, Expo Document Picker
- **Real-time**: Socket.IO rooms (workspace, channel, dm, thread, user)
