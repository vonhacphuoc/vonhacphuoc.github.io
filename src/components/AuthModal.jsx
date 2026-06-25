import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) {
      setErrorMsg(error.message === 'Invalid login credentials' 
        ? 'Tài khoản hoặc mật khẩu không chính xác.' 
        : error.message
      );
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-250 border border-outline-variant/30">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-variant/50">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              admin_panel_settings
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Đăng nhập Admin</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-variant/50 text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-5">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Vui lòng đăng nhập bằng tài khoản admin để mở khoá tính năng tạo, chỉnh sửa và xoá chart móc len.
          </p>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex gap-2.5 text-error">
              <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">error</span>
              <p className="font-label-md text-label-md">{errorMsg}</p>
            </div>
          )}

          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="VD: admin@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-primary"
            />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 font-body-md text-body-md text-on-surface bg-surface-container-lowest outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
