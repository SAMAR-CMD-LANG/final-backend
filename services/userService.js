const supabase = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/auth');

class UserService {
    /**
     * Create a new user
     */
    async createUser(userData) {
        const { name, email, password } = userData;

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password: hashedPassword
            })
            .select('id, name, email, created_at')
            .single();

        if (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }

        return user;
    }

    /**
     * Authenticate user with email and password
     */
    async authenticateUser(email, password) {
        // Get user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, password')
            .eq('email', email)
            .single();

        if (error || !user) {
            throw new Error('Invalid email or password');
        }

        // Check if user has a password (not Google SSO only)
        if (!user.password) {
            throw new Error('Please login with Google');
        }

        // Compare password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, display_name, created_at')
            .eq('id', userId)
            .single();

        if (error) {
            throw new Error(`User not found: ${error.message}`);
        }

        return user;
    }

    /**
     * Update user profile
     */
    async updateUser(userId, updateData) {
        const allowedFields = ['name', 'display_name'];
        const filteredData = {};

        // Only allow specific fields to be updated
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });

        if (Object.keys(filteredData).length === 0) {
            throw new Error('No valid fields to update');
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(filteredData)
            .eq('id', userId)
            .select('id, name, email, display_name, updated_at')
            .single();

        if (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }

        return user;
    }
}

module.exports = new UserService();