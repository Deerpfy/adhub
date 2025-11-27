// Blitzfit - React Contexts (Theme, Auth)

const { useState, useEffect, createContext, useContext } = React;

// Theme Context
const ThemeContext = createContext();

function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem('blitzfit_theme');
        return stored || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('blitzfit_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            const themes = ['light', 'dark', 'high-contrast'];
            const currentIndex = themes.indexOf(prev);
            const nextIndex = (currentIndex + 1) % themes.length;
            return themes[nextIndex];
        });
    };

    const setThemeValue = (newTheme) => {
        if (['light', 'dark', 'high-contrast'].includes(newTheme)) {
            setTheme(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeValue }}>
            {children}
        </ThemeContext.Provider>
    );
}

function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

// Auth Context
const AuthContext = createContext();

function AuthProvider({ children }) {
    const [user, setUser] = useState(() => StorageService.getCurrentUser());
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email, name) => {
        setIsLoading(true);
        // Simulate async login
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userData = {
            id: StorageService.generateId(),
            email,
            name: name || email.split('@')[0],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            prefs: {},
            created_at: new Date().toISOString(),
        };
        
        StorageService.setCurrentUser(userData);
        setUser(userData);
        setIsLoading(false);
        return userData;
    };

    const register = async (email, name) => {
        return login(email, name);
    };

    const logout = () => {
        StorageService.setCurrentUser(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

// Refresh Context (for triggering re-renders)
const RefreshContext = createContext();

function RefreshProvider({ children }) {
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <RefreshContext.Provider value={{ refreshKey, refresh }}>
            {children}
        </RefreshContext.Provider>
    );
}

function useRefresh() {
    const context = useContext(RefreshContext);
    if (!context) {
        throw new Error('useRefresh must be used within RefreshProvider');
    }
    return context;
}






