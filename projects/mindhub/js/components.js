// MindHub - UI Components
// All components follow the spec with proper keyboard interactions and ARIA roles

const { useState, useEffect, useRef } = React;

// QuickCapture Component - Section 5
function QuickCapture({ onTaskAdded }) {
    const [title, setTitle] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [priority, setPriority] = useState(2);
    const [dueDate, setDueDate] = useState('');
    const inputRef = useRef(null);

    const projects = StorageService.getProjects();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        // Parse tags from title
        const tags = Utils.parseTags(title);
        const cleanTitle = Utils.removeTags(title);

        // Create task
        const task = StorageService.createTask({
            title: cleanTitle,
            project_id: projectId || null,
            priority: parseInt(priority),
            due_at: dueDate ? new Date(dueDate).toISOString() : null,
            status: 'todo',
        });

        // Add tags
        tags.forEach(tagName => {
            const tag = StorageService.getOrCreateTag(tagName);
            StorageService.addTaskTag(task.id, tag.id);
        });

        // Reset form
        setTitle('');
        setProjectId('');
        setPriority(2);
        setDueDate('');
        setShowOptions(false);
        inputRef.current?.focus();

        if (onTaskAdded) onTaskAdded();
        Utils.showToast('Task added to inbox', 'success');
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="input"
                    placeholder="Capture anything... (use #tag for tags)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={() => setShowOptions(true)}
                    style={{ flex: 1 }}
                    aria-label="Quick capture input"
                />
                <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
                    Add
                </button>
            </div>
            {showOptions && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '8px',
                    backgroundColor: 'var(--bf-surface-100)',
                    borderRadius: 'var(--bf-radius-md)',
                    border: '1px solid var(--bf-surface-200)',
                }}>
                    <select
                        className="input"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        style={{ flex: 1, minWidth: '120px' }}
                        aria-label="Project"
                    >
                        <option value="">No project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                    <select
                        className="input"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        style={{ width: '100px' }}
                        aria-label="Priority"
                    >
                        <option value="1">Low</option>
                        <option value="2">Normal</option>
                        <option value="3">High</option>
                    </select>
                    <input
                        type="date"
                        className="input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{ width: '140px' }}
                        aria-label="Due date"
                    />
                </div>
            )}
        </form>
    );
}

// TaskCard Component - Section 5
function TaskCard({ task, onUpdate, onSelect }) {
    const [isHovered, setIsHovered] = useState(false);
    const tags = StorageService.getTaskTags(task.id);
    const project = task.project_id ? StorageService.getProject(task.project_id) : null;

    const handleComplete = (e) => {
        e.stopPropagation();
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        StorageService.updateTask(task.id, { status: newStatus });
        if (onUpdate) onUpdate();
        Utils.showToast(`Task ${newStatus === 'done' ? 'completed' : 'reopened'}`, 'success');
    };

    const handleClick = () => {
        if (onSelect) onSelect(task);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (e.key === ' ') {
                handleComplete(e);
            } else {
                handleClick();
            }
        }
    };

    return (
        <div
            className="card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`Task: ${task.title}`}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                opacity: task.status === 'done' ? 0.6 : 1,
            }}
        >
            <input
                type="checkbox"
                className="checkbox"
                checked={task.status === 'done'}
                onChange={handleComplete}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Mark task "${task.title}" as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                }}>
                    <h3 style={{
                        fontSize: 'var(--bf-font-size-base)',
                        fontWeight: 500,
                        color: 'var(--bf-text-900)',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        margin: 0,
                    }}>
                        {task.title}
                    </h3>
                    {task.priority === 3 && (
                        <span style={{
                            fontSize: 'var(--bf-font-size-xs)',
                            color: 'var(--bf-danger-500)',
                            fontWeight: 600,
                        }}>
                            HIGH
                        </span>
                    )}
                </div>
                {task.due_at && (
                    <div style={{
                        fontSize: 'var(--bf-font-size-sm)',
                        color: Utils.isOverdue(task.due_at) ? 'var(--bf-danger-500)' : 'var(--bf-text-500)',
                        marginBottom: '4px',
                    }}>
                        {Utils.formatDate(task.due_at)}
                        {Utils.isOverdue(task.due_at) && ' (Overdue)'}
                    </div>
                )}
                {project && (
                    <div style={{
                        fontSize: 'var(--bf-font-size-sm)',
                        color: 'var(--bf-text-500)',
                        marginBottom: '4px',
                    }}>
                        📁 {project.title}
                    </div>
                )}
                {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {tags.map(tag => (
                            <span
                                key={tag.id}
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: 'var(--bf-radius-sm)',
                                    fontSize: 'var(--bf-font-size-xs)',
                                    backgroundColor: tag.color || '#E5E7EB',
                                    color: 'var(--bf-text-900)',
                                }}
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {isHovered && (
                <button
                    className="btn-icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        // More menu - placeholder
                    }}
                    aria-label="More options"
                >
                    ⋯
                </button>
            )}
        </div>
    );
}

