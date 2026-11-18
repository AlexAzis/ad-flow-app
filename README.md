# Ad Flow - Advertising Production Workflow

A Next.js web application for managing advertising production workflows with schedule visualization and team collaboration features.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Authentication and database storage
- **Lucide React** - Icon library
- **date-fns** - Date manipulation utilities

## Features

- Interactive schedule dashboard with multiple view modes
- Campaign and event management
- Stage-based workflow tracking
- Team member assignment
- Filter sidebar for campaigns, stages, and people
- Responsive design
- Real-time timeline visualization

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase project (for authentication and database)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ad-flow-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ad-flow-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── layout/            # Layout components
│   │   │   ├── Navigation.tsx # Top navigation bar
│   │   │   └── Sidebar.tsx    # Filters sidebar
│   │   └── dashboard/
│   │       └── ScheduleView.tsx # Main schedule view
│   └── lib/
│       ├── types.ts           # TypeScript type definitions
│       ├── mockData.ts        # Mock data for development
│       └── supabase.ts        # Supabase client configuration
├── public/                    # Static assets
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Create the following tables in your Supabase database:

### campaigns table
```sql
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### events table
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assignee_id UUID,
  color TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### stages table
```sql
CREATE TABLE stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### people table
```sql
CREATE TABLE people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

3. Enable Row Level Security (RLS) and create policies as needed for your authentication setup.

## Development

The application currently uses mock data for development. To integrate with Supabase:

1. Replace mock data imports in `src/app/page.tsx` with Supabase queries
2. Implement authentication using Supabase Auth
3. Add real-time subscriptions for live updates
4. Implement CRUD operations for campaigns, events, and people

## View Modes

The schedule view supports multiple visualization modes:
- **Daily** - Single day view
- **6-Column** - 6-day grid view
- **12-Column** - 12-day grid view
- **Vertical** - Vertical timeline
- **Gantt** - Gantt chart view
- **Topline** - High-level overview
- **People** - Resource allocation by team members

## License

MIT
