import React, { useState } from 'react';
import { useAsana } from '../context/AsanaContext';
import type { Task } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const BoardView: React.FC = () => {
  const {
    activeProjectId,
    sections,
    tasks,
    users,
    searchQuery,
    toggleTaskCompletion,
    moveTask,
    addTask,
    addSection,
    deleteSection,
    setSelectedTaskId
  } = useAsana();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [newCardTitles, setNewCardTitles] = useState<{ [sectionId: string]: string }>({});
  const [activeAddCardSectionId, setActiveAddCardSectionId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  // Filter sections and tasks
  const projectSections = sections.filter(s => s.projectId === activeProjectId);
  
  const filteredTasks = tasks.filter(t => {
    if (t.projectId !== activeProjectId) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(query);
    const descMatch = t.description.toLowerCase().includes(query);
    const tagMatch = t.tags.some(tag => tag.toLowerCase().includes(query));
    return titleMatch || descMatch || tagMatch;
  });

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    // Add visual styling class while dragging
    setTimeout(() => {
      const el = document.getElementById(`card-${taskId}`);
      if (el) el.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (taskId: string) => {
    setDraggedTaskId(null);
    setDragOverSectionId(null);
    const el = document.getElementById(`card-${taskId}`);
    if (el) el.classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(sectionId);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      moveTask(taskId, targetSectionId);
    }
    setDraggedTaskId(null);
    setDragOverSectionId(null);
  };

  const handleCreateCard = (sectionId: string) => {
    const title = newCardTitles[sectionId] || '';
    if (!title.trim()) return;

    addTask(activeProjectId, sectionId, {
      title: title.trim(),
      priority: 'medium'
    });

    setNewCardTitles(prev => ({ ...prev, [sectionId]: '' }));
    setActiveAddCardSectionId(null);
  };

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    addSection(activeProjectId, newColumnTitle.trim());
    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  const getSubtasksStatus = (task: Task) => {
    if (task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.completed).length;
    return `${completed}/${task.subtasks.length}`;
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  return (
    <div className="board-view-container animate-fade-in">
      <div className="board-canvas">
        {projectSections.map(section => {
          const sectionTasks = filteredTasks.filter(t => t.sectionId === section.id);
          const isSectionDragOver = dragOverSectionId === section.id;

          return (
            <div 
              key={section.id} 
              className={`board-column ${isSectionDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={() => setDragOverSectionId(null)}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              {/* Column Title */}
              <div className="column-header">
                <div className="column-title-info">
                  <h4>{section.title}</h4>
                  <span className="column-card-count">{sectionTasks.length}</span>
                </div>
                <div className="column-header-actions">
                  <button 
                    onClick={() => {
                      setActiveAddCardSectionId(section.id);
                      setNewCardTitles(prev => ({ ...prev, [section.id]: '' }));
                    }}
                    title="Add task to column"
                  >
                    <Icons.Plus size={14} />
                  </button>
                  <button 
                    className="col-delete-btn"
                    onClick={() => {
                      if (confirm(`Delete section "${section.title}" and its tasks?`)) {
                        deleteSection(section.id);
                      }
                    }}
                    title="Delete column"
                  >
                    <Icons.Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="column-cards-list">
                {/* Inline Card Creator */}
                {activeAddCardSectionId === section.id && (
                  <div className="inline-card-form animate-scale-up">
                    <input
                      type="text"
                      placeholder="Title of task..."
                      value={newCardTitles[section.id] || ''}
                      onChange={(e) => setNewCardTitles({
                        ...newCardTitles,
                        [section.id]: e.target.value
                      })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateCard(section.id);
                        if (e.key === 'Escape') setActiveAddCardSectionId(null);
                      }}
                      autoFocus
                    />
                    <div className="inline-form-actions">
                      <button 
                        className="secondary-btn btn-sm"
                        onClick={() => setActiveAddCardSectionId(null)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="primary-btn btn-sm"
                        onClick={() => handleCreateCard(section.id)}
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                )}

                {sectionTasks.map(task => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  const subtaskProgress = getSubtasksStatus(task);
                  const dateOverdue = isOverdue(task.dueDate || undefined) && !task.completed;

                  return (
                    <div
                      key={task.id}
                      id={`card-${task.id}`}
                      className={`board-card ${task.completed ? 'completed' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={() => handleDragEnd(task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      {/* Card Content Row 1 */}
                      <div className="card-top-row">
                        <button 
                          className={`task-checkbox-circle ${task.completed ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Stop drawer from opening
                            toggleTaskCompletion(task.id);
                          }}
                        >
                          {task.completed && <Icons.Check size={10} />}
                        </button>
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      </div>

                      {/* Card Title */}
                      <h5 className="card-title">{task.title}</h5>

                      {/* Card tags */}
                      {task.tags.length > 0 && (
                        <div className="card-tags-grid">
                          {task.tags.map(t => (
                            <span key={t} className="tag-chip">{t}</span>
                          ))}
                        </div>
                      )}

                      <div className="card-divider"></div>

                      {/* Card Footer */}
                      <div className="card-footer">
                        <div className="card-indicators">
                          {task.dueDate && (
                            <div className={`card-indicator-item date ${dateOverdue ? 'overdue' : ''}`}>
                              <Icons.Calendar size={11} />
                              <span>{task.dueDate}</span>
                            </div>
                          )}
                          
                          {subtaskProgress && (
                            <div className="card-indicator-item subtasks">
                              <Icons.CheckSquare size={11} />
                              <span>{subtaskProgress}</span>
                            </div>
                          )}

                          {task.comments.length > 0 && (
                            <div className="card-indicator-item comments">
                              <Icons.MessageSquare size={11} />
                              <span>{task.comments.length}</span>
                            </div>
                          )}
                        </div>

                        {assignee ? (
                          <div 
                            className="avatar card-assignee-avatar"
                            style={{ backgroundColor: assignee.color }}
                            title={`Assigned to ${assignee.name}`}
                          >
                            {assignee.avatar}
                          </div>
                        ) : (
                          <div className="avatar card-assignee-avatar unassigned" title="Unassigned">
                            <Icons.User size={10} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Section Column */}
        {showAddColumn ? (
          <form onSubmit={handleCreateColumn} className="board-add-column-form animate-scale-up">
            <input
              type="text"
              placeholder="Name this column..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              autoFocus
              required
            />
            <div className="inline-form-actions">
              <button 
                type="button" 
                className="secondary-btn btn-sm"
                onClick={() => setShowAddColumn(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-btn btn-sm">
                Add Section
              </button>
            </div>
          </form>
        ) : (
          <button 
            className="board-add-column-trigger"
            onClick={() => setShowAddColumn(true)}
          >
            <Icons.Plus size={16} />
            <span>Add section</span>
          </button>
        )}
      </div>

      <style>{`
        .board-view-container {
          padding: 24px 32px;
          height: calc(100vh - var(--header-height));
          background-color: var(--bg-secondary);
          overflow-x: auto;
          overflow-y: hidden;
        }

        .board-canvas {
          display: flex;
          gap: 20px;
          height: 100%;
          align-items: flex-start;
          padding-bottom: 24px;
        }

        .board-column {
          width: 280px;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          flex-shrink: 0;
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }

        .board-column.drag-over {
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.15);
        }

        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .column-title-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .column-title-info h4 {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .column-card-count {
          font-size: 11px;
          background-color: var(--bg-tertiary);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .column-header-actions {
          display: flex;
          gap: 6px;
          color: var(--text-muted);
        }

        .column-header-actions button {
          color: var(--text-muted);
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .column-header-actions button:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .column-header-actions button.col-delete-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }

        .column-cards-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Card styles */
        .board-card {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 12px;
          box-shadow: var(--shadow-sm);
          cursor: grab;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
        }

        .board-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--border-hover);
        }

        .board-card:active {
          cursor: grabbing;
        }

        .board-card.completed {
          opacity: 0.65;
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .card-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 10px;
          word-break: break-word;
        }

        .board-card.completed .card-title {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .card-tags-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 10px;
        }

        .card-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 8px 0;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-indicators {
          display: flex;
          gap: 8px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .card-indicator-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .card-indicator-item.date.overdue {
          color: var(--color-danger);
          font-weight: 600;
        }

        .card-assignee-avatar {
          width: 22px;
          height: 22px;
          font-size: 8px;
          border: none;
        }

        .card-assignee-avatar.unassigned {
          background-color: var(--bg-tertiary);
          color: var(--text-muted);
        }

        /* Inline Forms */
        .inline-card-form {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .inline-card-form input {
          width: 100%;
          padding: 6px 8px;
          font-size: 13px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-primary);
        }

        .inline-card-form input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .inline-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }

        /* Column creation far right */
        .board-add-column-trigger {
          width: 280px;
          height: 50px;
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
          cursor: pointer;
          background-color: transparent;
          transition: border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast);
        }

        .board-add-column-trigger:hover {
          background-color: var(--bg-primary);
          color: var(--primary);
          border-color: var(--primary);
        }

        .board-add-column-form {
          width: 280px;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        .board-add-column-form input {
          padding: 8px;
          font-size: 13px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
        }

        .board-add-column-form input:focus {
          outline: none;
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
};