// Command Palette Component - Section 5
function CommandPalette({ isOpen, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const allResults = [];

        // Quick actions
        if (lowerQuery.includes('new') || lowerQuery.includes('create')) {
            allResults.push({
                type: 'action',
                label: 'Create new task',
                action: () => {
                    const title = query.replace(/^(new|create)\s*/i, '');
                    if (title.trim()) {
                        StorageService.createTask({ title: title.trim() });
                        Utils.showToast('Task created', 'success');
                    }
                },
            });
        }

        // Search tasks
        const tasks = StorageService.searchTasks(query);
        tasks.slice(0, 5).forEach(task => {
            allResults.push({
                type: 'task',
                label: task.title,
                task,
                action: () => {
                    if (onSelect) onSelect(task);
                },
            });
        });

        // Search projects
        const projects = StorageService.getProjects();
        projects.filter(p => p.title.toLowerCase().includes(lowerQuery))
            .slice(0, 3)
            .forEach(project => {
                allResults.push({
                    type: 'project',
                    label: `Project: ${project.title}`,
                    project,
                    action: () => {
                        window.location.hash = `projects/${project.id}`;
                    },
                });
            });

        setResults(allResults);
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            results[selectedIndex].action();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '100px',
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    backgroundColor: 'var(--bf-bg)',
                    borderRadius: 'var(--bf-radius-lg)',
                    boxShadow: 'var(--bf-shadow-xl)',
                    overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    type="text"
                    className="input"
                    placeholder="Type to search or create..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        border: 'none',
                        borderBottom: '1px solid var(--bf-surface-200)',
                        borderRadius: 0,
                        padding: '16px',
                        fontSize: 'var(--bf-font-size-lg)',
                    }}
                />
                {results.length > 0 && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {results.map((result, index) => (
                            <div
                                key={index}
                                onClick={() => {
                                    result.action();
                                    onClose();
                                }}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    backgroundColor: index === selectedIndex ? 'var(--bf-surface-100)' : 'transparent',
                                    borderLeft: index === selectedIndex ? '3px solid var(--bf-primary-500)' : '3px solid transparent',
                                }}
                            >
                                <div style={{ fontWeight: 500 }}>{result.label}</div>
                                {result.type === 'task' && (
                                    <div style={{
                                        fontSize: 'var(--bf-font-size-sm)',
                                        color: 'var(--bf-text-500)',
                                        marginTop: '4px',
                                    }}>
                                        {Utils.formatDate(result.task.due_at)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {query && results.length === 0 && (
                    <div style={{ padding: '16px', color: 'var(--bf-text-500)', textAlign: 'center' }}>
                        No results found
                    </div>
                )}
            </div>
        </div>
    );
}

// ConfirmationDialog Component - Section 5
function ConfirmationDialog({ isOpen, title, message, confirmText, onConfirm, onCancel, requireTyping, typingValue }) {
    const [typedValue, setTypedValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTypedValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const canConfirm = !requireTyping || typedValue === typingValue;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={onCancel}
        >
            <div
                className="card"
                style={{
                    maxWidth: '400px',
                    width: '90%',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ marginBottom: '12px' }}>{title}</h3>
                <p style={{ marginBottom: '16px', color: 'var(--bf-text-700)' }}>{message}</p>
                {requireTyping && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: 'var(--bf-font-size-sm)' }}>
                            Type "{typingValue}" to confirm:
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={typedValue}
                            onChange={(e) => setTypedValue(e.target.value)}
                            placeholder={typingValue}
                        />
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onConfirm}
                        disabled={!canConfirm}
                        style={{
                            backgroundColor: canConfirm ? 'var(--bf-danger-500)' : 'var(--bf-text-300)',
                        }}
                    >
                        {confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}






