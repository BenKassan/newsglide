# NewsGlide - AI-Powered News Synthesis Platform

## Overview

NewsGlide is a modern news aggregation and synthesis platform that uses AI to provide personalized news analysis, debates, and insights. Built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **AI**: OpenAI GPT-4, ElevenLabs TTS
- **State Management**: React Context + TanStack Query
- **Payment**: Stripe

## Project Structure

```
src/
├── app/                    # Application core
│   ├── App.tsx            # Main app component
│   └── Routes.tsx         # Route definitions
├── features/              # Feature-based modules
│   ├── auth/             # Authentication
│   ├── articles/         # Article management
│   ├── debates/          # AI debates
│   ├── news-synthesis/   # News synthesis
│   ├── search/           # Search functionality
│   └── subscription/     # Subscription management
├── shared/               # Shared resources
│   ├── components/       # Reusable components
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utility functions
│   └── types/           # Shared TypeScript types
├── ui/                   # Design system components
├── lib/                  # External library configs
│   ├── env.ts           # Environment validation
│   └── supabase/        # Supabase configuration
├── pages/               # Page components
└── styles/              # Global styles
```

## Getting Started

### Prerequisites

- Node.js 20+ (check `.nvmrc`)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/BenKassan/fact-fuse-news-forge.git
cd fact-fuse-news-forge

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your environment variables to .env.local
```

### Environment Variables

Create a `.env.local` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ELEVEN_LABS_VOICE_ID=your_voice_id (optional)
```

### Development

```bash
# Start development server
npm run dev

# Start fresh (kills existing servers first)
npm run dev:clean

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck

# Build for production
npm run build
```

### Port Management

The dev server runs on **port 3000**. If you encounter port issues:

```bash
# Check which ports are in use
npm run ports:check

# Kill all dev servers on common ports
npm run ports:kill

# Kill only Vite processes
npm run ports:clean

# Show all NewsGlide project directories
npm run ports:projects
```

**Important**: Always use this directory (`NewsGlide Sep 2025`) for development. Other NewsGlide directories may exist but are outdated.

See [PORT-MANAGEMENT.md](./PORT-MANAGEMENT.md) for detailed troubleshooting.

## Features

- 🔍 **Smart News Search**: AI-powered news aggregation from multiple sources
- 🤖 **AI Analysis**: Get news explained at different complexity levels
- 🎭 **AI Debates**: Watch AI personas debate current topics
- 🎙️ **Voice Narration**: Morgan Freeman voice synthesis
- 💾 **Save Articles**: Save and organize articles for later
- 📊 **Search History**: Track your search patterns
- 💳 **Subscription**: Premium features with Stripe integration

## Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier with consistent code style
- **Git Hooks**: Husky + lint-staged for pre-commit checks
- **Type Safety**: Strict TypeScript configuration
- **Path Aliases**: Clean imports with @features, @shared, etc.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits (`feat: add amazing feature`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions/changes
- `chore:` Build process or auxiliary tool changes

## Security

- Environment variables for sensitive data
- No hardcoded credentials
- Regular dependency updates
- See `SECURITY.md` for SSH key setup

## License

Private repository - All rights reserved

## Support

For issues and feature requests, please use the GitHub issues tab.
