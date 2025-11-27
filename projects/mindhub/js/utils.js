// MindHub - Utility Functions

const Utils = {
    // Date formatting
    formatDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);

        if (dateOnly.getTime() === today.getTime()) {
            return 'Today';
        } else if (dateOnly.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
        }
    },

    formatDateTime(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    },

    isOverdue(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const now = new Date();
        return date < now && date.toDateString() !== now.toDateString();
    },

    // Priority helpers
    getPriorityLabel(priority) {
        const labels = { 1: 'Low', 2: 'Normal', 3: 'High' };
        return labels[priority] || 'Normal';
    },

    getPriorityColor(priority) {
        const colors = {
            1: 'var(--bf-text-500)',
            2: 'var(--bf-primary-500)',
            3: 'var(--bf-danger-500)',
        };
        return colors[priority] || colors[2];
    },

    // Status helpers
    getStatusLabel(status) {
        const labels = {
            todo: 'To Do',
            in_progress: 'In Progress',
            done: 'Done',
        };
        return labels[status] || status;
    },

    // Parse tags from text (e.g., "Buy milk #groceries #urgent")
    parseTags(text) {
        const tagRegex = /#(\w+)/g;
        const matches = text.match(tagRegex);
        return matches ? matches.map(m => m.slice(1)) : [];
    },

    // Remove tags from text
    removeTags(text) {
        return text.replace(/#\w+/g, '').trim();
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Toast notification helper
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background-color: var(--bf-surface-100);
            border: 1px solid var(--bf-surface-200);
            border-radius: var(--bf-radius-md);
            box-shadow: var(--bf-shadow-lg);
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.2s';
            setTimeout(() => toast.remove(), 200);
        }, duration);
    },

    // Keyboard shortcuts
    isModKey(e) {
        return e.metaKey || e.ctrlKey;
    },

    // Generate color from string (for tags)
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 80%)`;
    },
};






