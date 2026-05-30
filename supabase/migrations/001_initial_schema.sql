-- Construction Cost Estimator - Supabase Database Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor > New Query)

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Authenticated users can view profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  size NUMERIC,
  size_unit TEXT,
  location TEXT,
  duration NUMERIC,
  duration_unit TEXT,
  client_requirements TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view entire network projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- COST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'additional')),
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  unit_price NUMERIC,
  workers NUMERIC,
  daily_rate NUMERIC,
  days NUMERIC,
  rental_cost NUMERIC,
  maintenance NUMERIC,
  fuel NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own cost items" ON cost_items FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = cost_items.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view entire network cost items" ON cost_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- RISKS
-- ============================================================
CREATE TABLE IF NOT EXISTS risks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  probability NUMERIC DEFAULT 25 CHECK (probability >= 0 AND probability <= 100),
  impact NUMERIC DEFAULT 0,
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own risks" ON risks FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = risks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view entire network risks" ON risks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- FINANCIAL SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overhead_pct NUMERIC DEFAULT 10,
  contingency_pct NUMERIC DEFAULT 5,
  markup_pct NUMERIC DEFAULT 15,
  tax_pct NUMERIC DEFAULT 5,
  currency TEXT DEFAULT 'USD'
);

ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own financial settings" ON financial_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = financial_settings.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view entire network financial settings" ON financial_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PROJECT VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own versions" ON project_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_versions.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view entire network versions" ON project_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- SHARED PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shared_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read shared projects" ON shared_projects FOR SELECT USING (true);
CREATE POLICY "Owners can manage shared projects" ON shared_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE id = shared_projects.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view entire network shared projects" ON shared_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PROJECT COLLABORATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collaborators can view" ON project_collaborators FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM projects WHERE id = project_collaborators.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage entire network collaborators" ON project_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'assemblies')),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own resources" ON resources FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- COST DATABASES
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_databases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'USD',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cost_databases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own databases" ON cost_databases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public databases" ON cost_databases FOR SELECT USING (is_public = true);

-- ============================================================
-- AUDIT LOGS (Admin only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can insert their own audit logs" ON audit_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- ============================================================
-- APP SETTINGS (Admin only)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view app settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage app settings" ON app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- TRIGGERS: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED: Default cost database
-- ============================================================
-- INSERT INTO cost_databases (user_id, name, description, currency, is_public)
-- VALUES ('YOUR_ADMIN_USER_ID', 'Default', 'Default Cost Database - قاعدة بيانات التكلفة الافتراضية', 'USD', true);
