import { subscriptionService } from '@/services/SubscriptionService';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isGuest: boolean;
    signInAnonymously: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    isGuest: true,
    signInAnonymously: async () => { },
    signUp: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            // ONLY sign in anonymously if there is definitely NO session 
            // and we haven't already started loading/signing in.
            if (!session) {
                handleAnonymousSignIn();
            } else {
                // Link RevenueCat identity if session exists
                subscriptionService.logIn(session.user.id);
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;

            // Debug session state changes
            console.log('Auth event:', event, session?.user?.id);

            // Handle session changes carefully
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                subscriptionService.logOut();
                handleAnonymousSignIn();
            } else if (session) {
                setSession(session);
                setUser(session.user);
                subscriptionService.logIn(session.user.id);
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
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

    const signUp = async (email: string, password: string) => {
        // If the user is currently anonymous, updateUser will convert the account
        // preserving the same UUID and existing data.
        const { data, error } = await supabase.auth.updateUser({
            email,
            password,
        });

        // On successful conversion, create/upsert the profile with a nickname
        if (!error && data.user) {
            const nickname = email.split('@')[0];
            await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    nickname,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        // After logout, create a new anonymous session
        handleAnonymousSignIn();
    };

    const isGuest = !!user?.is_anonymous;

    return (
        <AuthContext.Provider value={{
            session,
            user,
            isLoading,
            isGuest,
            signInAnonymously: handleAnonymousSignIn,
            signUp,
            signIn,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
