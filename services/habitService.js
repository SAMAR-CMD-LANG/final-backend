const supabase = require('../config/database');

class HabitService {
    /**
     * Create a new habit
     */
    async createHabit(userId, habitData) {
        const { title, description, category } = habitData;

        // Build insert data based on available columns
        const insertData = {
            user_id: userId,
            title,
            description: description || null
        };

        // Only add category and is_archived if they exist in the schema
        try {
            // Test if columns exist by doing a select first
            const { error: testError } = await supabase
                .from('habits')
                .select('category, is_archived')
                .limit(1);

            if (!testError) {
                insertData.category = category || null;
                insertData.is_archived = false;
            }
        } catch (e) {
            // Columns don't exist, continue without them
        }

        const { data: habit, error } = await supabase
            .from('habits')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create habit: ${error.message}`);
        }

        return habit;
    }

    /**
     * Get all habits for a user with recent completion history
     */
    async getUserHabits(userId, options = {}) {
        const {
            days = 14,
            filter = {},
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = options;

        // Build the query
        let query = supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId);

        // Apply filters
        if (filter.category) {
            query = query.eq('category', filter.category);
        }

        if (filter.is_archived !== undefined) {
            query = query.eq('is_archived', filter.is_archived);
        }

        // Apply sorting
        const ascending = sortOrder === 'asc';
        switch (sortBy) {
            case 'title':
                query = query.order('title', { ascending });
                break;
            case 'current_streak':
                query = query.order('current_streak', { ascending });
                break;
            case 'created_at':
            default:
                query = query.order('created_at', { ascending });
                break;
        }

        const { data: habits, error: habitsError } = await query;

        if (habitsError) {
            throw new Error(`Failed to fetch habits: ${habitsError.message}`);
        }

        if (!habits || habits.length === 0) {
            return [];
        }

        // Get completion history for the last N days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days + 1);

        const { data: completions, error: completionsError } = await supabase
            .from('habit_completions')
            .select('habit_id, completion_date, completed')
            .eq('user_id', userId)
            .gte('completion_date', startDate.toISOString().split('T')[0])
            .lte('completion_date', endDate.toISOString().split('T')[0])
            .order('completion_date', { ascending: false });

        if (completionsError) {
            throw new Error(`Failed to fetch completions: ${completionsError.message}`);
        }

        // Group completions by habit_id
        const completionsByHabit = {};
        if (completions) {
            completions.forEach(completion => {
                if (!completionsByHabit[completion.habit_id]) {
                    completionsByHabit[completion.habit_id] = [];
                }
                completionsByHabit[completion.habit_id].push(completion);
            });
        }

        // Add completion history to each habit
        let habitsWithHistory = habits.map(habit => ({
            ...habit,
            recent_completions: completionsByHabit[habit.id] || []
        }));

        // Apply completion-based filters
        if (filter.completed_today !== undefined) {
            const today = new Date().toISOString().split('T')[0];
            habitsWithHistory = habitsWithHistory.filter(habit => {
                const todayCompletion = habit.recent_completions.find(
                    completion => completion.completion_date === today
                );
                const isCompletedToday = todayCompletion && todayCompletion.completed;
                return filter.completed_today ? isCompletedToday : !isCompletedToday;
            });
        }

        return habitsWithHistory;
    }

    /**
     * Get a specific habit by ID
     */
    async getHabitById(habitId, userId) {
        const { data: habit, error } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .eq('user_id', userId)
            .single();

        if (error) {
            throw new Error(`Habit not found: ${error.message}`);
        }

        return habit;
    }

    /**
     * Update a habit
     */
    async updateHabit(habitId, userId, updateData) {
        const allowedFields = ['title', 'description', 'category', 'is_archived'];
        const filteredData = {};

        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });

        if (Object.keys(filteredData).length === 0) {
            throw new Error('No valid fields to update');
        }

        const { data: habit, error } = await supabase
            .from('habits')
            .update(filteredData)
            .eq('id', habitId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update habit: ${error.message}`);
        }

        return habit;
    }

    /**
     * Delete a habit
     */
    async deleteHabit(habitId, userId) {
        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', habitId)
            .eq('user_id', userId);

        if (error) {
            throw new Error(`Failed to delete habit: ${error.message}`);
        }

        return { message: 'Habit deleted successfully' };
    }

    /**
     * Toggle habit completion for a specific date
     */
    async toggleHabitCompletion(habitId, userId, date, completed) {
        const completionDate = new Date(date).toISOString().split('T')[0];

        // Check if completion already exists
        const { data: existingCompletion } = await supabase
            .from('habit_completions')
            .select('*')
            .eq('habit_id', habitId)
            .eq('completion_date', completionDate)
            .single();

        let result;

        if (existingCompletion) {
            // Update existing completion
            const { data, error } = await supabase
                .from('habit_completions')
                .update({ completed })
                .eq('id', existingCompletion.id)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update completion: ${error.message}`);
            }
            result = data;
        } else {
            // Create new completion
            const { data, error } = await supabase
                .from('habit_completions')
                .insert({
                    habit_id: habitId,
                    user_id: userId,
                    completion_date: completionDate,
                    completed
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create completion: ${error.message}`);
            }
            result = data;
        }

        // Update streaks
        await this.updateHabitStreaks(habitId);

        return result;
    }

    /**
     * Update habit streaks based on completion history
     */
    async updateHabitStreaks(habitId) {
        // Get all completions for this habit, ordered by date descending
        const { data: completions, error } = await supabase
            .from('habit_completions')
            .select('completion_date, completed')
            .eq('habit_id', habitId)
            .eq('completed', true)
            .order('completion_date', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch completions for streak calculation: ${error.message}`);
        }

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        if (completions && completions.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Calculate current streak
            const sortedDates = completions.map(c => c.completion_date).sort((a, b) => new Date(b) - new Date(a));

            // Check if today or yesterday is completed (current streak)
            if (sortedDates.includes(today) || sortedDates.includes(yesterdayStr)) {
                let checkDate = new Date(sortedDates.includes(today) ? today : yesterdayStr);

                for (const dateStr of sortedDates) {
                    const completionDate = new Date(dateStr);
                    const expectedDate = new Date(checkDate);

                    if (completionDate.getTime() === expectedDate.getTime()) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        break;
                    }
                }
            }

            // Calculate longest streak
            const allDates = completions.map(c => new Date(c.completion_date)).sort((a, b) => a - b);

            for (let i = 0; i < allDates.length; i++) {
                if (i === 0) {
                    tempStreak = 1;
                } else {
                    const prevDate = new Date(allDates[i - 1]);
                    const currDate = new Date(allDates[i]);
                    const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

                    if (dayDiff === 1) {
                        tempStreak++;
                    } else {
                        longestStreak = Math.max(longestStreak, tempStreak);
                        tempStreak = 1;
                    }
                }
            }
            longestStreak = Math.max(longestStreak, tempStreak);
        }

        // Update habit with new streaks
        const { error: updateError } = await supabase
            .from('habits')
            .update({
                current_streak: currentStreak,
                longest_streak: longestStreak
            })
            .eq('id', habitId);

        if (updateError) {
            throw new Error(`Failed to update streaks: ${updateError.message}`);
        }

        return { currentStreak, longestStreak };
    }

    /**
     * Get all categories used by a user
     */
    async getUserCategories(userId) {
        const { data: habits, error } = await supabase
            .from('habits')
            .select('category')
            .eq('user_id', userId)
            .not('category', 'is', null);

        if (error) {
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }

        // Extract unique categories
        const categories = [...new Set(habits.map(habit => habit.category))];
        return categories.filter(category => category && category.trim() !== '');
    }

    /**
     * Archive/unarchive a habit
     */
    async toggleArchiveHabit(habitId, userId, isArchived) {
        const { data: habit, error } = await supabase
            .from('habits')
            .update({ is_archived: isArchived })
            .eq('id', habitId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to ${isArchived ? 'archive' : 'unarchive'} habit: ${error.message}`);
        }

        return habit;
    }

    /**
     * Get habit completion history for a specific period
     */
    async getHabitCompletions(habitId, userId, startDate, endDate) {
        const { data: completions, error } = await supabase
            .from('habit_completions')
            .select('*')
            .eq('habit_id', habitId)
            .eq('user_id', userId)
            .gte('completion_date', startDate)
            .lte('completion_date', endDate)
            .order('completion_date', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch completions: ${error.message}`);
        }

        return completions || [];
    }
}

module.exports = new HabitService();