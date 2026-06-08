# Expense Tracker — PRD

## Overview
A mobile-first Expo React Native app for tracking weekly expenses with AI-powered savings suggestions and in-app limit alerts. Built with FastAPI + MongoDB on the backend.

## Core Features
1. **Weekly Expense Tracking** — Log expenses (amount, category, note, date). Home screen shows the current week's total, daily breakdown chart, and recent transactions.
2. **AI-powered Suggestions** — `Coach` tab calls `/api/suggestions` which uses Claude Sonnet 4.6 via the Emergent LLM key to generate 3 personalized money-saving tips based on the current week's category breakdown.
3. **Weekly Limit Notifications** — Users set a weekly budget in Settings. The Home screen shows an in-app banner at 80% usage (warning) and 100%+ (danger). Banner is auto-dismissed after view per week + level to avoid nagging.
4. **Stats** — Daily bar chart for the current week and a per-category breakdown with progress bars.

## Screens
- `/(tabs)/index` — Home (weekly total card + recent transactions + FAB to add)
- `/(tabs)/stats` — Daily chart + category breakdown
- `/(tabs)/suggestions` — AI coach (LLM-powered)
- `/(tabs)/settings` — Weekly limit + currency picker
- `/add-expense` — Modal-like form for new expenses

## Tech
- Frontend: Expo SDK 54, expo-router, react-native-keyboard-controller, react-native-safe-area-context
- Backend: FastAPI, Motor (MongoDB), emergentintegrations (Claude Sonnet 4.6)
- Storage: Single-tenant MongoDB (no auth yet — local-first single-user app)

## Backend API (all routes prefixed with /api)
- `GET /categories` — list of expense categories
- `GET /expenses?start=&end=` — list expenses (optionally filtered by date range)
- `POST /expenses` — create
- `PUT /expenses/{id}` — update
- `DELETE /expenses/{id}` — delete
- `GET /expenses/week` — current week summary (total, by_category, by_day, limit, percent_used, over_limit)
- `GET /budget` / `PUT /budget` — get/set weekly_limit and currency
- `GET /suggestions` — AI-generated saving tips (with fallback if LLM fails)

## Integrations
- **Emergent LLM Key** for Claude Sonnet 4.6 (suggestions).

## Out of Scope (future)
- Auth (multi-user)
- Real push notifications (requires native build)
- Edit-expense UI (delete only for v1)
- Custom categories
