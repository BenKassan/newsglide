# NewsGlide Project Analysis

## Current Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (BaaS)
- **State Management**: React Context + React Query (TanStack Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **AI Integration**: OpenAI API
- **Payment**: Stripe (via Supabase functions)

## Current Structure Issues

### 1. **Hardcoded Credentials**

- Supabase credentials are hardcoded in `src/integrations/supabase/client.ts`
- No environment variable usage

### 2. **Flat Component Structure**

- All UI components in one directory (`src/components/ui/`)
- Mixed feature components with UI primitives

### 3. **Unclear Feature Boundaries**

- Services spread across different directories
- No clear separation between features

### 4. **Missing Development Tools**

- No TypeScript path aliases
- No pre-commit hooks
- No code formatting config (Prettier)

### 5. **Supabase Functions**

- Edge functions in separate directory
- Might benefit from being closer to related frontend code

## Recommended Structure

```
fact-fuse-news-forge/
├── .env.example              # Environment variables template
├── .eslintrc.json           # ESLint configuration
├── .prettierrc              # Prettier configuration
├── README.md                # Updated documentation
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
├── src/
│   ├── app/                 # App-level components
│   │   ├── App.tsx
│   │   ├── Routes.tsx
│   │   └── Providers.tsx
│   ├── features/            # Feature-based organization
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── articles/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── debates/
│   │   ├── subscription/
│   │   └── search/
│   ├── shared/              # Shared resources
│   │   ├── components/      # Reusable components
│   │   ├── hooks/          # Shared hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # Shared types
│   ├── lib/                # External library configs
│   │   ├── supabase/
│   │   ├── openai/
│   │   └── stripe/
│   ├── ui/                 # Design system components
│   │   └── [shadcn components]
│   ├── styles/
│   │   └── globals.css
│   └── main.tsx
└── supabase/               # Supabase backend
    ├── functions/
    └── migrations/
```

## Environment Variables Needed

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# OpenAI
VITE_OPENAI_API_KEY=

# Stripe
VITE_STRIPE_PUBLIC_KEY=

# App Config
VITE_APP_URL=
```

## Migration Steps

1. Create environment configuration
2. Set up feature-based structure
3. Move components to appropriate features
4. Update import paths
5. Add development tooling
6. Test everything works
