# Construction Cost Estimator

A professional, full-stack web application designed for contractors, engineers, and construction firms to seamlessly estimate project costs, manage resources, mitigate risks, and generate client-ready PDF proposals.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI Primitives, Lucide Icons
- **State Management**: Zustand
- **Backend/Database**: Supabase (PostgreSQL, Authentication)
- **Deployment**: Progressive Web App (PWA) supported

---

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### 1. Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account (for the database backend)

### 2. Installation

Clone the repository and install the dependencies:

```bash
# Clone the repository
git clone https://github.com/ArunSadalgekar07/civil-cost-estimation.git

# Navigate into the project directory
cd civil-cost-estimation

# Install node modules
npm install
```

### 3. Environment Setup

The application relies on Supabase for data and authentication. You need to link your local code to your Supabase project.

1. Create a new project on [Supabase](https://supabase.com/).
2. In the root folder of this codebase, create a file named `.env`
3. Add your specific Supabase credentials into the `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-long-anon-key-here
```
*(You can find these keys in your Supabase Dashboard under Settings > API)*

### 4. Database Setup

You must initialize the database tables before running the app.
Navigate to the **SQL Editor** in your Supabase dashboard and run the entire SQL script located at:
`supabase/migrations/001_initial_schema.sql`

This will automatically configure all your required tables (projects, profiles, cost_items, risks, notifications, etc.).

### 5. Run the Development Server

Start the local vite server:
```bash
npm run dev
```
The application will launch locally (usually at `http://localhost:5173`). Open that URL in your browser to start estimating!

---

## 🏗️ Building for Production

If you want to compile the project for deployment (e.g., to Vercel, Netlify, or Hostinger):
```bash
npm run build
```
This generates an optimized /dist folder containing the minified PWA bundle.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request.
