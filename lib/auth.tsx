import { subscriptionService } from '@/services/SubscriptionService';
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isGuest: boolean;
    isPro: boolean;
    refreshSubscription: () => Promise<void>;
    signInAnonymously: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<{ error: any }>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    checkEmailAvailability: (email: string) => Promise<{ exists: boolean; error: any }>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    isGuest: true,
    isPro: false,
    refreshSubscription: async () => { },
    signInAnonymously: async () => { },
    signUp: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => { },
    deleteAccount: async () => ({ error: null }),
    resetPassword: async () => ({ error: null }),
    checkEmailAvailability: async () => ({ exists: false, error: null }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);

    const refreshSubscription = async () => {
        const subscribed = await subscriptionService.isSubscribed();
        setIsPro(subscribed);
    };

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
                // Initial subscription check
                subscriptionService.isSubscribed().then(setIsPro);
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;

            // Debug session state changes
            console.log('Auth event:', event);

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
                subscriptionService.isSubscribed().then(setIsPro);
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
            console.log('Signed in anonymously successfully.');
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

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error };
    };

    const checkEmailAvailability = async (email: string) => {
        try {
            const { data, error } = await supabase.rpc('check_email_exists', {
                email_to_check: email.toLowerCase().trim()
            });
            return { exists: !!data, error };
        } catch (error) {
            return { exists: false, error };
        }
    };

    const deleteAccount = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('delete-user');
            if (error) throw error;

            // On success, sign out and clear subscription
            await supabase.auth.signOut();
            subscriptionService.logOut();
            handleAnonymousSignIn();

            return { error: null };
        } catch (error: any) {
            console.error('Error deleting account:', error);
            return { error };
        }
    };

    const isGuest = !!user?.is_anonymous;

    return (
        <AuthContext.Provider value={{
            session,
            user,
            isLoading,
            isGuest,
            isPro,
            refreshSubscription,
            signInAnonymously: handleAnonymousSignIn,
            signUp,
            signIn,
            signOut,
            deleteAccount,
            resetPassword,
            checkEmailAvailability
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
