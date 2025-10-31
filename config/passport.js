const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const supabase = require('./database');

// JWT Strategy for API authentication
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, display_name')
            .eq('id', payload.userId)
            .single();

        if (error || !user) {
            return done(null, false);
        }

        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with this Google ID
        let { data: existingUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('google_id', profile.id)
            .single();

        if (existingUser) {
            return done(null, existingUser);
        }

        // Check if user exists with the same email
        const { data: emailUser, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', profile.emails[0].value)
            .single();

        if (emailUser) {
            // Update existing user with Google ID
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({
                    google_id: profile.id,
                    display_name: profile.displayName
                })
                .eq('id', emailUser.id)
                .select()
                .single();

            if (updateError) {
                return done(updateError, null);
            }

            return done(null, updatedUser);
        }

        // Create new user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                name: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id,
                display_name: profile.displayName
            })
            .select()
            .single();

        if (createError) {
            return done(createError, null);
        }

        return done(null, newUser);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, display_name')
            .eq('id', id)
            .single();

        if (error) {
            return done(error, null);
        }

        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;