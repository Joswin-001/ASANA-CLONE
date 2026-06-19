import React, { useState, useEffect } from 'react';
import { useAsana } from '../context/AsanaContext';
import * as Icons from 'lucide-react';

export const TaskDetailDrawer: React.FC = () => {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    sections,
    users,
    activeProjectId,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addComment,
    deleteComment,
    activeUser
  } = useAsana();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Find selected task details
  const task = tasks.find(t => t.id === selectedTaskId);

  // Auto-focus comment text area or reset inputs when task changes
  useEffect(() => {
    setNewSubtaskTitle('');
    setNewCommentText('');
    setNewTag('');
    setShowAddTag(false);
  }, [selectedTaskId]);

  if (!task) return null;

  const assignee = users.find(u => u.id === task.assigneeId);
  const projectSections = sections.filter(s => s.projectId === activeProjectId);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTask(task.id, { title: e.target.value });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTask(task.id, { description: e.target.value });
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateTask(task.id, { sectionId: e.target.value });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateTask(task.id, { assigneeId: e.target.value || undefined });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTask(task.id, { dueDate: e.target.value || undefined });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateTask(task.id, { priority: e.target.value as any });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    if (!task.tags.includes(newTag.trim())) {
      updateTask(task.id, { tags: [...task.tags, newTag.trim()] });
    }
    setNewTag('');
    setShowAddTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateTask(task.id, { tags: task.tags.filter(t => t !== tagToRemove) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newAttachment = {
        name: file.name,
        size: file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (file.size / 1024).toFixed(1) + ' KB',
        date: new Date().toLocaleDateString()
      };
      const updatedAttachments = [...(task.attachments || []), newAttachment];
      
      const logMsg = `${activeUser?.name || 'User'} uploaded attachment "${file.name}" • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const updatedLog = [...(task.activityLog || []), logMsg];
      
      updateTask(task.id, { 
        attachments: updatedAttachments,
        activityLog: updatedLog
      });
    }
  };

  const handleRemoveAttachment = (attName: string) => {
    const updatedAttachments = (task.attachments || []).filter(a => a.name !== attName);
    
    const logMsg = `${activeUser?.name || 'User'} removed attachment "${attName}" • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const updatedLog = [...(task.activityLog || []), logMsg];
    
    updateTask(task.id, { 
      attachments: updatedAttachments,
      activityLog: updatedLog
    });
  };

  return (
    <div className="drawer-overlay animate-fade-in" onClick={() => setSelectedTaskId(null)}>
      <div className="drawer-container animate-slide-in" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar */}
        <div className="drawer-controls">
          <button 
            className={`complete-status-btn ${task.completed ? 'completed' : ''}`}
            onClick={() => toggleTaskCompletion(task.id)}
          >
            <Icons.CheckCircle2 size={16} />
            <span>{task.completed ? 'Completed' : 'Mark complete'}</span>
          </button>

          <div className="control-right">
            <button 
              className="control-icon-btn delete-btn"
              onClick={() => {
                if (confirm('Are you sure you want to delete this task?')) {
                  deleteTask(task.id);
                }
              }}
              title="Delete Task"
            >
              <Icons.Trash2 size={16} />
            </button>
            <button 
              className="control-icon-btn close-btn"
              onClick={() => setSelectedTaskId(null)}
              title="Close Drawer"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Task Title Editor */}
        <div className="drawer-title-area">
          <input
            type="text"
            className="drawer-title-input"
            value={task.title}
            onChange={handleTitleChange}
            placeholder="Write a task name..."
          />
        </div>

        {/* Grid Meta Properties */}
        <div className="drawer-meta-grid">
          <div className="meta-row">
            <span className="meta-label">Assignee</span>
            <div className="meta-value">
              <div className="drawer-assignee-picker">
                <select 
                  value={task.assigneeId || ''} 
                  onChange={handleAssigneeChange}
                  className={`assignee-picker-select ${!task.assigneeId ? 'unassigned' : ''}`}
                  style={{ backgroundColor: assignee?.color || 'transparent' }}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <div className="assignee-picker-avatar" style={{ backgroundColor: assignee?.color || '#cbd5e1' }}>
                  {assignee ? assignee.avatar : <Icons.User size={12} />}
                </div>
              </div>
            </div>
          </div>

          <div className="meta-row">
            <span className="meta-label">Due date</span>
            <div className="meta-value">
              <div className="drawer-date-picker">
                <Icons.Calendar size={14} className="date-icon-svg" />
                <input 
                  type="date" 
                  value={task.dueDate || ''} 
                  onChange={handleDueDateChange} 
                />
              </div>
            </div>
          </div>

          <div className="meta-row">
            <span className="meta-label">Section / Stage</span>
            <div className="meta-value">
              <div className="drawer-section-picker">
                <select value={task.sectionId} onChange={handleSectionChange}>
                  {projectSections.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="meta-row">
            <span className="meta-label">Priority</span>
            <div className="meta-value">
              <select
                value={task.priority}
                onChange={handlePriorityChange}
                className={`priority-picker-select badge badge-${task.priority}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Tags row */}
          <div className="meta-row">
            <span className="meta-label">Tags</span>
            <div className="meta-value tag-picker-area">
              <div className="drawer-tags-list">
                {task.tags.map(tag => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button className="remove-tag-btn" onClick={() => handleRemoveTag(tag)}>
                      <Icons.X size={10} />
                    </button>
                  </span>
                ))}

                {showAddTag ? (
                  <form onSubmit={handleAddTagSubmit} className="add-tag-inline-form">
                    <input
                      type="text"
                      placeholder="Tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onBlur={() => {
                        // Delay hide slightly to allow submission
                        setTimeout(() => setShowAddTag(false), 200);
                      }}
                      autoFocus
                    />
                  </form>
                ) : (
                  <button className="add-tag-chip-btn" onClick={() => setShowAddTag(true)}>
                    + Tag
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="drawer-divider"></div>

        {/* Description Textarea */}
        <div className="drawer-section description-sec">
          <h4 className="drawer-sec-title">Description</h4>
          <textarea
            className="drawer-description-textarea"
            value={task.description}
            onChange={handleDescChange}
            placeholder="Add more details about this task..."
          />
        </div>

        <div className="drawer-divider"></div>

        {/* Subtasks Checklist */}
        <div className="drawer-section subtasks-sec">
          <h4 className="drawer-sec-title">Subtasks</h4>
          <div className="drawer-subtasks-list">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="subtask-row-item">
                <button
                  className={`sub-checkbox ${sub.completed ? 'checked' : ''}`}
                  onClick={() => toggleSubtask(task.id, sub.id)}
                >
                  {sub.completed && <Icons.Check size={10} />}
                </button>
                <span className={`sub-title ${sub.completed ? 'completed' : ''}`}>
                  {sub.title}
                </span>
                <button 
                  className="sub-delete-btn"
                  onClick={() => deleteSubtask(task.id, sub.id)}
                >
                  <Icons.Trash2 size={12} />
                </button>
              </div>
            ))}

            <form onSubmit={handleAddSubtask} className="add-subtask-form">
              <Icons.Plus size={14} className="subtask-plus" />
              <input
                type="text"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
              />
              {newSubtaskTitle.trim() && (
                <button type="submit" className="primary-btn btn-sm">Add</button>
              )}
            </form>
          </div>
        </div>

        <div className="drawer-divider"></div>

        {/* Attachments Section */}
        <div className="drawer-section attachments-sec">
          <h4 className="drawer-sec-title">Attachments</h4>
          <div 
            className="attachments-drop-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icons.UploadCloud size={24} className="upload-icon-svg" />
            <p className="upload-text-main">Drag files here or click to upload</p>
            <p className="upload-text-sub">Support for images, PDFs, spreadsheets</p>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          {task.attachments && task.attachments.length > 0 && (
            <div className="attachments-grid">
              {task.attachments.map(att => {
                const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name);
                const isPdf = /\.pdf$/i.test(att.name);
                return (
                  <div key={att.name} className="attachment-card">
                    <div className="attachment-icon">
                      {isImg ? (
                        <Icons.Image size={16} />
                      ) : isPdf ? (
                        <Icons.FileText size={16} />
                      ) : (
                        <Icons.Paperclip size={16} />
                      )}
                    </div>
                    <div className="attachment-details">
                      <span className="attachment-name" title={att.name}>{att.name}</span>
                      <span className="attachment-meta">{att.size} • {att.date}</span>
                    </div>
                    <button 
                      className="attachment-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(att.name);
                      }}
                      title="Remove Attachment"
                    >
                      <Icons.Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="drawer-divider"></div>

        {/* Comments Section */}
        <div className="drawer-section comments-sec">
          <h4 className="drawer-sec-title">Collaborator Comments</h4>
          <div className="comments-log">
            {task.comments.length === 0 ? (
              <p className="no-comments-placeholder">No comments yet. Start the conversation!</p>
            ) : (
              task.comments.map(c => (
                <div key={c.id} className="comment-bubble-row">
                  <div className="avatar comment-avatar" style={{ backgroundColor: c.userColor }}>
                    {c.userAvatar}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header-info">
                      <span className="comment-author">{c.userName}</span>
                      <div className="comment-meta-right">
                        <span className="comment-time">{c.createdAt}</span>
                        <button 
                          className="comment-delete-btn"
                          onClick={() => {
                            if (confirm('Delete this comment?')) {
                              deleteComment(task.id, c.id);
                            }
                          }}
                          title="Delete Comment"
                        >
                          <Icons.Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="comment-text-body">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input form */}
          <form onSubmit={handleAddComment} className="comment-input-area">
            <textarea
              placeholder="Ask a question or post an update..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            />
            <div className="comment-submit-actions">
              {newCommentText.trim() && (
                <button type="submit" className="primary-btn">
                  Comment
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="drawer-divider"></div>

        {/* Activity Log Section */}
        <div className="drawer-section activity-sec">
          <h4 className="drawer-sec-title">Activity Log</h4>
          <div className="activity-timeline">
            {!task.activityLog || task.activityLog.length === 0 ? (
              <p className="no-activity-placeholder">No activity logged yet.</p>
            ) : (
              task.activityLog.map((log, index) => {
                const parts = log.split(' • ');
                const msg = parts[0];
                const time = parts[1] || '';
                
                let logIcon = <Icons.Info size={12} />;
                if (msg.includes('completed') || msg.includes('marked task as completed')) {
                  logIcon = <Icons.CheckCircle2 size={12} className="timeline-icon-success" />;
                } else if (msg.includes('incomplete')) {
                  logIcon = <Icons.Circle size={12} className="timeline-icon-warning" />;
                } else if (msg.includes('comment')) {
                  logIcon = <Icons.MessageSquare size={12} className="timeline-icon-info" />;
                } else if (msg.includes('attachment')) {
                  logIcon = <Icons.Paperclip size={12} className="timeline-icon-primary" />;
                } else if (msg.includes('subtask')) {
                  logIcon = <Icons.Plus size={12} className="timeline-icon-secondary" />;
                }

                return (
                  <div key={index} className="timeline-item">
                    <div className="timeline-line"></div>
                    <div className="timeline-icon-wrapper">
                      {logIcon}
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-message">{msg}</span>
                      {time && <span className="timeline-time">{time}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          z-index: 50;
          display: flex;
          justify-content: flex-end;
          backdrop-filter: blur(2px);
        }

        .drawer-container {
          width: 580px;
          height: 100vh;
          background-color: var(--bg-primary);
          border-left: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          box-shadow: var(--shadow-xl);
          padding: 24px;
        }

        @media (max-width: 600px) {
          .drawer-container {
            width: 100vw;
          }
        }

        /* Control Bar */
        .drawer-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .complete-status-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border-color);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }

        .complete-status-btn:hover {
          background-color: var(--bg-hover);
        }

        .complete-status-btn.completed {
          background-color: var(--badge-low-bg);
          color: var(--badge-low-text);
          border-color: var(--badge-low-text);
        }

        .control-right {
          display: flex;
          gap: 8px;
        }

        .control-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: background-color var(--transition-fast);
        }

        .control-icon-btn:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
        }

        .control-icon-btn.delete-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }

        /* Title Area */
        .drawer-title-area {
          margin-bottom: 24px;
        }

        .drawer-title-input {
          width: 100%;
          border: none;
          background: transparent;
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          padding: 4px 0;
          border-bottom: 2px solid transparent;
        }

        .drawer-title-input:focus {
          outline: none;
          border-bottom-color: var(--primary);
        }

        /* Meta Grid */
        .drawer-meta-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .meta-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          align-items: center;
        }

        .meta-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }

        .meta-value {
          display: flex;
          align-items: center;
        }

        /* Assignee Picker */
        .drawer-assignee-picker {
          position: relative;
          display: flex;
          align-items: center;
        }

        .assignee-picker-select {
          padding: 4px 12px 4px 32px;
          font-size: 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          color: white;
          font-weight: 500;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }

        .assignee-picker-select.unassigned {
          background-color: var(--bg-secondary) !important;
          color: var(--text-secondary);
          border-color: var(--border-color);
        }

        .assignee-picker-avatar {
          position: absolute;
          left: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          color: white;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          border: 1.5px solid var(--bg-primary);
        }

        /* Date Picker */
        .drawer-date-picker {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border-color);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
        }

        .date-icon-svg {
          color: var(--text-muted);
        }

        .drawer-date-picker input {
          border: none;
          background: transparent;
          font-size: 12px;
          outline: none;
          cursor: pointer;
        }

        /* Section picker */
        .drawer-section-picker select {
          padding: 4px 10px;
          font-size: 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
          cursor: pointer;
        }

        .drawer-section-picker select:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* Priority Picker */
        .priority-picker-select {
          border: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          text-align-last: center;
        }

        /* Tags picker */
        .drawer-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .remove-tag-btn {
          color: var(--text-muted);
          margin-left: 4px;
          display: inline-flex;
          align-items: center;
        }

        .remove-tag-btn:hover {
          color: var(--color-danger);
        }

        .add-tag-chip-btn {
          font-size: 11px;
          border: 1.5px dashed var(--border-color);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          color: var(--text-muted);
          font-weight: 600;
        }

        .add-tag-chip-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .add-tag-inline-form input {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          border: 1.5px solid var(--primary);
          font-size: 11px;
          width: 70px;
          background-color: var(--bg-secondary);
        }

        .add-tag-inline-form input:focus {
          outline: none;
        }

        /* Dividers */
        .drawer-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 20px 0;
        }

        /* Sections content details */
        .drawer-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .drawer-sec-title {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .drawer-description-textarea {
          width: 100%;
          min-height: 100px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 12px;
          font-size: 13.5px;
          line-height: 1.5;
          resize: vertical;
          background-color: var(--bg-secondary);
        }

        .drawer-description-textarea:focus {
          outline: none;
          border-color: var(--primary);
          background-color: var(--bg-primary);
        }

        /* Subtasks section */
        .drawer-subtasks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .subtask-row-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
        }

        .subtask-row-item:hover {
          background-color: var(--bg-tertiary);
        }

        .sub-checkbox {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1.5px solid var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: transparent;
        }

        .sub-checkbox.checked {
          background-color: var(--color-success);
          border-color: var(--color-success);
        }

        .sub-title {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .sub-title.completed {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .sub-delete-btn {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 3px;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .subtask-row-item:hover .sub-delete-btn {
          opacity: 1;
        }

        .sub-delete-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }

        .add-subtask-form {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1.5px dashed var(--border-color);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
        }

        .subtask-plus {
          color: var(--text-muted);
        }

        .add-subtask-form input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 13px;
        }

        .add-subtask-form input:focus {
          outline: none;
        }

        /* Comments section */
        .comments-sec {
          gap: 16px;
        }

        .comments-log {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 250px;
          overflow-y: auto;
        }

        .no-comments-placeholder {
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
        }

        .comment-bubble-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .comment-avatar {
          width: 26px;
          height: 26px;
          font-size: 9px;
          border: none;
          flex-shrink: 0;
        }

        .comment-content {
          flex: 1;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          border: 1px solid var(--border-color);
        }

        .comment-header-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .comment-author {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .comment-time {
          font-size: 10px;
          color: var(--text-muted);
        }

        .comment-text-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.45;
          word-break: break-word;
        }

        .comment-input-area {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px;
          background-color: var(--bg-secondary);
        }

        .comment-input-area textarea {
          border: none;
          background: transparent;
          font-size: 13px;
          resize: none;
          height: 60px;
          outline: none;
          line-height: 1.45;
        }

        .comment-submit-actions {
          display: flex;
          justify-content: flex-end;
        }

        .attachments-drop-zone {
          border: 1.5px dashed var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
          background-color: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .attachments-drop-zone:hover {
          border-color: var(--primary);
          background-color: var(--bg-hover);
        }

        .upload-icon-svg {
          color: var(--text-muted);
        }

        .upload-text-main {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .upload-text-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .attachments-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .attachment-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          position: relative;
          overflow: hidden;
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
        }

        .attachment-card:hover {
          background-color: var(--bg-hover);
          border-color: var(--border-hover);
        }

        .attachment-icon {
          width: 32px;
          height: 32px;
          background-color: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .attachment-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .attachment-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .attachment-meta {
          font-size: 10px;
          color: var(--text-muted);
        }

        .attachment-delete-btn {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          padding: 4px;
          border-radius: var(--radius-sm);
        }

        .attachment-card:hover .attachment-delete-btn {
          opacity: 1;
        }

        .attachment-delete-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }

        .comment-meta-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .comment-delete-btn {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          border-radius: 3px;
        }

        .comment-bubble-row:hover .comment-delete-btn {
          opacity: 1;
        }

        .comment-delete-btn:hover {
          color: var(--color-danger);
          background-color: var(--badge-high-bg);
        }

        /* Activity Timeline */
        .activity-timeline {
          display: flex;
          flex-direction: column;
          position: relative;
          padding-left: 8px;
          margin-top: 10px;
          max-height: 250px;
          overflow-y: auto;
        }

        .no-activity-placeholder {
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
          padding-bottom: 16px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-line {
          position: absolute;
          left: 12px;
          top: 24px;
          bottom: 0;
          width: 2px;
          background-color: var(--border-color);
        }

        .timeline-item:last-child .timeline-line {
          display: none;
        }

        .timeline-icon-wrapper {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          color: var(--text-secondary);
          border: 2px solid var(--bg-primary);
          flex-shrink: 0;
        }

        .timeline-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 4px;
        }

        .timeline-message {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .timeline-time {
          font-size: 10px;
          color: var(--text-muted);
        }

        .timeline-icon-success {
          color: var(--color-success);
        }

        .timeline-icon-warning {
          color: var(--color-warning);
        }

        .timeline-icon-info {
          color: var(--color-info);
        }

        .timeline-icon-primary {
          color: var(--primary);
        }

        .timeline-icon-secondary {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
};
