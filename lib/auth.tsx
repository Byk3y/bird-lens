import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signInAnonymously: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    signInAnonymously: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // If no session, sign in anonymously to create a "Guest" account
            if (!session) {
                handleAnonymousSignIn();
            } else {
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAnonymousSignIn = async () => {
        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            console.log('Signed in anonymously:', data.user?.id);
        } catch (error) {
            console.error('Anonymous sign-in failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, isLoading, signInAnonymously: handleAnonymousSignIn }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
