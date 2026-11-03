/*
  # OgaDesigner - Core Tables

  ## Overview
  Creates the two main tables for the OgaDesigner SaaS application.

  ## New Tables

  ### users
  - `id` (uuid, PK) - Internal user ID
  - `clerk_id` (text, unique) - Clerk authentication user ID
  - `email` (text) - User email address
  - `phone` (text) - Nigerian phone number
  - `plan` (text) - Current subscription plan: 'starter' | 'hustler' | 'boss' | 'none'
  - `credits_left` (int) - Remaining credits
  - `total_credits` (int) - Total credits purchased in current cycle
  - `month_reset_date` (timestamptz) - When credits reset (30 days from purchase)
  - `paystack_customer_code` (text) - Paystack customer reference
  - `created_at` (timestamptz)

  ### generations
  - `id` (uuid, PK)
  - `user_id` (uuid, FK -> users.id)
  - `prompt` (text) - Full prompt sent to Ideogram
  - `image_url` (text) - Returned image URL
  - `design_type` (text) - Logo | Flyer | Social Post | Business Card
  - `business_name` (text)
  - `credits_used` (int) - Always 1
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Users can only read/update their own row (matched by clerk_id stored in JWT metadata)
  - Generations readable by owner via user_id join
  - Service role bypasses RLS for backend API calls

  ## Notes
  - Backend API uses service role key, bypassing RLS
  - Clerk JWT custom claims must include `clerk_id` mapped to `sub` claim
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text,
  phone text,
  plan text NOT NULL DEFAULT 'none',
  credits_left int NOT NULL DEFAULT 0,
  total_credits int NOT NULL DEFAULT 0,
  month_reset_date timestamptz,
  paystack_customer_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_url text NOT NULL,
  design_type text NOT NULL DEFAULT 'Logo',
  business_name text NOT NULL DEFAULT '',
  credits_used int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (clerk_id = (auth.jwt() ->> 'sub'));

-- Users can update their own row (for non-sensitive fields)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (clerk_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- Users can insert their own row (on signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- Users can read their own generations
CREATE POLICY "Users can read own generations"
  ON generations FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Users can insert their own generations
CREATE POLICY "Users can insert own generations"
  ON generations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_users_month_reset_date ON users(month_reset_date);
