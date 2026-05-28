import { useState, useEffect, useMemo } from 'react';
import { initialData } from './data';
import { Sun, Moon, RotateCcw, ChevronDown, Cat } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState(initialData);
  const [isDark, setIsDark] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const toggleRow = (id) => {
    setData(data.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const resetAll = () => {
    if(window.confirm('Bạn có chắc chắn muốn reset toàn bộ tiến trình đánh dấu?')) {
      setData(data.map(item => ({ ...item, completed: false })));
    }
  };

  // Group data by part
  const groupedData = useMemo(() => {
    const groups = [];
    let currentGroup = null;
    let groupIndex = 0;

    data.forEach((item) => {
      // If item has a part name, create a new group
      if (item.part && item.part.trim() !== '') {
        currentGroup = {
          id: `group-${groupIndex++}`,
          title: item.part,
          items: [item]
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        // If no part name, add to current group
        currentGroup.items.push(item);
      }
    });

    return groups;
  }, [data]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: prev[groupId] === false ? true : false
    }));
  };

  const completedCount = data.filter(item => item.completed).length;
  const totalCount = data.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100) || 0;

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-top">
            <div>
              <div className="header-subtitle font-mono">Nhật ký móc len</div>
              <h1 className="header-title font-serif">
                <Cat size={36} color="var(--text-accent)" strokeWidth={2.5} /> Đĩa Tai Mèo
              </h1>
            </div>
            <div className="header-actions">
              <button className="btn-header" onClick={resetAll} title="Reset">
                <RotateCcw size={16} /> <span className="font-mono">Reset</span>
              </button>
              <button className="btn-header" onClick={toggleTheme} title="Giao diện Sáng/Tối">
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
          
          <div className="progress-section">
            <div className="progress-label font-mono">
              <span>Tiến trình</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-header)' }}>{progressPercent}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="progress-stats font-mono">
              {completedCount} / {totalCount} hàng
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {groupedData.map((group) => {
          const groupCompleted = group.items.filter(i => i.completed).length;
          const groupTotal = group.items.length;
          const isExpanded = expandedGroups[group.id] !== false; // default true

          return (
            <div className="card" key={group.id}>
              <div className="card-header" onClick={() => toggleGroup(group.id)}>
                <div className="card-title-group">
                  <div className="card-progress-circle font-mono">
                    {groupCompleted}/{groupTotal}
                  </div>
                  <h2 className="card-title font-serif">{group.title}</h2>
                </div>
                <div className={`card-icon ${isExpanded ? 'open' : ''}`}>
                  <ChevronDown size={24} />
                </div>
              </div>
              
              {isExpanded && (
                <div className="row-list">
                  {group.items.map((item, index) => {
                    const rowNum = (index + 1).toString().padStart(2, '0');
                    return (
                      <div 
                        key={item.id} 
                        className={`row-item ${item.completed ? 'completed' : ''}`}
                        onClick={() => toggleRow(item.id)}
                      >
                        <div className="row-index font-mono">{rowNum}</div>
                        <div className="row-name font-mono">{item.row}</div>
                        <div className="row-formula font-mono">{item.formula}</div>
                        <div className="circle-checkbox">
                          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}

export default App;
