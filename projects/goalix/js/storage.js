// Goalix - Storage Service (LocalStorage implementation)
// Implements the data model from the spec using localStorage

const StorageService = {
    // Users
    getCurrentUser() {
        const user = localStorage.getItem('mindhub_user');
        return user ? JSON.parse(user) : null;
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('mindhub_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('mindhub_user');
        }
    },

    // Tasks
    getTasks(filters = {}) {
        const tasks = JSON.parse(localStorage.getItem('mindhub_tasks') || '[]');
        let filtered = [...tasks];

        if (filters.status) {
            filtered = filtered.filter(t => t.status === filters.status);
        }
        if (filters.project_id) {
            filtered = filtered.filter(t => t.project_id === filters.project_id);
        }
        if (filters.archived !== undefined) {
            filtered = filtered.filter(t => t.archived === filters.archived);
        }
        if (filters.due_today) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            filtered = filtered.filter(t => {
                if (!t.due_at) return false;
                const dueDate = new Date(t.due_at);
                return dueDate >= today && dueDate < tomorrow;
            });
        }
        if (filters.priority) {
            filtered = filtered.filter(t => t.priority === filters.priority);
        }

        return filtered;
    },

    getTask(id) {
        const tasks = this.getTasks();
        return tasks.find(t => t.id === id);
    },

    saveTasks(tasks) {
        localStorage.setItem('mindhub_tasks', JSON.stringify(tasks));
    },

    createTask(task) {
        const tasks = this.getTasks();
        const user = this.getCurrentUser();
        const newTask = {
            id: this.generateId(),
            user_id: user?.id || 'local',
            project_id: task.project_id || null,
            parent_id: task.parent_id || null,
            title: task.title,
            body: task.body || '',
            status: task.status || 'todo',
            priority: task.priority || 2,
            due_at: task.due_at || null,
            scheduled_at: task.scheduled_at || null,
            metadata: task.metadata || {},
            archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        tasks.push(newTask);
        this.saveTasks(tasks);
        return newTask;
    },

    updateTask(id, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = {
                ...tasks[index],
                ...updates,
                updated_at: new Date().toISOString(),
            };
            this.saveTasks(tasks);
            return tasks[index];
        }
        return null;
    },

    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(t => t.id !== id);
        this.saveTasks(filtered);
    },

    // Projects
    getProjects() {
        return JSON.parse(localStorage.getItem('mindhub_projects') || '[]');
    },

    getProject(id) {
        const projects = this.getProjects();
        return projects.find(p => p.id === id);
    },

    saveProjects(projects) {
        localStorage.setItem('mindhub_projects', JSON.stringify(projects));
    },

    createProject(project) {
        const projects = this.getProjects();
        const user = this.getCurrentUser();
        const newProject = {
            id: this.generateId(),
            user_id: user?.id || 'local',
            title: project.title,
            description: project.description || '',
            type: project.type || 'list',
            settings: project.settings || {},
            archived: false,
            created_at: new Date().toISOString(),
        };
        projects.push(newProject);
        this.saveProjects(projects);
        return newProject;
    },

    updateProject(id, updates) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            projects[index] = {
                ...projects[index],
                ...updates,
            };
            this.saveProjects(projects);
            return projects[index];
        }
        return null;
    },

    deleteProject(id) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== id);
        this.saveProjects(filtered);
    },

    // Subtasks
    getSubtasks(taskId) {
        const subtasks = JSON.parse(localStorage.getItem('mindhub_subtasks') || '[]');
        return subtasks.filter(st => st.task_id === taskId).sort((a, b) => a.ord - b.ord);
    },

    saveSubtasks(subtasks) {
        localStorage.setItem('mindhub_subtasks', JSON.stringify(subtasks));
    },

    createSubtask(taskId, title) {
        const subtasks = JSON.parse(localStorage.getItem('mindhub_subtasks') || '[]');
        const taskSubtasks = subtasks.filter(st => st.task_id === taskId);
        const newSubtask = {
            id: this.generateId(),
            task_id: taskId,
            title,
            completed: false,
            ord: taskSubtasks.length,
        };
        subtasks.push(newSubtask);
        this.saveSubtasks(subtasks);
        return newSubtask;
    },

    updateSubtask(id, updates) {
        const subtasks = JSON.parse(localStorage.getItem('mindhub_subtasks') || '[]');
        const index = subtasks.findIndex(st => st.id === id);
        if (index !== -1) {
            subtasks[index] = { ...subtasks[index], ...updates };
            this.saveSubtasks(subtasks);
            return subtasks[index];
        }
        return null;
    },

    deleteSubtask(id) {
        const subtasks = JSON.parse(localStorage.getItem('mindhub_subtasks') || '[]');
        const filtered = subtasks.filter(st => st.id !== id);
        this.saveSubtasks(filtered);
    },

    // Tags
    getTags() {
        return JSON.parse(localStorage.getItem('mindhub_tags') || '[]');
    },

    getTag(id) {
        const tags = this.getTags();
        return tags.find(t => t.id === id);
    },

    saveTags(tags) {
        localStorage.setItem('mindhub_tags', JSON.stringify(tags));
    },

    createTag(tag) {
        const tags = this.getTags();
        const user = this.getCurrentUser();
        const newTag = {
            id: this.generateId(),
            user_id: user?.id || 'local',
            name: tag.name,
            color: tag.color || '#E5E7EB',
        };
        tags.push(newTag);
        this.saveTags(tags);
        return newTag;
    },

    getOrCreateTag(name) {
        const tags = this.getTags();
        let tag = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (!tag) {
            tag = this.createTag({ name, color: '#E5E7EB' });
        }
        return tag;
    },

    // Task Tags (many-to-many)
    getTaskTags(taskId) {
        const taskTags = JSON.parse(localStorage.getItem('mindhub_task_tags') || '[]');
        return taskTags.filter(tt => tt.task_id === taskId).map(tt => this.getTag(tt.tag_id)).filter(Boolean);
    },

    addTaskTag(taskId, tagId) {
        const taskTags = JSON.parse(localStorage.getItem('mindhub_task_tags') || '[]');
        if (!taskTags.find(tt => tt.task_id === taskId && tt.tag_id === tagId)) {
            taskTags.push({ task_id: taskId, tag_id: tagId });
            localStorage.setItem('mindhub_task_tags', JSON.stringify(taskTags));
        }
    },

    removeTaskTag(taskId, tagId) {
        const taskTags = JSON.parse(localStorage.getItem('mindhub_task_tags') || '[]');
        const filtered = taskTags.filter(tt => !(tt.task_id === taskId && tt.tag_id === tagId));
        localStorage.setItem('mindhub_task_tags', JSON.stringify(filtered));
    },

    // Attachments
    getAttachments(taskId) {
        const attachments = JSON.parse(localStorage.getItem('mindhub_attachments') || '[]');
        return attachments.filter(a => a.task_id === taskId);
    },

    createAttachment(taskId, url, mime) {
        const attachments = JSON.parse(localStorage.getItem('mindhub_attachments') || '[]');
        const newAttachment = {
            id: this.generateId(),
            task_id: taskId,
            url,
            mime: mime || 'application/octet-stream',
            created_at: new Date().toISOString(),
        };
        attachments.push(newAttachment);
        localStorage.setItem('mindhub_attachments', JSON.stringify(attachments));
        return newAttachment;
    },

    // Agent Actions
    getAgentActions(filters = {}) {
        const actions = JSON.parse(localStorage.getItem('mindhub_agent_actions') || '[]');
        let filtered = [...actions];

        if (filters.status) {
            filtered = filtered.filter(a => a.status === filters.status);
        }
        if (filters.user_id) {
            filtered = filtered.filter(a => a.user_id === filters.user_id);
        }

        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    createAgentAction(action) {
        const actions = JSON.parse(localStorage.getItem('mindhub_agent_actions') || '[]');
        const user = this.getCurrentUser();
        const newAction = {
            id: this.generateId(),
            user_id: user?.id || 'local',
            agent_name: action.agent_name || 'blitz-organizer-v1',
            action_type: action.action_type,
            payload: action.payload || {},
            status: action.status || 'queued',
            created_at: new Date().toISOString(),
        };
        actions.push(newAction);
        localStorage.setItem('mindhub_agent_actions', JSON.stringify(actions));
        return newAction;
    },

    updateAgentAction(id, updates) {
        const actions = JSON.parse(localStorage.getItem('mindhub_agent_actions') || '[]');
        const index = actions.findIndex(a => a.id === id);
        if (index !== -1) {
            actions[index] = { ...actions[index], ...updates };
            localStorage.setItem('mindhub_agent_actions', JSON.stringify(actions));
            return actions[index];
        }
        return null;
    },

    // Search
    searchTasks(query) {
        const tasks = this.getTasks();
        if (!query || !query.trim()) return tasks;

        const lowerQuery = query.toLowerCase();
        return tasks.filter(task => {
            const titleMatch = task.title?.toLowerCase().includes(lowerQuery);
            const bodyMatch = task.body?.toLowerCase().includes(lowerQuery);
            return titleMatch || bodyMatch;
        });
    },

    // Utility
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // Settings
    getSettings() {
        return JSON.parse(localStorage.getItem('mindhub_settings') || '{}');
    },

    updateSettings(settings) {
        const current = this.getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem('mindhub_settings', JSON.stringify(updated));
        return updated;
    },
};






