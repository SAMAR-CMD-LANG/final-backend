const express = require('express');
const habitService = require('../services/habitService-enhanced');
const { authenticateToken } = require('../middleware/auth');
const { validateHabit, validateHabitCompletion } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /habits
 * Get all habits for the authenticated user with filtering and sorting
 * Query parameters:
 * - days: number of days for completion history (default: 14)
 * - category: filter by category
 * - is_archived: filter by archived status (true/false)
 * - completed_today: filter by today's completion status (true/false)
 * - sort_by: sort field (title, current_streak, created_at)
 * - sort_order: sort order (asc, desc)
 */
router.get('/', async (req, res) => {
    try {
        const {
            days = 14,
            category,
            is_archived,
            completed_today,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const options = {
            days: parseInt(days),
            filter: {},
            sortBy: sort_by,
            sortOrder: sort_order
        };

        // Build filter object
        if (category) options.filter.category = category;
        if (is_archived !== undefined) options.filter.is_archived = is_archived === 'true';
        if (completed_today !== undefined) options.filter.completed_today = completed_today === 'true';

        const habits = await habitService.getUserHabits(req.user.id, options);

        res.json({
            habits,
            count: habits.length,
            filters: options.filter,
            sort: { by: sort_by, order: sort_order }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /habits/categories
 * Get all categories used by the authenticated user
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await habitService.getUserCategories(req.user.id);

        res.json({
            categories,
            count: categories.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /habits/export
 * Export user's habit data with detailed statistics
 */
router.get('/export', async (req, res) => {
    try {
        const { format = 'json', days = 30 } = req.query;

        // Get habits with extended completion history
        const habits = await habitService.getUserHabits(req.user.id, {
            days: parseInt(days),
            filter: { is_archived: false }
        });

        // Calculate detailed statistics
        const stats = {
            totalHabits: habits.length,
            activeHabits: habits.filter(h => !h.is_archived).length,
            archivedHabits: habits.filter(h => h.is_archived).length,
            totalStreaks: habits.reduce((sum, h) => sum + (h.current_streak || 0), 0),
            longestStreak: Math.max(...habits.map(h => h.longest_streak || 0), 0),
            averageStreak: habits.length > 0 ?
                Math.round(habits.reduce((sum, h) => sum + (h.current_streak || 0), 0) / habits.length) : 0,
            categories: [...new Set(habits.map(h => h.category).filter(Boolean))],
            completionRate: habits.length > 0 ?
                Math.round((habits.reduce((sum, h) => {
                    const recentCompletions = h.recent_completions || []
                    const completedDays = recentCompletions.filter(c => c.completed).length
                    return sum + completedDays
                }, 0) / (habits.length * parseInt(days))) * 100) : 0
        };

        const exportData = {
            exportDate: new Date().toISOString(),
            userId: req.user.id,
            period: `${days} days`,
            statistics: stats,
            habits: habits.map(habit => ({
                id: habit.id,
                title: habit.title,
                description: habit.description,
                category: habit.category,
                currentStreak: habit.current_streak || 0,
                longestStreak: habit.longest_streak || 0,
                isArchived: habit.is_archived || false,
                createdAt: habit.created_at,
                recentCompletions: habit.recent_completions || []
            }))
        };

        if (format === 'csv') {
            // Convert to CSV format
            const csvRows = [
                ['Habit Title', 'Description', 'Category', 'Current Streak', 'Longest Streak', 'Created Date', 'Is Archived', 'Completion Rate (%)']
            ];

            habits.forEach(habit => {
                const recentCompletions = habit.recent_completions || [];
                const completionRate = recentCompletions.length > 0 ?
                    Math.round((recentCompletions.filter(c => c.completed).length / recentCompletions.length) * 100) : 0;

                csvRows.push([
                    habit.title,
                    habit.description || '',
                    habit.category || '',
                    habit.current_streak || 0,
                    habit.longest_streak || 0,
                    new Date(habit.created_at).toLocaleDateString(),
                    habit.is_archived ? 'Yes' : 'No',
                    completionRate
                ]);
            });

            const csvContent = csvRows.map(row =>
                row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="inhabit-habits-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);
        } else {
            res.json(exportData);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /habits
 * Create a new habit
 */
router.post('/', validateHabit, async (req, res) => {
    try {
        const { title, description, category } = req.body;

        const habit = await habitService.createHabit(req.user.id, {
            title,
            description,
            category
        });

        res.status(201).json({
            message: 'Habit created successfully',
            habit
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /habits/:id
 * Get a specific habit by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const habit = await habitService.getHabitById(id, req.user.id);

        res.json({ habit });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

/**
 * PUT /habits/:id
 * Update a habit
 */
router.put('/:id', validateHabit, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, is_archived } = req.body;

        const habit = await habitService.updateHabit(id, req.user.id, {
            title,
            description,
            category,
            is_archived
        });

        res.json({
            message: 'Habit updated successfully',
            habit
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /habits/:id
 * Delete a habit
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await habitService.deleteHabit(id, req.user.id);

        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /habits/:id/toggle
 * Toggle habit completion for a specific date
 */
router.post('/:id/toggle', validateHabitCompletion, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, completed } = req.body;

        const completion = await habitService.toggleHabitCompletion(
            id,
            req.user.id,
            date,
            completed
        );

        res.json({
            message: 'Habit completion updated successfully',
            completion
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /habits/:id/completions
 * Get habit completion history
 */
router.get('/:id/completions', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        // Default to last 30 days if no dates provided
        const endDate = end_date || new Date().toISOString().split('T')[0];
        const startDate = start_date || (() => {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            return date.toISOString().split('T')[0];
        })();

        const completions = await habitService.getHabitCompletions(
            id,
            req.user.id,
            startDate,
            endDate
        );

        res.json({
            completions,
            period: { start_date: startDate, end_date: endDate }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /habits/:id/streaks/recalculate
 * Manually recalculate streaks for a habit
 */
router.post('/:id/streaks/recalculate', async (req, res) => {
    try {
        const { id } = req.params;

        // Verify habit belongs to user
        await habitService.getHabitById(id, req.user.id);

        const streaks = await habitService.updateHabitStreaks(id);

        res.json({
            message: 'Streaks recalculated successfully',
            streaks
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /habits/:id/archive
 * Archive or unarchive a habit
 */
router.post('/:id/archive', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_archived = true } = req.body;

        const habit = await habitService.toggleArchiveHabit(id, req.user.id, is_archived);

        res.json({
            message: `Habit ${is_archived ? 'archived' : 'unarchived'} successfully`,
            habit
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;