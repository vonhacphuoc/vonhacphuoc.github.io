import { useState } from 'react';

const ICON_OPTIONS = [
  { value: 'pets', label: 'Thú cưng' },
  { value: 'emoji_nature', label: 'Bạch tuộc / Thiên nhiên' },
  { value: 'restaurant', label: 'Đĩa / Bát' },
  { value: 'checkroom', label: 'Khăn / Quần áo' },
  { value: 'layers', label: 'Lớp / Khối' },
  { value: 'waves', label: 'Sóng / Vặn thừng' },
  { value: 'star', label: 'Ngôi sao' },
  { value: 'favorite', label: 'Trái tim' },
  { value: 'toys', label: 'Đồ chơi' },
  { value: 'palette', label: 'Nghệ thuật' },
  { value: 'auto_awesome', label: 'Đặc biệt' },
  { value: 'category', label: 'Khác' },
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function AddProjectModal({ onClose, onSave, editingProject }) {
  const isEdit = !!editingProject;

  const [title, setTitle] = useState(editingProject?.title || '');
  const [description, setDescription] = useState(editingProject?.description || '');
  const [imageUrl, setImageUrl] = useState(editingProject?.image || '');
  const [icon, setIcon] = useState(editingProject?.icon || 'category');
  const [rows, setRows] = useState(
    editingProject?.data?.map((r, i) => ({ ...r, _key: i })) ||
    [{ _key: 0, part: '', row: 'R1', formula: '' }]
  );
  const [errors, setErrors] = useState({});

  const addRow = () => {
    setRows(prev => [...prev, { _key: Date.now(), part: '', row: '', formula: '' }]);
  };

  const removeRow = (key) => {
    setRows(prev => prev.filter(r => r._key !== key));
  };

  const updateRow = (key, field, value) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Vui lòng nhập tên mẫu';
    if (rows.length === 0) e.rows = 'Vui lòng thêm ít nhất 1 hàng';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const slug = slugify(title);
    const id = editingProject?.id || `user_${slug}_${Date.now()}`;
    const processedRows = rows.map((r, i) => ({
      id: r.id || `${id}_row_${i}`,
      part: r.part || '',
      row: r.row || '',
      formula: r.formula || '',
    }));
    onSave({
      id,
      title: title.trim(),
      description: description.trim(),
      image: imageUrl.trim(),
      icon,
      isUserCreated: true,
      data: processedRows,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full md:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-2xl md:rounded-2xl border border-outline-variant/30 overflow-hidden"
        style={{ background: 'var(--color-surface-container-low)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isEdit ? 'edit_note' : 'add_circle'}
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              {isEdit ? 'Chỉnh sửa mẫu' : 'Thêm mẫu mới'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-variant/50 text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">

          {/* Tên mẫu */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">
              Tên mẫu <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Thỏ Amigurumi"
              className={`w-full px-4 py-2.5 rounded-xl border font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-primary ${errors.title ? 'border-error' : 'border-outline-variant/50'}`}
            />
            {errors.title && <p className="mt-1 font-label-sm text-label-sm text-error">{errors.title}</p>}
          </div>

          {/* Mô tả */}
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">Mô tả</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về mẫu móc..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-primary resize-none"
            />
          </div>

          {/* Ảnh URL + Icon cùng hàng */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">URL ảnh bìa</label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">Icon</label>
              <select
                value={icon}
                onChange={e => setIcon(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-primary cursor-pointer"
              >
                {ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview ảnh */}
          {imageUrl && (
            <div className="w-full h-36 rounded-xl overflow-hidden border border-outline-variant/30">
              <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
            </div>
          )}

          {/* Chart Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-label-md text-label-md text-on-surface-variant">
                Bảng chart <span className="text-error">*</span>
              </label>
              <span className="font-label-sm text-label-sm text-on-surface-variant/60">
                {rows.length} hàng
              </span>
            </div>

            {errors.rows && <p className="mb-2 font-label-sm text-label-sm text-error">{errors.rows}</p>}

            {/* Table header - ẩn trên mobile */}
            <div className="hidden md:grid gap-2 mb-2 px-1" style={{ gridTemplateColumns: '1fr 80px 1fr 32px' }}>
              <span className="font-label-sm text-label-sm text-on-surface-variant/60">Phần</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant/60">Hàng</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant/60">Công thức</span>
              <span></span>
            </div>

            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div key={row._key}>
                  {/* Mobile layout: 2 dòng */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-outline-variant/20 md:hidden bg-surface-container-lowest/40">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={row.part}
                        onChange={e => updateRow(row._key, 'part', e.target.value)}
                        placeholder={idx === 0 ? 'Phần (VD: Thân)' : 'Phần'}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none focus:border-primary text-sm"
                      />
                      <input
                        type="text"
                        value={row.row}
                        onChange={e => updateRow(row._key, 'row', e.target.value)}
                        placeholder="Hàng"
                        className="w-20 flex-shrink-0 px-3 py-2 rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={row.formula}
                        onChange={e => updateRow(row._key, 'formula', e.target.value)}
                        placeholder="Công thức (VD: MR(6X))"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none focus:border-primary text-sm"
                      />
                      <button
                        onClick={() => removeRow(row._key)}
                        disabled={rows.length <= 1}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-error/10 text-on-surface-variant/50 hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                      </button>
                    </div>
                  </div>

                  {/* Desktop layout: 1 dòng ngang */}
                  <div className="hidden md:grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 80px 1fr 32px' }}>
                    <input
                      type="text"
                      value={row.part}
                      onChange={e => updateRow(row._key, 'part', e.target.value)}
                      placeholder={idx === 0 ? 'VD: Thân' : ''}
                      className="px-3 py-2 rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none focus:border-primary text-sm"
                    />
                    <input
                      type="text"
                      value={row.row}
                      onChange={e => updateRow(row._key, 'row', e.target.value)}
                      placeholder="R1"
                      className="px-3 py-2 rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none focus:border-primary text-sm"
                    />
                    <input
                      type="text"
                      value={row.formula}
                      onChange={e => updateRow(row._key, 'formula', e.target.value)}
                      placeholder="VD: MR(6X)"
                      className="px-3 py-2 rounded-lg border border-outline-variant/40 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none focus:border-primary text-sm"
                    />
                    <button
                      onClick={() => removeRow(row._key)}
                      disabled={rows.length <= 1}
                      className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-error/10 text-on-surface-variant/50 hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Nút thêm hàng */}
            <button
              onClick={addRow}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors font-label-md text-label-md w-full justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Thêm hàng
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/30 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/50 font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-primary font-label-md text-label-md text-on-primary hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo mẫu'}
          </button>
        </div>
      </div>
    </div>
  );
}
