import { useState, useMemo, useEffect, useCallback } from 'react';
import { projects } from './data/projects';
import { glossary } from './data/glossary';
import { AddProjectModal } from './components/AddProjectModal';
import { AuthModal } from './components/AuthModal';
import { supabase, fetchUserRole } from './lib/supabase';
import {
  fetchUserProjects, upsertUserProject, deleteUserProject,
  fetchProgress, upsertProgress, deleteProgress
} from './lib/db';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState(() => {
    const saved = localStorage.getItem('crochet_currentView');
    return saved || 'projects';
  });
  const [activeProjectId, setActiveProjectId] = useState(() => {
    const saved = localStorage.getItem('crochet_activeProjectId');
    return saved || null;
  });

  // Auth & Role State
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 'editor' | 'viewer' | null — lấy từ bảng public.profiles
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserRole(user.id).then(setUserRole);
    } else {
      setUserRole(null);
    }
  }, [user]);

  // User-created projects — load từ Supabase
  const [userProjects, setUserProjects] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);

  const allProjects = useMemo(() => {
    const userProjectIds = new Set(userProjects.map(p => p.id));
    const filteredStatic = projects.filter(p => !userProjectIds.has(p.id));
    return [...filteredStatic, ...userProjects];
  }, [userProjects]);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Lắng nghe trạng thái đăng nhập từ Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tải dữ liệu từ Supabase khi app khởi động
  useEffect(() => {
    async function loadFromDB() {
      setDbLoading(true);
      const [dbProjects, dbProgress] = await Promise.all([
        fetchUserProjects(),
        fetchProgress(),
      ]);
      setUserProjects(dbProjects);
      setProgress(dbProgress);
      setDbLoading(false);
    }
    loadFromDB();
  }, []);

  const handleSaveProject = async (projectData) => {
    await upsertUserProject(projectData, user?.id);
    setUserProjects(prev => {
      const exists = prev.findIndex(p => p.id === projectData.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = projectData;
        return updated;
      }
      return [...prev, projectData];
    });
    setShowAddModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Xoá mẫu này? Tiến độ cũng sẽ bị xoá.')) return;
    await Promise.all([deleteUserProject(projectId, user?.id), deleteProgress(projectId)]);
    setUserProjects(prev => prev.filter(p => p.id !== projectId));
    setProgress(prev => { const n = { ...prev }; delete n[projectId]; return n; });
  };

  const openEditModal = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowAddModal(true);
  };

  useEffect(() => {
    localStorage.setItem('crochet_currentView', currentView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('crochet_activeProjectId', activeProjectId);
    } else {
      localStorage.removeItem('crochet_activeProjectId');
    }
  }, [activeProjectId]);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Progress state — khởi tạo rỗng, sẽ được fill bởi Supabase fetch
  const [progress, setProgress] = useState({});

  // Handle active project
  const activeProject = useMemo(() => {
    return allProjects.find(p => p.id === activeProjectId) || null;
  }, [activeProjectId, allProjects]);

  const toggleRow = useCallback((projectId, rowId) => {
    setProgress(prev => {
      const projectProgress = prev[projectId] || [];
      const newIds = projectProgress.includes(rowId)
        ? projectProgress.filter(id => id !== rowId)
        : [...projectProgress, rowId];
      const updated = { ...prev, [projectId]: newIds };
      // Sync Supabase (fire-and-forget)
      upsertProgress(projectId, updated[projectId]);
      return updated;
    });
  }, []);

  // State lưu trạng thái mở/đóng của các hàng range (R8-R14)
  const [expandedRanges, setExpandedRanges] = useState({});

  const toggleExpandRange = (itemId) => {
    setExpandedRanges(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Parse dạng "R8-R14" hoặc "H4-H150" → { prefix, start, end }
  const parseRowRange = (rowStr) => {
    if (!rowStr) return null;
    const match = rowStr.match(/^([A-Za-z]+)(\d+)[\-–]([A-Za-z]*)?(\d+)$/);
    if (!match) return null;
    const prefix = match[1];
    const start = parseInt(match[2]);
    const end = parseInt(match[4]);
    if (isNaN(start) || isNaN(end) || end <= start || end - start > 200) return null;
    return { prefix, start, end };
  };

  const resetAll = (projectId) => {
    if(window.confirm('Bạn có chắc chắn muốn reset toàn bộ tiến trình đánh dấu của mẫu này?')) {
      setProgress(prev => ({ ...prev, [projectId]: [] }));
    }
  };

  // Group data by part for Pattern Detail
  const groupedData = useMemo(() => {
    if (!activeProject) return [];
    const groups = [];
    let currentGroup = null;
    let groupIndex = 0;

    activeProject.data.forEach((item) => {
      if (item.part && item.part.trim() !== '') {
        currentGroup = {
          id: `group-${groupIndex++}`,
          title: item.part,
          items: [item]
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        currentGroup.items.push(item);
      }
    });
    return groups;
  }, [activeProject]);

  const getGroupIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('đĩa')) return 'restaurant';
    if (t.includes('lót')) return 'layers';
    if (t.includes('chân')) return 'support';
    if (t.includes('tai')) return 'pets';
    if (t.includes('thân')) return 'body_system';
    if (t.includes('mắt')) return 'visibility';
    if (t.includes('viền')) return 'border_outer';
    if (t.includes('khăn')) return 'checkroom';
    return 'category';
  };

  const renderProjectsView = () => (
    <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop mt-8 mb-24">
      <div className="mb-12">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Dự án của tôi</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
          Chọn một mẫu móc len để bắt đầu theo dõi tiến độ của bạn.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {allProjects.map(project => {
          const completedCount = (progress[project.id] || []).length;
          const totalCount = project.data.length;
          const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
          const isUser = !!project.isUserCreated;

          return (
            <div
              key={project.id}
              className="pattern-card rounded-xl border border-outline-variant/30 flex flex-col overflow-hidden cursor-pointer relative group/card"
              onClick={() => { setActiveProjectId(project.id); setCurrentView('pattern'); }}
            >
              {/* Ảnh bìa */}
              <div className="h-48 w-full bg-surface-variant overflow-hidden">
                {project.image
                  ? <img src={project.image} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant/30 text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>{project.icon}</span>
                    </div>
                }
              </div>

              {/* Nút sửa/xóa chỉ hiện với Editor hoặc Admin */}
              {isUser && (userRole === 'admin' || userRole === 'editor') && (
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => openEditModal(e, project)}
                    className="p-1.5 rounded-full bg-surface/80 backdrop-blur-sm text-on-surface-variant hover:text-primary hover:bg-surface transition-colors shadow-sm"
                    title="Chỉnh sửa"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                    className="p-1.5 rounded-full bg-surface/80 backdrop-blur-sm text-on-surface-variant hover:text-error hover:bg-surface transition-colors shadow-sm"
                    title="Xoá"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              )}

              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {project.icon}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{project.title}</h3>
                  {isUser && (
                    <span className="ml-auto text-[10px] font-label-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">Tự tạo</span>
                  )}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-2">
                  {project.description || 'Mẫu tự tạo'}
                </p>
                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-label-md text-label-md text-primary">Tiến độ</span>
                    <span className="font-label-md text-label-md text-primary font-semibold">{percent}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Card Thêm mới - Chỉ hiện với Editor hoặc Admin */}
        {(userRole === 'admin' || userRole === 'editor') && (
          <button
            onClick={() => { setEditingProject(null); setShowAddModal(true); }}
            className="pattern-card rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-3 min-h-[280px] cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-primary text-[28px]">add</span>
            </div>
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-primary">Thêm mẫu mới</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant/60 mt-1">Tự tạo chart của bạn</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  const renderPatternView = () => {
    if (!activeProject) return null;
    const completedCount = (progress[activeProject.id] || []).length;
    const totalCount = activeProject.data.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
      <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop mt-8 mb-24">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start w-full lg:max-w-3xl">
              {activeProject.image && (
                <div className="w-full sm:w-48 h-48 rounded-xl overflow-hidden bg-surface-variant flex-shrink-0 border border-outline-variant/30 shadow-md">
                  <img 
                    src={activeProject.image} 
                    alt={activeProject.title} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                  />
                </div>
              )}
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2 cursor-pointer hover:text-primary transition-colors text-on-surface-variant print:hidden" onClick={() => setCurrentView('projects')}>
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span className="font-label-md text-label-md">Quay lại</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">{activeProject.title}</h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                  {activeProject.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/95 transition-all shadow-sm active:scale-95 duration-150 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] print-icon">picture_as_pdf</span>
                    <span>Xuất PDF (In)</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const { exportToDocx } = await import('./lib/exportDocx');
                        await exportToDocx(activeProject, glossary);
                      } catch (err) {
                        console.error('Lỗi khi xuất Word:', err);
                        alert('Có lỗi xảy ra khi xuất file Word.');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-variant text-on-surface-variant border border-outline-variant/30 font-label-md text-label-md hover:bg-surface-variant/80 transition-all shadow-sm active:scale-95 duration-150 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] print-icon">description</span>
                    <span>Xuất Word (.docx)</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-surface-container-low p-6 rounded-xl flex-shrink-0 w-full lg:w-80 relative">
              <button 
                onClick={() => resetAll(activeProject.id)} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-variant/50 text-on-surface-variant transition-colors"
                title="Reset toàn bộ tiến độ"
              >
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
              <div className="flex justify-between items-center mb-4 pr-10">
                <span className="font-label-md text-label-md text-primary">TIẾN ĐỘ TỔNG THỂ</span>
                <span className="font-headline-sm text-headline-sm text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary-container" style={{ width: `${progressPercent}%`, transition: 'width 0.5s ease-in-out' }}></div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {completedCount} trên {totalCount} hàng đã hoàn thành
              </p>
            </div>
          </div>
          
          {/* Note Ký hiệu tương đương */}
          {(() => {
            const usedSymbols = glossary.filter(term => {
              const symbols = term.symbol.split('/');
              return activeProject.data.some(row => 
                symbols.some(sym => row.formula && row.formula.includes(sym))
              );
            });
            
            if (usedSymbols.length === 0) return null;
            
            return (
              <div className="bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                  <h3 className="font-label-md text-label-md text-on-surface">Ghi chú ký hiệu (Tương đương)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {usedSymbols.map(term => (
                    <span key={term.symbol} className="px-3 py-1.5 bg-surface-container-lowest rounded-md font-label-sm text-label-sm text-on-surface border border-outline-variant/50 shadow-sm">
                      <strong className="text-primary">{term.symbol}</strong>: {term.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-16">
          {groupedData.map(group => (
            <div key={group.id} className="pattern-card p-6 rounded-xl border border-outline-variant/30 flex flex-col max-h-80 md:h-[500px]">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {getGroupIcon(group.title)}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{group.title}</h3>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {group.items.map((item) => {
                  const isCompleted = (progress[activeProject.id] || []).includes(item.id);
                  const range = parseRowRange(item.row);
                  const isExpanded = expandedRanges[item.id];

                  if (range) {
                    // Tạo danh sách sub-rows
                    const subRows = [];
                    for (let i = range.start; i <= range.end; i++) {
                      subRows.push({ id: `${item.id}_sub_${i}`, label: `${range.prefix}${i}` });
                    }
                    const completedSubs = subRows.filter(sr => (progress[activeProject.id] || []).includes(sr.id));
                    const allSubsDone = completedSubs.length === subRows.length;
                    const someDone = completedSubs.length > 0 && !allSubsDone;

                    return (
                      <div key={item.id} className="py-1">
                        {/* Header row range */}
                        <div className="flex items-start gap-4 group">
                          <span
                            className={`material-symbols-outlined mt-0.5 flex-shrink-0 text-[20px] transition-colors ${
                              allSubsDone ? 'text-primary' : someDone ? 'text-primary/50' : 'text-outline-variant'
                            }`}
                            style={allSubsDone ? { fontVariationSettings: "'FILL' 1" } : {}}
                          >
                            {allSubsDone ? 'check_circle' : someDone ? 'indeterminate_check_box' : 'radio_button_unchecked'}
                          </span>
                          <div className="flex flex-col flex-grow">
                            <span className={`font-body-md text-body-md transition-colors ${
                              allSubsDone ? 'text-outline-variant line-through' : 'text-on-surface-variant'
                            }`}>
                              <span className="font-semibold">{item.row}: </span>{item.formula}
                            </span>
                            {someDone && (
                              <span className="font-label-sm text-label-sm text-primary/70">
                                {completedSubs.length}/{subRows.length} hàng
                              </span>
                            )}
                          </div>
                          {/* Nút xổ */}
                          <button
                            onClick={() => toggleExpandRange(item.id)}
                            className="ml-auto flex-shrink-0 p-1 rounded-full hover:bg-surface-variant/40 text-on-surface-variant transition-all"
                            title={isExpanded ? 'Thu gọn' : 'Xổ ra chọn từng hàng'}
                          >
                            <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${ isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                        </div>

                        {/* Sub-rows */}
                        {isExpanded && (
                          <div className="ml-9 mt-2 space-y-1 border-l-2 border-outline-variant/30 pl-3">
                            {subRows.map(sr => {
                              const srDone = (progress[activeProject.id] || []).includes(sr.id);
                              return (
                                <div
                                  key={sr.id}
                                  onClick={() => toggleRow(activeProject.id, sr.id)}
                                  className="flex items-center gap-3 cursor-pointer group py-0.5"
                                >
                                  <span
                                    className={`material-symbols-outlined flex-shrink-0 text-[16px] transition-colors ${
                                      srDone ? 'text-primary' : 'text-outline-variant'
                                    }`}
                                    style={srDone ? { fontVariationSettings: "'FILL' 1" } : {}}
                                  >
                                    {srDone ? 'check_circle' : 'radio_button_unchecked'}
                                  </span>
                                  <span className={`font-label-md text-label-md transition-colors ${
                                    srDone ? 'text-outline-variant line-through' : 'text-on-surface-variant group-hover:text-primary'
                                  }`}>
                                    {sr.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Hàng thường (không phải range)
                  return (
                    <div key={item.id} onClick={() => toggleRow(activeProject.id, item.id)} className="flex items-start gap-4 group cursor-pointer py-1">
                      <span 
                        className={`material-symbols-outlined mt-0.5 flex-shrink-0 ${isCompleted ? 'text-primary' : 'text-outline-variant'} text-[20px] transition-colors`}
                        style={isCompleted ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <div className="flex flex-col">
                        <span className={`font-body-md text-body-md transition-colors ${isCompleted ? 'text-outline-variant line-through' : 'text-on-surface-variant group-hover:text-primary'}`}>
                          <span className="font-semibold">{item.row && `${item.row}: `}</span>{item.formula}
                        </span>
                        {item.note && (
                          <span className={`font-label-sm text-label-sm mt-1 transition-colors ${isCompleted ? 'text-outline-variant/50' : 'text-on-surface-variant/70'}`}>
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLibraryView = () => (
    <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop mt-8 mb-24">
      <div className="mb-12">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Thư viện Ký hiệu</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
          Bảng tra cứu các ký hiệu móc len cơ bản và hướng dẫn cách thực hiện.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {glossary.map((term, idx) => (
          <div key={idx} className="pattern-card p-6 rounded-xl border border-outline-variant/30 flex flex-col">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-surface-variant">
              <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-headline-md font-bold">
                {term.symbol}
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{term.name}</h3>
                <p className="font-label-sm text-label-sm text-primary">Ký hiệu: {term.symbol}</p>
              </div>
            </div>
            <ul className="space-y-3 pl-2">
              {term.instructions.map((inst, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-outline-variant text-[16px] mt-1">fiber_manual_record</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">{inst}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Loading overlay khi fetch Supabase */}
      {dbLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="font-label-md text-label-md text-on-surface-variant">Đang tải dữ liệu...</p>
          </div>
        </div>
      )}

      {/* Modal đăng nhập admin */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Modal thêm/sửa project */}
      {showAddModal && (
        <AddProjectModal
          editingProject={editingProject}
          onClose={() => { setShowAddModal(false); setEditingProject(null); }}
          onSave={handleSaveProject}
        />
      )}

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center w-full px-container-margin-mobile md:px-container-margin-desktop py-4 border-b border-surface-variant/50">
        <div className="flex flex-col">
          <span className="font-headline-md text-headline-md font-semibold text-primary">Nhật ký Móc Len</span>
          <span className="font-label-md text-label-md text-on-surface-variant">
            {currentView === 'projects' ? 'Trang Chủ' : currentView === 'pattern' ? 'Chi tiết mẫu móc' : 'Thư viện Ký hiệu'}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {/* Nút đăng nhập/đăng xuất + badge role */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* Badge role */}
              <span
                className={`hidden md:inline font-label-sm text-label-sm px-2.5 py-1 rounded-full border ${
                  userRole === 'admin'
                    ? 'bg-error/10 text-error border-error/30'
                    : userRole === 'editor'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-surface-variant/40 text-on-surface-variant border-outline-variant/30'
                }`}
              >
                <span className="material-symbols-outlined text-[13px] align-middle mr-1" style={{ fontVariationSettings: (userRole === 'admin' || userRole === 'editor') ? "'FILL' 1" : '' }}>
                  {userRole === 'admin' ? 'shield' : userRole === 'editor' ? 'edit' : 'visibility'}
                </span>
                {userRole === 'admin' ? 'Admin' : userRole === 'editor' ? 'Editor' : 'Viewer'}
              </span>
              <span className="hidden md:inline font-label-md text-label-md text-on-surface-variant bg-surface-variant/30 px-3 py-1.5 rounded-full border border-outline-variant/30 max-w-[160px] truncate">
                {user.email}
              </span>
              <button
                onClick={async () => {
                  if (window.confirm('Bạn muốn đăng xuất?')) {
                    await supabase.auth.signOut();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error/10 hover:bg-error/20 text-error transition-all font-label-md text-label-md cursor-pointer active:scale-95 duration-150"
                title="Đăng xuất"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden md:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all font-label-md text-label-md cursor-pointer active:scale-95 duration-150"
              title="Đăng nhập"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span>Đăng nhập</span>
            </button>
          )}

          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface-variant/50 transition-colors active:scale-95 duration-150 text-primary">
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </nav>

      <main>
        {currentView === 'projects' && renderProjectsView()}
        {currentView === 'pattern' && renderPatternView()}
        {currentView === 'library' && renderLibraryView()}
      </main>

      {/* Nút FAB thêm mẫu mới - Chỉ hiện với Editor hoặc Admin */}
      {(userRole === 'admin' || userRole === 'editor') && currentView === 'projects' && (
        <button
          onClick={() => { setEditingProject(null); setShowAddModal(true); }}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
          title="Thêm mẫu mới"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest shadow-[0_-4px_12px_rgba(153,188,133,0.1)] rounded-t-xl px-4 pt-2 pb-safe">
        <div className="flex justify-around items-center w-full">
          <button 
            onClick={() => setCurrentView('projects')}
            className={`flex flex-col items-center justify-center rounded-full px-5 py-1.5 transition-all active:scale-90 duration-200 ${currentView === 'projects' || currentView === 'pattern' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined" style={currentView === 'projects' || currentView === 'pattern' ? { fontVariationSettings: "'FILL' 1" } : {}}>folder_open</span>
            <span className="font-label-sm text-label-sm mt-0.5">Dự án</span>
          </button>
          <button 
            onClick={() => setCurrentView('library')}
            className={`flex flex-col items-center justify-center rounded-full px-5 py-1.5 transition-all active:scale-90 duration-200 ${currentView === 'library' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined" style={currentView === 'library' ? { fontVariationSettings: "'FILL' 1" } : {}}>book_4</span>
            <span className="font-label-sm text-label-sm mt-0.5">Thư viện</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
