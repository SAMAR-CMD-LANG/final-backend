// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock data for tests
const mockUsers = new Map();
const mockHabits = new Map();
const mockCompletions = new Map();

// Mock Supabase for tests
jest.mock('../config/database', () => {
    let mockUserIdCounter = 1;
    let mockHabitIdCounter = 1;
    let mockCompletionIdCounter = 1;

    const mockSupabase = {
        from: jest.fn((table) => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                single: jest.fn(),
            };

            // Mock different behaviors based on table
            if (table === 'users') {
                mockQuery.single.mockImplementation(() => {
                    const lastInsert = Array.from(mockUsers.values()).pop();
                    return Promise.resolve({
                        data: lastInsert || null,
                        error: lastInsert ? null : { message: 'User not found' }
                    });
                });

                mockQuery.insert.mockImplementation((userData) => {
                    const user = {
                        id: `user-${mockUserIdCounter++}`,
                        ...userData,
                        created_at: new Date().toISOString()
                    };
                    mockUsers.set(user.id, user);

                    mockQuery.select.mockImplementation(() => ({
                        single: () => Promise.resolve({ data: user, error: null })
                    }));

                    return mockQuery;
                });
            } else if (table === 'habits') {
                mockQuery.single.mockImplementation(() => {
                    const lastInsert = Array.from(mockHabits.values()).pop();
                    return Promise.resolve({
                        data: lastInsert || null,
                        error: lastInsert ? null : { message: 'Habit not found' }
                    });
                });

                mockQuery.insert.mockImplementation((habitData) => {
                    const habit = {
                        id: `habit-${mockHabitIdCounter++}`,
                        current_streak: 0,
                        longest_streak: 0,
                        ...habitData,
                        created_at: new Date().toISOString()
                    };
                    mockHabits.set(habit.id, habit);

                    mockQuery.select.mockImplementation(() => ({
                        single: () => Promise.resolve({ data: habit, error: null })
                    }));

                    return mockQuery;
                });

                mockQuery.select.mockImplementation(() => {
                    mockQuery.eq.mockImplementation(() => {
                        mockQuery.order.mockImplementation(() => {
                            const habits = Array.from(mockHabits.values());
                            return Promise.resolve({ data: habits, error: null });
                        });
                        return mockQuery;
                    });
                    return mockQuery;
                });
            } else if (table === 'habit_completions') {
                mockQuery.insert.mockImplementation((completionData) => {
                    const completion = {
                        id: `completion-${mockCompletionIdCounter++}`,
                        ...completionData,
                        created_at: new Date().toISOString()
                    };
                    mockCompletions.set(completion.id, completion);

                    mockQuery.select.mockImplementation(() => ({
                        single: () => Promise.resolve({ data: completion, error: null })
                    }));

                    return mockQuery;
                });
            }

            return mockQuery;
        })
    };

    return mockSupabase;
});

// Increase timeout for async operations
jest.setTimeout(10000);