// Goalix - Main Application & Layout
// Section 4: Persistent chrome and routing

const { useState, useEffect } = React;

// Note: RefreshProvider is defined in contexts.js and will be available globally

// Layout Component - Section 4
function Layout({ currentPage, setCurrentPage }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { refreshKey, refresh } = useRefresh();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const navItems = [
        { id: 'inbox', label: 'Inbox', icon: '📥' },
        { id: 'today', label: 'Today', icon: '📅' },
        { id: 'projects', label: 'Projects', icon: '📁' },
        { id: 'calendar', label: 'Calendar', icon: '🗓️' },
        { id: 'habits', label: 'Habits', icon: '✨' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (Utils.isModKey(e) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Hash routing
    useEffect(() => {
        const hash = window.location.hash.slice(1) || 'inbox';
        setCurrentPage(hash);
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) || 'inbox';
            setCurrentPage(hash);
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleNavClick = (id) => {
        window.location.hash = id;
        setCurrentPage(id);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Left Sidebar - Section 4 */}
            <aside style={{
                width: '240px',
                backgroundColor: 'var(--bf-surface-100)',
                borderRight: '1px solid var(--bf-surface-200)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
            }}>
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--bf-surface-200)',
                }}>
                    <h1 style={{
                        fontSize: 'var(--bf-font-size-xl)',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--bf-primary-500), var(--bf-accent-500))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        margin: 0,
                    }}>
                        ⚡ Goalix
                    </h1>
                </div>
                <nav style={{
                    flex: 1,
                    padding: '8px',
                    overflowY: 'auto',
                }}>
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: 'var(--bf-radius-md)',
                                color: currentPage === item.id ? 'white' : 'var(--bf-text-700)',
                                backgroundColor: currentPage === item.id ? 'var(--bf-primary-500)' : 'transparent',
                                border: 'none',
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: 'var(--bf-font-size-base)',
                                fontWeight: currentPage === item.id ? 500 : 400,
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div style={{
                    padding: '8px',
                    borderTop: '1px solid var(--bf-surface-200)',
                }}>
                    <button
                        onClick={toggleTheme}
                        className="nav-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: 'var(--bf-radius-md)',
                            color: 'var(--bf-text-700)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 'var(--bf-font-size-base)',
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>
                            {theme === 'light' ? '🌙' : theme === 'dark' ? '☀️' : '🔆'}
                        </span>
                        <span>Theme</span>
                    </button>
                    <button
                        onClick={logout}
                        className="nav-item"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: 'var(--bf-radius-md)',
                            color: 'var(--bf-text-700)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: 'var(--bf-font-size-base)',
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area - Section 4 */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backgroundColor: 'var(--bf-bg)',
            }}>
                {/* Quick Capture Bar */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--bf-surface-200)',
                    backgroundColor: 'var(--bf-surface-100)',
                }}>
                    <QuickCapture onTaskAdded={refresh} />
                </div>

                {/* Page Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                }}>
                    {currentPage === 'inbox' && <InboxPage refreshKey={refreshKey} />}
                    {currentPage === 'today' && <TodayPage refreshKey={refreshKey} />}
                    {currentPage === 'projects' && <ProjectsPage refreshKey={refreshKey} />}
                    {currentPage === 'calendar' && <CalendarPage />}
                    {currentPage === 'habits' && <HabitsPage />}
                    {currentPage === 'settings' && <SettingsPage />}
                    {currentPage.startsWith('search') && (
                        <SearchPage query={currentPage.replace('search/', '')} />
                    )}
                </div>
            </main>

            {/* Command Palette */}
            <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                onSelect={(task) => {
                    setSelectedTask(task);
                    setCommandPaletteOpen(false);
                }}
            />
        </div>
    );
}

// Main App Component
function App() {
    const [currentPage, setCurrentPage] = useState('inbox');
    const { user } = useAuth();

    if (!user) {
        return <LoginPage />;
    }

    return (
        <RefreshProvider>
            <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </RefreshProvider>
    );
}

