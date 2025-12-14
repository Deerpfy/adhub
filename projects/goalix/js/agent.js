// Goalix - Agent Integration & Suggestions

const AgentService = {
    // Simulate agent triage suggestions
    async triageInbox(tasks) {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const decisions = [];
        const projects = StorageService.getProjects();
        const tags = StorageService.getTags();

        tasks.forEach(task => {
            // Simple rule-based suggestions (in real app, this would be AI)
            const title = task.title.toLowerCase();
            const body = (task.body || '').toLowerCase();

            // Check for project matches
            projects.forEach(project => {
                const projectTitle = project.title.toLowerCase();
                if (title.includes(projectTitle) || body.includes(projectTitle)) {
                    decisions.push({
                        taskId: task.id,
                        action: 'move',
                        projectId: project.id,
                        confidence: 0.85,
                        explanation: `Title mentions "${project.title}"`,
                    });
                }
            });

            // Check for due date keywords
            if (title.includes('today') || title.includes('urgent') || title.includes('asap')) {
                const today = new Date();
                today.setHours(18, 0, 0, 0);
                decisions.push({
                    taskId: task.id,
                    action: 'set_due',
                    due_at: today.toISOString(),
                    confidence: 0.75,
                    explanation: 'Contains urgency keywords',
                });
            }

            // Check for tag matches
            tags.forEach(tag => {
                if (title.includes(tag.name.toLowerCase())) {
                    decisions.push({
                        taskId: task.id,
                        action: 'add_tag',
                        tagId: tag.id,
                        confidence: 0.7,
                        explanation: `Title mentions "${tag.name}"`,
                    });
                }
            });
        });

        return {
            agent_name: 'blitz-organizer-v1',
            decisions: decisions.slice(0, 5), // Limit to 5 suggestions
        };
    },

    // Apply agent suggestions
    async applySuggestions(suggestions) {
        const results = [];

        for (const decision of suggestions.decisions) {
            try {
                if (decision.action === 'move' && decision.projectId) {
                    StorageService.updateTask(decision.taskId, {
                        project_id: decision.projectId,
                    });
                    results.push({ decision, success: true });
                } else if (decision.action === 'set_due' && decision.due_at) {
                    StorageService.updateTask(decision.taskId, {
                        due_at: decision.due_at,
                    });
                    results.push({ decision, success: true });
                } else if (decision.action === 'add_tag' && decision.tagId) {
                    StorageService.addTaskTag(decision.taskId, decision.tagId);
                    results.push({ decision, success: true });
                }
            } catch (error) {
                results.push({ decision, success: false, error: error.message });
            }
        }

        // Create agent action record
        StorageService.createAgentAction({
            agent_name: suggestions.agent_name,
            action_type: 'triage_inbox',
            payload: { suggestions, results },
            status: 'completed',
        });

        return results;
    },

    // Get agent suggestions for a task
    async getTaskSuggestions(taskId) {
        const task = StorageService.getTask(taskId);
        if (!task) return [];

        const suggestions = [];
        const projects = StorageService.getProjects();

        // Suggest project assignment
        projects.forEach(project => {
            const projectTitle = project.title.toLowerCase();
            if (task.title.toLowerCase().includes(projectTitle)) {
                suggestions.push({
                    type: 'move_to_project',
                    projectId: project.id,
                    projectTitle: project.title,
                    confidence: 0.8,
                    explanation: `Task title matches project "${project.title}"`,
                });
            }
        });

        // Suggest due date if missing
        if (!task.due_at && task.priority === 3) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(18, 0, 0, 0);
            suggestions.push({
                type: 'set_due_date',
                due_at: tomorrow.toISOString(),
                confidence: 0.6,
                explanation: 'High priority task without due date',
            });
        }

        return suggestions;
    },
};






