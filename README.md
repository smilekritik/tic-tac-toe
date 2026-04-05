# Tic-Tac-Toe

Full-stack real-time Tic-Tac-Toe platform with authentication, matchmaking, profile management, and WebSocket gameplay.

## Overview

This project is a multiplayer Tic-Tac-Toe application built as a full-stack monorepo.

It includes:

- real-time gameplay with Socket.IO
- authentication with access and refresh tokens
- email verification and password reset
- profile and public profile pages
- PostgreSQL + Prisma for persistence
- Docker-based local development setup

## Features

- User registration and login
- Email verification flow
- Password reset flow
- Refresh-token based auth
- Profile management
- Public user profiles
- Real-time game state
- Internationalized frontend

## Tech Stack

### Frontend
- React
- Vite
- Zustand
- Axios
- React Router
- i18next
- Socket.IO Client
- Tailwind CSS

### Backend
- Node.js
- TypeScript
- NestJS
- Prisma
- PostgreSQL
- Socket.IO
- JWT
- Nodemailer
- Multer

## Project Structure

```text
frontend/
backend-nest/
prisma/
nginx/
uploads/
docker-compose.dev.yml
```

## Local Development

Start the full stack:

```bash
docker compose -f docker-compose.dev.yml --env-file .env up -d --build
```

Useful endpoints:

- Frontend: `http://localhost:3000`
- Nginx entrypoint: `http://localhost`
- Swagger: `http://localhost/api-docs`
- AsyncAPI docs: `http://localhost/asyncapi-docs`

## Backend Notes

- The active backend is `backend-nest/`.
- The old JavaScript backend has been removed from the active repository layout. You can find it in separated branch.
- Prisma schema and migrations live in `prisma/` and are shared by the backend runtime and tests.
