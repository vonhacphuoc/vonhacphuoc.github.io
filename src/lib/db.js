import { supabase, getDeviceId } from './supabase';

// ─── USER PROJECTS ──────────────────────────────────────────

/** Lấy tất cả dự án tự tạo của thiết bị này */
export async function fetchUserProjects() {
  const { data, error } = await supabase
    .from('user_projects')
    .select('*')
    .eq('device_id', getDeviceId())
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchUserProjects:', error); return []; }
  // Chuyển từ snake_case Supabase → camelCase app
  return data.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    image: row.image,
    icon: row.icon,
    data: row.data,
    isUserCreated: true,
  }));
}

/** Lưu (thêm mới hoặc cập nhật) một dự án */
export async function upsertUserProject(project) {
  const { error } = await supabase
    .from('user_projects')
    .upsert({
      id: project.id,
      device_id: getDeviceId(),
      title: project.title,
      description: project.description || '',
      image: project.image || '',
      icon: project.icon || 'category',
      data: project.data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) console.error('upsertUserProject:', error);
}

/** Xoá một dự án */
export async function deleteUserProject(projectId) {
  const { error } = await supabase
    .from('user_projects')
    .delete()
    .eq('id', projectId)
    .eq('device_id', getDeviceId());
  if (error) console.error('deleteUserProject:', error);
}

// ─── PROGRESS ───────────────────────────────────────────────

/** Lấy toàn bộ tiến độ của thiết bị này */
export async function fetchProgress() {
  const { data, error } = await supabase
    .from('progress')
    .select('project_id, completed_ids')
    .eq('device_id', getDeviceId());
  if (error) { console.error('fetchProgress:', error); return {}; }
  // Chuyển thành object: { projectId: [id1, id2, ...] }
  return Object.fromEntries(data.map(r => [r.project_id, r.completed_ids]));
}

/** Lưu tiến độ của một dự án */
export async function upsertProgress(projectId, completedIds) {
  const { error } = await supabase
    .from('progress')
    .upsert({
      device_id: getDeviceId(),
      project_id: projectId,
      completed_ids: completedIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id,project_id' });
  if (error) console.error('upsertProgress:', error);
}

/** Xoá tiến độ của một dự án (khi xoá project) */
export async function deleteProgress(projectId) {
  const { error } = await supabase
    .from('progress')
    .delete()
    .eq('device_id', getDeviceId())
    .eq('project_id', projectId);
  if (error) console.error('deleteProgress:', error);
}
