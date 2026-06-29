import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tạo device_id duy nhất cho mỗi trình duyệt (thay cho user auth)
export function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

/**
 * Lấy role của user từ bảng public.profiles.
 * Trả về: 'editor' | 'viewer' | null
 */
export async function fetchUserRole(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) { console.warn('fetchUserRole:', error.message); return 'viewer'; }
  const role = data?.role;
  if (role === 'admin') return 'admin';
  if (role === 'editor') return 'editor';
  return 'viewer';
}

