const request = require('supertest');
const app = require('../server');

describe('Habit Endpoints', () => {
    let authToken;
    let userId;

    beforeAll(async () => {
        // Register a test user and get token
        const userData = {
            name: 'Habit Test User',
            email: 'habits@example.com',
            password: 'Password123'
        };

        const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

        authToken = response.body.token;
        userId = response.body.user.id;
    });

    describe('POST /api/habits', () => {
        it('should create a new habit successfully', async () => {
            const habitData = {
                title: 'Daily Exercise',
                description: 'Exercise for 30 minutes every day'
            };

            const response = await request(app)
                .post('/api/habits')
                .set('Authorization', `Bearer ${authToken}`)
                .send(habitData)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Habit created successfully');
            expect(response.body).toHaveProperty('habit');
            expect(response.body.habit).toHaveProperty('title', habitData.title);
            expect(response.body.habit).toHaveProperty('description', habitData.description);
            expect(response.body.habit).toHaveProperty('current_streak', 0);
            expect(response.body.habit).toHaveProperty('longest_streak', 0);
        });

        it('should fail without authentication', async () => {
            const habitData = {
                title: 'Daily Reading',
                description: 'Read for 20 minutes'
            };

            const response = await request(app)
                .post('/api/habits')
                .send(habitData)
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });

        it('should fail with empty title', async () => {
            const habitData = {
                title: '',
                description: 'Some description'
            };

            const response = await request(app)
                .post('/api/habits')
                .set('Authorization', `Bearer ${authToken}`)
                .send(habitData)
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Validation failed');
        });
    });

    describe('GET /api/habits', () => {
        it('should get all habits for authenticated user', async () => {
            const response = await request(app)
                .get('/api/habits')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('habits');
            expect(response.body).toHaveProperty('count');
            expect(Array.isArray(response.body.habits)).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .get('/api/habits')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Habit CRUD Operations', () => {
        let habitId;

        beforeAll(async () => {
            // Create a habit for testing
            const habitData = {
                title: 'Test Habit for CRUD',
                description: 'A habit for testing CRUD operations'
            };

            const response = await request(app)
                .post('/api/habits')
                .set('Authorization', `Bearer ${authToken}`)
                .send(habitData);

            habitId = response.body.habit.id;
        });

        it('should get a specific habit by ID', async () => {
            const response = await request(app)
                .get(`/api/habits/${habitId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('habit');
            expect(response.body.habit).toHaveProperty('id', habitId);
        });

        it('should update a habit', async () => {
            const updateData = {
                title: 'Updated Test Habit',
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/habits/${habitId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Habit updated successfully');
            expect(response.body.habit).toHaveProperty('title', updateData.title);
            expect(response.body.habit).toHaveProperty('description', updateData.description);
        });

        it('should toggle habit completion', async () => {
            const completionData = {
                date: new Date().toISOString(),
                completed: true
            };

            const response = await request(app)
                .post(`/api/habits/${habitId}/toggle`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(completionData)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Habit completion updated successfully');
            expect(response.body).toHaveProperty('completion');
            expect(response.body.completion).toHaveProperty('completed', true);
        });

        it('should get habit completions', async () => {
            const response = await request(app)
                .get(`/api/habits/${habitId}/completions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('completions');
            expect(response.body).toHaveProperty('period');
            expect(Array.isArray(response.body.completions)).toBe(true);
        });

        it('should recalculate streaks', async () => {
            const response = await request(app)
                .post(`/api/habits/${habitId}/streaks/recalculate`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Streaks recalculated successfully');
            expect(response.body).toHaveProperty('streaks');
        });

        it('should delete a habit', async () => {
            const response = await request(app)
                .delete(`/api/habits/${habitId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Habit deleted successfully');
        });

        it('should return 404 for deleted habit', async () => {
            const response = await request(app)
                .get(`/api/habits/${habitId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });
});

describe('Habit Validation', () => {
    let authToken;

    beforeAll(async () => {
        const userData = {
            name: 'Validation Test User',
            email: 'validation@example.com',
            password: 'Password123'
        };

        const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

        authToken = response.body.token;
    });

    it('should validate habit completion date format', async () => {
        // First create a habit
        const habitResponse = await request(app)
            .post('/api/habits')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: 'Validation Test Habit' });

        const habitId = habitResponse.body.habit.id;

        const invalidCompletionData = {
            date: 'invalid-date',
            completed: true
        };

        const response = await request(app)
            .post(`/api/habits/${habitId}/toggle`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidCompletionData)
            .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should validate completed field as boolean', async () => {
        // First create a habit
        const habitResponse = await request(app)
            .post('/api/habits')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ title: 'Boolean Test Habit' });

        const habitId = habitResponse.body.habit.id;

        const invalidCompletionData = {
            date: new Date().toISOString(),
            completed: 'not-a-boolean'
        };

        const response = await request(app)
            .post(`/api/habits/${habitId}/toggle`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidCompletionData)
            .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed');
    });
});