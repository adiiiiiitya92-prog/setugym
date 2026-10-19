import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { GymOwner } from '../types';
import { supabase } from '../utils/supabase';

export type UserRole = 'super-admin' | 'gym-owner' | 'trainer' | 'member';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gymId?: string; // Standard gym link
  gymIds?: string[]; // Owners can own multiple gyms
  originalUser?: UserSession; // For impersonation reference
}

interface AuthContextProps {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  biometricsEnabled: boolean;
  hasBiometricsHardware: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  authenticateWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
  switchGymBranch: (gymId: string) => Promise<void>;
  addGymBranchToSession: (gymId: string) => Promise<void>;
  impersonateGym: (owner: GymOwner, gymId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const AUTH_USER_KEY = "@setugym_user_session";
const BIOMETRIC_PREF_KEY = "@setugym_biometric_pref";
const LAST_EMAIL_KEY = "@setugym_last_logged_in_email";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [biometricsEnabled, setBiometricsState] = useState<boolean>(false);
  const [hasBiometricsHardware, setHasBiometricsHardware] = useState<boolean>(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        const storedBioPref = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
        
        let parsedUser: UserSession | null = null;
        if (storedUser) {
          parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
        
        if (storedBioPref) {
          setBiometricsState(storedBioPref === 'true');
        }

        // Check hardware status
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setHasBiometricsHardware(hasHardware && isEnrolled);
      } catch (e) {
        console.error("Failed to load session details", e);
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();

    // Listen for auth state changes to handle persistence
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth] Auth state change event:', event);
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          let role: UserRole = 'member';
          if (profile?.role === 'super_admin') role = 'super-admin';
          else if (profile?.role === 'gym_owner') role = 'gym-owner';
          else if (profile?.role === 'trainer') role = 'trainer';
          else if (profile?.role === 'member') role = 'member';

          const activeUser: UserSession = {
            id: session.user.id,
            name: profile?.full_name || session.user.user_metadata?.full_name || 'User',
            email: session.user.email || '',
            role,
            gymId: profile?.gym_id || undefined,
            gymIds: profile?.gym_id ? [profile.gym_id] : []
          };
          setUser(activeUser);
          setIsAuthenticated(true);
          await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(activeUser));
        } catch (err) {
          console.warn('[Supabase Auth] Error fetching profile on auth state change:', err);
        }
      } else {
        // No session: only clear if it is not a dev mock user session
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        let isMock = false;
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.id === 'admin-1' || parsed.id === 'owner-active-1' || parsed.id === 'trainer-1' || parsed.id === 'member-john') {
              isMock = true;
            }
          } catch (_) {}
        }
        if (!isMock) {
          setUser(null);
          setIsAuthenticated(false);
          await AsyncStorage.removeItem(AUTH_USER_KEY);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanPass = pass.trim();

    // Check demo credentials first for instantaneous 100% reliable login across all panels
    let authenticatedUser: UserSession | null = null;

    if (cleanEmail === "admin@gymapp.com" && (cleanPass === "Admin@123" || cleanPass === "admin@123")) {
      authenticatedUser = {
        id: "admin-1",
        name: "Vikramaditya Sharma",
        email: cleanEmail,
        role: "super-admin"
      };
    } else if (cleanEmail === "owner@fitzone.com" && (cleanPass === "Owner@123" || cleanPass === "owner@123")) {
      authenticatedUser = {
        id: "owner-active-1",
        name: "Rajesh Singhania",
        email: cleanEmail,
        role: "gym-owner",
        gymIds: ["gym-fitzone-1", "gym-fitzone-2"],
        gymId: "gym-fitzone-1"
      };
    } else if (cleanEmail === "trainer@fitzone.com" && (cleanPass === "Trainer@123" || cleanPass === "trainer@123")) {
      authenticatedUser = {
        id: "trainer-1",
        name: "Vikram Rathore",
        email: cleanEmail,
        role: "trainer",
        gymId: "gym-fitzone-1"
      };
    } else if (cleanEmail === "john@member.com" && (cleanPass === "Member@123" || cleanPass === "member@123")) {
      authenticatedUser = {
        id: "member-john",
        name: "Arjun Mehta",
        email: cleanEmail,
        role: "member",
        gymId: "gym-fitzone-1"
      };
    }

    if (authenticatedUser) {
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticatedUser));
      await AsyncStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      return { success: true };
    }

    // Attempt Supabase authentication for live accounts
    try {
      console.log('[Supabase Auth] Attempting sign in for:', cleanEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass
      });

      if (error) {
        console.warn('[Supabase Auth] Sign in error:', error.message);
      } else if (data?.user) {
        console.log('[Supabase Auth] Signed in successfully. Fetching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('[Supabase Auth] Error fetching profile:', profileError.message);
        }

        let role: UserRole = 'member';
        if (profile?.role === 'super_admin') role = 'super-admin';
        else if (profile?.role === 'gym_owner') role = 'gym-owner';
        else if (profile?.role === 'trainer') role = 'trainer';
        else if (profile?.role === 'member') role = 'member';

        authenticatedUser = {
          id: data.user.id,
          name: profile?.full_name || data.user.user_metadata?.full_name || 'User',
          email: cleanEmail,
          role,
          gymId: profile?.gym_id || undefined,
          gymIds: profile?.gym_id ? [profile.gym_id] : []
        };
        console.log('[Supabase Auth] Session populated:', authenticatedUser);
      }
    } catch (e: any) {
      console.warn('[Supabase Auth] Exception during sign in:', e.message);
    }

    if (authenticatedUser) {
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authenticatedUser));
      await AsyncStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      return { success: true };
    } else {
      return { success: false, error: "Invalid email or password credentials." };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      console.log('[Supabase Auth] Signed out.');
    } catch (e) {
      console.warn('[Supabase Auth] Sign out error:', e);
    }
    setUser(null);
    setIsAuthenticated(false);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  };


  const setBiometricsEnabled = async (enabled: boolean) => {
    setBiometricsState(enabled);
    await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
  };

  const authenticateWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    if (!hasBiometricsHardware || !biometricsEnabled) {
      return { success: false, error: "Biometric login is disabled or not available." };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in securely with Biometrics",
        fallbackLabel: "Enter Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Find last logged in email and restore session
        const lastEmail = await AsyncStorage.getItem(LAST_EMAIL_KEY);
        if (lastEmail) {
          // Log in automatically with default passwords for demo experience
          let p = "Admin@123";
          if (lastEmail.includes("owner")) p = "Owner@123";
          if (lastEmail.includes("trainer")) p = "Trainer@123";
          if (lastEmail.includes("john")) p = "Member@123";
          
          return login(lastEmail, p);
        } else {
          // Fallback to Member demo if no history
          return login("john@member.com", "Member@123");
        }
      }
      return { success: false, error: "Verification canceled or failed." };
    } catch (e) {
      return { success: false, error: "Biometric verification error occurred." };
    }
  };

  const switchGymBranch = async (gymId: string) => {
    if (user) {
      const updated = { ...user, gymId };
      setUser(updated);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    }
  };

  const addGymBranchToSession = async (gymId: string) => {
    if (user) {
      const updatedGymIds = user.gymIds ? [...user.gymIds, gymId] : [gymId];
      const updated = { ...user, gymIds: updatedGymIds };
      setUser(updated);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
    }
  };

  const impersonateGym = async (owner: GymOwner, gymId: string) => {
    if (user) {
      const impersonatedUser: UserSession = {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: 'gym-owner',
        gymId: gymId,
        gymIds: owner.gymIds,
        originalUser: user
      };
      setUser(impersonatedUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(impersonatedUser));
    }
  };

  const stopImpersonating = async () => {
    if (user && user.originalUser) {
      const restoredUser = user.originalUser;
      setUser(restoredUser);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(restoredUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      biometricsEnabled,
      hasBiometricsHardware,
      login,
      logout,
      setBiometricsEnabled,
      authenticateWithBiometrics,
      switchGymBranch,
      addGymBranchToSession,
      impersonateGym,
      stopImpersonating
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
