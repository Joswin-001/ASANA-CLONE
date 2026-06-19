import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const ListView: React.FC = () => {
  const {
    activeProjectId,
    sections,
    tasks,
    users,
    searchQuery,
    toggleTaskCompletion,
    updateTask,
    deleteTask,
    addTask,
    addSection,
    deleteSection,
    setSelectedTaskId
  } = useAsana();

  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [inlineTaskTitles, setInlineTaskTitles] = useState<{ [sectionId: string]: string }>({});
  const [activeInlineSectionId, setActiveInlineSectionId] = useState<string | null>(null);

  // Filter sections and tasks for the active project
  const projectSections = sections.filter(s => s.projectId === activeProjectId);
  
  // Filter tasks based on active project and search query
  const filteredTasks = tasks.filter(t => {
    if (t.projectId !== activeProjectId) return false;
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(query);
    const descMatch = t.description.toLowerCase().includes(query);
    const tagMatch = t.tags.some(tag => tag.toLowerCase().includes(query));
    return titleMatch || descMatch || tagMatch;
  });

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    addSection(activeProjectId, newSectionTitle.trim());
    setNewSectionTitle('');
    setShowAddSection(false);
  };

  const handleCreateInlineTask = (sectionId: string) => {
    const title = inlineTaskTitles[sectionId] || '';
    if (!title.trim()) return;

    addTask(activeProjectId, sectionId, {
      title: title.trim(),
      priority: 'medium'
    });

    setInlineTaskTitles(prev => ({ ...prev, [sectionId]: '' }));
    setActiveInlineSectionId(null);
  };

  const handlePriorityChange = (taskId: string, priority: 'low' | 'medium' | 'high') => {
    updateTask(taskId, { priority });
  };

  const handleAssigneeChange = (taskId: string, assigneeId: string) => {
    updateTask(taskId, { assigneeId: assigneeId || undefined });
  };

  const handleDueDateChange = (taskId: string, dueDate: string) => {
    updateTask(taskId, { dueDate: dueDate || undefined });
  };

  return (
    <div className="list-view-container animate-fade-in">
      <div className="list-scroll-area">
        {projectSections.length === 0 ? (
          <div className="empty-project-state">
            <Icons.FolderOpen size={48} />
            <p>No sections in this project. Create a section to start adding tasks!</p>
            <button className="primary-btn" onClick={() => setShowAddSection(true)}>
              <Icons.Plus size={16} />
              Add section
            </button>
          </div>
        ) : (
          projectSections.map(section => {
            const sectionTasks = filteredTasks.filter(t => t.sectionId === section.id);

            return (
              <div key={section.id} className="list-section">
                {/* Section Header */}
                <div className="list-section-header">
                  <div className="section-title-wrapper">
                    <Icons.ChevronDown size={16} />
                    <span className="section-title">{section.title}</span>
                    <span className="section-count">{sectionTasks.length}</span>
                  </div>
                  
                  <div className="section-actions">
                    <button 
                      className="section-icon-btn"
                      onClick={() => {
                        setActiveInlineSectionId(section.id);
                        setInlineTaskTitles(prev => ({ ...prev, [section.id]: '' }));
                      }}
                      title="Add task to section"
                    >
                      <Icons.Plus size={14} />
                    </button>
                    <button 
                      className="section-icon-btn delete"
                      onClick={() => {
                        if (confirm(`Delete section "${section.title}" and all its tasks?`)) {
                          deleteSection(section.id);
                        }
                      }}
                      title="Delete section"
                    >
                      <Icons.Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Section Rows Grid */}
                <div className="section-rows">
                  {/* Column Titles Header */}
                  {sectionTasks.length > 0 && (
                    <div className="row-columns-header">
                      <div className="col-task-name">Task name</div>
                      <div className="col-assignee">Assignee</div>
                      <div className="col-due-date">Due date</div>
                      <div className="col-priority">Priority</div>
                      <div className="col-tags">Tags</div>
                      <div className="col-actions"></div>
                    </div>
                  )}

                  {/* Task Rows */}
                  {sectionTasks.map(task => {
                    const assignee = users.find(u => u.id === task.assigneeId);

                    return (
                      <div 
                        key={task.id} 
                        className={`task-row ${task.completed ? 'completed' : ''}`}
                      >
                        {/* Task name & check */}
                        <div className="col-task-name task-name-cell">
                          <button 
                            className={`task-checkbox-circle ${task.completed ? 'checked' : ''}`}
                            onClick={() => toggleTaskCompletion(task.id)}
                          >
                            {task.completed && <Icons.Check size={10} />}
                          </button>
                          
                          <input
                            type="text"
                            className="task-title-input"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                        </div>

                        {/* Assignee select */}
                        <div className="col-assignee">
                          <div className="assignee-picker-wrapper">
                            <select
                              value={task.assigneeId || ''}
                              onChange={(e) => handleAssigneeChange(task.id, e.target.value)}
                              style={{ backgroundColor: assignee?.color || 'transparent' }}
                              className={`assignee-dropdown-select ${!task.assigneeId ? 'unassigned' : ''}`}
                            >
                              <option value="">Unassigned</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                            <div className="assignee-mini-avatar" style={{ backgroundColor: assignee?.color || '#cbd5e1' }}>
                              {assignee ? assignee.avatar : <Icons.User size={10} />}
                            </div>
                          </div>
                        </div>

                        {/* Due Date input */}
                        <div className="col-due-date">
                          <div className="due-date-picker-wrapper">
                            <input
                              type="date"
                              value={task.dueDate || ''}
                              onChange={(e) => handleDueDateChange(task.id, e.target.value)}
                              className="due-date-input-field"
                            />
                            {!task.dueDate && <span className="due-date-placeholder">Add date</span>}
                          </div>
                        </div>

                        {/* Priority Badge dropdown */}
                        <div className="col-priority">
                          <select
                            value={task.priority}
                            onChange={(e) => handlePriorityChange(task.id, e.target.value as any)}
                            className={`priority-select badge badge-${task.priority}`}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        {/* Tags list */}
                        <div className="col-tags">
                          <div className="tags-row-list">
                            {task.tags.map(tag => (
                              <span key={tag} className="tag-chip">{tag}</span>
                            ))}
                            {task.tags.length === 0 && (
                              <button 
                                className="add-tag-placeholder"
                                onClick={() => setSelectedTaskId(task.id)}
                              >
                                + tag
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Delete Task action */}
                        <div className="col-actions">
                          <button 
                            className="task-delete-btn"
                            onClick={() => deleteTask(task.id)}
                            title="Delete task"
                          >
                            <Icons.Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Task Creator row */}
                  <div className="inline-creator-row">
                    {activeInlineSectionId === section.id ? (
                      <div className="inline-creator-form">
                        <Icons.CornerDownRight size={14} className="inline-arrow" />
                        <input
                          type="text"
                          placeholder="Write a task title..."
                          value={inlineTaskTitles[section.id] || ''}
                          onChange={(e) => setInlineTaskTitles({
                            ...inlineTaskTitles,
                            [section.id]: e.target.value
                          })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateInlineTask(section.id);
                            if (e.key === 'Escape') setActiveInlineSectionId(null);
                          }}
                          autoFocus
                        />
                        <button 
                          className="primary-btn btn-sm"
                          onClick={() => handleCreateInlineTask(section.id)}
                        >
                          Add
                        </button>
                        <button 
                          className="secondary-btn btn-sm"
                          onClick={() => setActiveInlineSectionId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="add-task-row-trigger"
                        onClick={() => {
                          setActiveInlineSectionId(section.id);
                          setInlineTaskTitles(prev => ({ ...prev, [section.id]: '' }));
                        }}
                      >
                        <Icons.Plus size={12} />
                        <span>Add task...</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Section Adder at the bottom */}
        {showAddSection ? (
          <form onSubmit={handleAddSection} className="bottom-add-section-form">
            <input
              type="text"
              placeholder="Name this section..."
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              autoFocus
              required
            />
            <div className="form-buttons">
              <button type="submit" className="primary-btn btn-sm">Add section</button>
              <button 
                type="button" 
                className="secondary-btn btn-sm"
                onClick={() => setShowAddSection(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button 
            className="bottom-add-section-trigger"
            onClick={() => setShowAddSection(true)}
          >
            <Icons.Plus size={16} />
            <span>Add section</span>
          </button>
        )}
      </div>

      <style>{`
        .list-view-container {
          padding: 24px 32px;
          height: calc(100vh - var(--header-height));
          background-color: var(--bg-primary);
          overflow: hidden;
        }

        .list-scroll-area {
          height: 100%;
          overflow-y: auto;
          padding-bottom: 80px;
        }

        .empty-project-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: var(--text-muted);
          gap: 16px;
        }

        .list-section {
          margin-bottom: 28px;
        }

        .list-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1.5px solid var(--border-color);
          margin-bottom: 8px;
        }

        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }

        .section-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15px;
        }

        .section-count {
          font-size: 11px;
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .section-actions {
          display: flex;
          gap: 8px;
        }

        .section-icon-btn {
          color: var(--text-muted);
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }

        .section-icon-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .section-icon-btn.delete:hover {
          background-color: var(--badge-high-bg);
          color: var(--color-danger);
        }

        .section-rows {
          display: flex;
          flex-direction: column;
        }

        /* Row Columns Grid System */
        .row-columns-header {
          display: grid;
          grid-template-columns: 2fr 120px 130px 100px 1fr 40px;
          gap: 12px;
          padding: 6px 8px;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
        }

        .task-row {
          display: grid;
          grid-template-columns: 2fr 120px 130px 100px 1fr 40px;
          gap: 12px;
          padding: 8px;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          transition: background-color var(--transition-fast);
        }

        .task-row:hover {
          background-color: var(--bg-secondary);
        }

        .task-row.completed {
          opacity: 0.65;
        }

        .task-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .task-title-input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 13.5px;
          color: var(--text-primary);
          font-weight: 500;
          cursor: pointer;
        }

        .task-title-input:focus {
          outline: none;
          border-bottom: 1px solid var(--primary);
          cursor: text;
        }

        .task-row.completed .task-title-input {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        /* Assignee select styles */
        .assignee-picker-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .assignee-dropdown-select {
          width: 100%;
          padding: 4px 8px 4px 28px;
          font-size: 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          color: white;
          font-weight: 500;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }

        .assignee-dropdown-select.unassigned {
          background-color: var(--bg-secondary) !important;
          color: var(--text-secondary);
          border-color: var(--border-color);
        }

        .assignee-mini-avatar {
          position: absolute;
          left: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          color: white;
          font-size: 8px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          border: 1.5px solid var(--bg-primary);
        }

        /* Due Date Picker */
        .due-date-picker-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .due-date-input-field {
          width: 100%;
          padding: 4px 8px;
          font-size: 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
          cursor: pointer;
        }

        .due-date-input-field:focus {
          outline: none;
          border-color: var(--primary);
        }

        .due-date-placeholder {
          position: absolute;
          left: 12px;
          font-size: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        /* Priority Badge styling */
        .priority-select {
          border: none;
          cursor: pointer;
          font-size: 11px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          text-align-last: center;
        }

        /* Tag chips */
        .tags-row-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }

        .tag-chip {
          font-size: 10px;
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .add-tag-placeholder {
          font-size: 10px;
          color: var(--text-muted);
          cursor: pointer;
          border: 1px dashed var(--border-color);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .add-tag-placeholder:hover {
          color: var(--primary);
          border-color: var(--primary);
        }

        /* Task action items */
        .task-delete-btn {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 4px;
        }

        .task-row:hover .task-delete-btn {
          opacity: 1;
        }

        .task-delete-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }

        /* Inline Creator row */
        .inline-creator-row {
          padding: 8px;
          border-bottom: 1px solid var(--border-color);
        }

        .add-task-row-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .add-task-row-trigger:hover {
          color: var(--primary);
        }

        .inline-creator-form {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .inline-arrow {
          color: var(--text-muted);
        }

        .inline-creator-form input {
          flex: 1;
          padding: 6px 10px;
          font-size: 13px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
        }

        .inline-creator-form input:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* Bottom Section Adder */
        .bottom-add-section-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          margin-top: 16px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          width: 100%;
          border: 1px dashed var(--border-color);
          justify-content: center;
          transition: color var(--transition-fast), border-color var(--transition-fast);
        }

        .bottom-add-section-trigger:hover {
          color: var(--primary);
          border-color: var(--primary);
          background-color: var(--bg-hover);
        }

        .bottom-add-section-form {
          margin-top: 16px;
          background-color: var(--bg-secondary);
          padding: 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 300px;
        }

        .bottom-add-section-form input {
          padding: 8px;
          font-size: 13px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-primary);
        }

        .bottom-add-section-form input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};
