-- 1. Tạo bảng profiles trong public schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thay thế Check Constraint để hỗ trợ cả 3 role (admin, editor, viewer)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'editor', 'viewer'));

-- 2. Bật Row Level Security (RLS) cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tạo policy cho phép tất cả mọi người đã đăng nhập (authenticated) được đọc thông tin role
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 4. Tạo function để tự động thêm dòng vào public.profiles khi có user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Tạo trigger gọi function trên sau khi thêm user mới vào auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Điền profile mặc định cho các users đã tồn tại sẵn trong auth.users
INSERT INTO public.profiles (id, role)
SELECT id, 'viewer' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 7. HƯỚNG DẪN THAY ĐỔI ROLE CỦA USER:
-- Thay thế 'UUID_CỦA_USER' bằng ID thực tế của user trong bảng auth.users hoặc tab Authentication trên Supabase Dashboard.
--
-- Để gán quyền Admin:
-- INSERT INTO public.profiles (id, role) VALUES ('UUID_CỦA_USER', 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin';
--
-- Để gán quyền Editor:
-- INSERT INTO public.profiles (id, role) VALUES ('UUID_CỦA_USER', 'editor') ON CONFLICT (id) DO UPDATE SET role = 'editor';
--
-- Để gán quyền Viewer:
-- INSERT INTO public.profiles (id, role) VALUES ('UUID_CỦA_USER', 'viewer') ON CONFLICT (id) DO UPDATE SET role = 'viewer';
