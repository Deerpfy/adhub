// Blitzfit - Pages (Main Screens)
// Section 4: Layout and main screens

const { useState, useEffect } = React;

// Import useRefresh from contexts (will be available globally)
// Note: In a real app, these would be proper imports

// Inbox Page - Section 4
function InboxPage({ refreshKey }) {
    const [tasks, setTasks] = useState([]);
    const { refresh } = useRefresh();

    useEffect(() => {
        loadTasks();
    }, [refreshKey]);

    const loadTasks = () => {
        const inboxTasks = StorageService.getTasks({
            archived: false,
            project_id: null,
        }).filter(t => !t.project_id);
        setTasks(inboxTasks);
    };

    return (
        <div>
            <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                Inbox
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
                {tasks.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px',
                        color: 'var(--bf-text-500)',
                    }}>
                        No tasks in inbox. Start capturing!
                    </div>
                )}
            </div>
        </div>
    );
}

// Today Page - Section 4
function TodayPage({ refreshKey }) {
    const [tasks, setTasks] = useState([]);
    const { refresh } = useRefresh();

    useEffect(() => {
        loadTasks();
    }, [refreshKey]);

    const loadTasks = () => {
        const todayTasks = StorageService.getTasks({ due_today: true, archived: false });
        // Also include high priority tasks
        const highPriority = StorageService.getTasks({ priority: 3, archived: false });
        const combined = [...todayTasks, ...highPriority.filter(t => !todayTasks.find(tt => tt.id === t.id))];
        setTasks(combined);
    };

    return (
        <div>
            <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                Today
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
                {tasks.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px',
                        color: 'var(--bf-text-500)',
                    }}>
                        No tasks for today
                    </div>
                )}
            </div>
        </div>
    );
}

// Projects Page - Section 4
function ProjectsPage({ refreshKey }) {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const { refresh } = useRefresh();

    useEffect(() => {
        loadData();
    }, [refreshKey]);

    const loadData = () => {
        const allProjects = StorageService.getProjects().filter(p => !p.archived);
        const allTasks = StorageService.getTasks({ archived: false });
        setProjects(allProjects);
        setTasks(allTasks);
    };

    if (selectedProject) {
        const projectTasks = tasks.filter(t => t.project_id === selectedProject.id);
        return (
            <div>
                <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedProject(null)}
                    style={{ marginBottom: '16px' }}
                >
                    ← Back to Projects
                </button>
                <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                    {selectedProject.title}
                </h1>
                {selectedProject.description && (
                    <p style={{ marginBottom: '24px', color: 'var(--bf-text-700)' }}>
                        {selectedProject.description}
                    </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {projectTasks.map(task => (
                        <TaskCard key={task.id} task={task} onUpdate={loadData} />
                    ))}
                    {projectTasks.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px',
                            color: 'var(--bf-text-500)',
                        }}>
                            No tasks in this project
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700 }}>
                    Projects
                </h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        const title = prompt('Project name:');
                        if (title) {
                            StorageService.createProject({ title });
                            loadData();
                            refresh();
                        }
                    }}
                >
                    + New Project
                </button>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
            }}>
                {projects.map(project => {
                    const projectTasks = tasks.filter(t => t.project_id === project.id);
                    return (
                        <div
                            key={project.id}
                            className="card"
                            onClick={() => setSelectedProject(project)}
                            style={{ cursor: 'pointer' }}
                        >
                            <h3 style={{ marginBottom: '8px' }}>{project.title}</h3>
                            {project.description && (
                                <p style={{
                                    fontSize: 'var(--bf-font-size-sm)',
                                    color: 'var(--bf-text-700)',
                                    marginBottom: '12px',
                                }}>
                                    {project.description}
                                </p>
                            )}
                            <div style={{
                                fontSize: 'var(--bf-font-size-sm)',
                                color: 'var(--bf-text-500)',
                            }}>
                                {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    );
                })}
                {projects.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '48px',
                        color: 'var(--bf-text-500)',
                    }}>
                        No projects yet. Create your first project!
                    </div>
                )}
            </div>
        </div>
    );
}

// Calendar Page - Section 4
function CalendarPage() {
    return (
        <div>
            <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                Calendar
            </h1>
            <div style={{
                textAlign: 'center',
                padding: '48px',
                color: 'var(--bf-text-500)',
            }}>
                Calendar view coming soon
            </div>
        </div>
    );
}

// Habits Page - Section 4
function HabitsPage() {
    return (
        <div>
            <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                Habits
            </h1>
            <div style={{
                textAlign: 'center',
                padding: '48px',
                color: 'var(--bf-text-500)',
            }}>
                Habit tracker coming soon
            </div>
        </div>
    );
}

// Search Page
function SearchPage({ query: initialQuery }) {
    const [query, setQuery] = useState(initialQuery || '');
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (query.trim()) {
            const tasks = StorageService.searchTasks(query);
            setResults(tasks);
        } else {
            setResults([]);
        }
    }, [query]);

    return (
        <div>
            <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                Search
            </h1>
            <input
                type="text"
                className="input"
                placeholder="Search tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ marginBottom: '24px', maxWidth: '500px' }}
                autoFocus
            />
            {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {results.map(task => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </div>
            )}
            {query && results.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '48px',
                    color: 'var(--bf-text-500)',
                }}>
                    No results found for "{query}"
                </div>
            )}
        </div>
    );
}

// Settings Page
function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { logout } = useAuth();
    const [agentEnabled, setAgentEnabled] = useState(false);

    return (
        <div>
            <h1 style={{ fontSize: 'var(--bf-font-size-2xl)', fontWeight: 700, marginBottom: '24px' }}>
                Settings
            </h1>
            <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '12px' }}>Theme</h3>
                <select
                    className="input"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    style={{ maxWidth: '200px' }}
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="high-contrast">High Contrast</option>
                </select>
            </div>
            <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '12px' }}>Agent Settings</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={agentEnabled}
                        onChange={(e) => setAgentEnabled(e.target.checked)}
                    />
                    Enable AI agent suggestions
                </label>
            </div>
            <div className="card">
                <h3 style={{ marginBottom: '12px' }}>Account</h3>
                <button className="btn btn-secondary" onClick={logout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

// Login Page
function LoginPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const { login, register, isLoading } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isRegistering) {
            await register(email, name);
        } else {
            await login(email);
        }
        window.location.hash = 'inbox';
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--bf-primary-500) 0%, var(--bf-accent-500) 100%)',
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '32px',
            }}>
                <h1 style={{
                    fontSize: 'var(--bf-font-size-3xl)',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--bf-primary-500), var(--bf-accent-500))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textAlign: 'center',
                    marginBottom: '8px',
                }}>
                    ⚡ Blitzfit
                </h1>
                <p style={{
                    textAlign: 'center',
                    color: 'var(--bf-text-700)',
                    marginBottom: '24px',
                }}>
                    Personal coordination platform
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isRegistering && (
                        <input
                            type="text"
                            className="input"
                            placeholder="Name (optional)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                    <input
                        type="email"
                        className="input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : (isRegistering ? 'Register' : 'Login')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--bf-primary-500)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: 'var(--bf-font-size-sm)',
                        }}
                    >
                        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                    </button>
                </form>
            </div>
        </div>
    );
}

