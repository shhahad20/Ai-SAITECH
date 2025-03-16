import { supabase } from './supabase';

async function ensureUserRecord(userId: string, email: string) {
  try {
    // First check if user record exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // If no record exists, create one
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        is_admin: false,
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user record:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error ensuring user record:', error);
    throw error;
  }
}

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          email_confirmed: true
        }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      throw error;
    }

    if (data.user) {
      // Ensure user record exists in users table
      await ensureUserRecord(data.user.id, data.user.email || email);
    }

    return data;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      if (error.message === 'Invalid login credentials') {
        throw new Error('Invalid email or password. Please try again.');
      }
      throw error;
    }

    if (data.user) {
      // Ensure user record exists in users table
      await ensureUserRecord(data.user.id, data.user.email || email);
      
      // Update last login
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: data.user.id,
          action: 'login',
          metadata: {
            ip: window.location.hostname,
            user_agent: navigator.userAgent
          }
        });
    }

    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    if (session?.user) {
      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        // If user record doesn't exist, create it
        if (userError.code === 'PGRST116') {
          return await ensureUserRecord(session.user.id, session.user.email || '');
        }
        throw userError;
      }

      return userData;
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}