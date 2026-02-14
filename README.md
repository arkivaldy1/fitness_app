# Forge Fitness

A focused, no-nonsense training and nutrition tracking app built with React Native and Expo.

## Features

- **Workout Logging**: Fast, friction-free set logging with smart defaults
- **Workout Builder**: Create custom workouts with exercise library
- **Nutrition Tracking**: Track calories, macros, and water intake
- **AI Programs** (Coming Soon): Generate personalized training programs
- **Offline-First**: Works without internet, syncs when connected

## Tech Stack

- **Frontend**: React Native + Expo (SDK 54)
- **Navigation**: Expo Router (file-based routing)
- **State**: Zustand
- **Local Storage**: expo-sqlite (offline-first)
- **Backend**: Supabase (optional, for sync)
- **Styling**: React Native StyleSheet with custom theme

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (for development)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Configuration (Optional)

For cloud sync features, create a `.env` file:

```bash
cp .env.example .env
```

Then add your Supabase credentials. The app works fully offline without Supabase.

## Project Structure

```
app/
├── (auth)/           # Authentication screens
├── (tabs)/           # Main tab navigation
│   ├── workout/      # Workout logging & builder
│   ├── nutrition/    # Nutrition tracking
│   ├── programs/     # AI program generation
│   └── profile/      # Settings & profile
components/
├── ui/               # Reusable UI components
├── workout/          # Workout-specific components
└── nutrition/        # Nutrition-specific components
lib/
├── database.ts       # SQLite operations
└── supabase.ts       # Supabase client
stores/               # Zustand state management
types/                # TypeScript definitions
constants/            # Theme, exercises data
```

## Development

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Type check
npm run typecheck
```

## MVP Status

### Complete
- [x] Project setup & architecture
- [x] User authentication (offline + Supabase)
- [x] Exercise library (40+ exercises)
- [x] Workout template builder
- [x] Workout logging with rest timer
- [x] Nutrition tracking (quick add)
- [x] Water logging
- [x] TDEE calculator
- [x] Profile & settings

### In Progress
- [ ] Workout history analytics
- [ ] Exercise search improvements
- [ ] Meal templates

### Planned (V2)
- [ ] AI program generation (Claude API)
- [ ] Food database (USDA API)
- [ ] Barcode scanning
- [ ] Progress charts
- [ ] Export data

## Design Principles

1. **Speed First**: <3 taps to log a set
2. **Offline Works**: Full functionality without internet
3. **No Gimmicks**: Focus on progress, not engagement tricks
4. **Dark Mode**: Default dark theme for gym use

## License

MIT
