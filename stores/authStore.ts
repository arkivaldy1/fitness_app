import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { setSetting, getSetting } from '../lib/database';
import type { UserProfile, ExperienceLevel, WeightUnit } from '../types';

interface AuthState {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOfflineMode: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueOffline: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

// Generate offline user ID
const getOfflineUserId = async (): Promise<string> => {
  let userId = await getSetting('offline_user_id');
  if (!userId) {
    userId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await setSetting('offline_user_id', userId);
  }
  return userId;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isOfflineMode: false,

  initialize: async () => {
    set({ isLoading: true });

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Start in offline mode
      const offlineId = await getOfflineUserId();
      const savedProfile = await getSetting('user_profile');

      set({
        user: { id: offlineId, email: 'offline@local' },
        profile: savedProfile ? JSON.parse(savedProfile) : createDefaultProfile(offlineId),
        isAuthenticated: true,
        isOfflineMode: true,
        isLoading: false,
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch profile from Supabase
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: { id: session.user.id, email: session.user.email || '' },
          profile: profile || createDefaultProfile(session.user.id),
          isAuthenticated: true,
          isOfflineMode: false,
          isLoading: false,
        });
      } else {
        // Check for offline mode
        const wasOffline = await getSetting('offline_mode');
        if (wasOffline === 'true') {
          const offlineId = await getOfflineUserId();
          const savedProfile = await getSetting('user_profile');

          set({
            user: { id: offlineId, email: 'offline@local' },
            profile: savedProfile ? JSON.parse(savedProfile) : createDefaultProfile(offlineId),
            isAuthenticated: true,
            isOfflineMode: true,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      }
    } catch {
      // Network error - try offline mode
      const offlineId = await getOfflineUserId();
      const savedProfile = await getSetting('user_profile');

      set({
        user: { id: offlineId, email: 'offline@local' },
        profile: savedProfile ? JSON.parse(savedProfile) : createDefaultProfile(offlineId),
        isAuthenticated: true,
        isOfflineMode: true,
        isLoading: false,
      });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: { id: session.user.id, email: session.user.email || '' },
          profile: profile || createDefaultProfile(session.user.id),
          isAuthenticated: true,
          isOfflineMode: false,
        });
      } else if (event === 'SIGNED_OUT') {
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        });
      }
    });
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      set({
        user: { id: data.user.id, email: data.user.email || '' },
        profile: profile || createDefaultProfile(data.user.id),
        isAuthenticated: true,
        isOfflineMode: false,
      });
    }

    return { error: null };
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      // Create profile
      const newProfile = createDefaultProfile(data.user.id);
      await supabase.from('user_profiles').insert(newProfile);

      set({
        user: { id: data.user.id, email: data.user.email || '' },
        profile: newProfile,
        isAuthenticated: true,
        isOfflineMode: false,
      });
    }

    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await setSetting('offline_mode', 'false');
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isOfflineMode: false,
    });
  },

  continueOffline: async () => {
    await setSetting('offline_mode', 'true');
    const offlineId = await getOfflineUserId();
    const savedProfile = await getSetting('user_profile');
    const profile = savedProfile ? JSON.parse(savedProfile) : createDefaultProfile(offlineId);

    // Save profile if new
    if (!savedProfile) {
      await setSetting('user_profile', JSON.stringify(profile));
    }

    set({
      user: { id: offlineId, email: 'offline@local' },
      profile,
      isAuthenticated: true,
      isOfflineMode: true,
    });
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile, isOfflineMode } = get();
    if (!profile) return;

    const updatedProfile = { ...profile, ...updates, updated_at: new Date().toISOString() };

    if (isOfflineMode) {
      await setSetting('user_profile', JSON.stringify(updatedProfile));
    } else {
      await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);
    }

    set({ profile: updatedProfile });
  },
}));

function createDefaultProfile(userId: string): UserProfile {
  return {
    id: userId,
    display_name: null,
    experience_level: 'beginner' as ExperienceLevel,
    weight_unit: 'kg' as WeightUnit,
    height_cm: null,
    weight_kg: null,
    birth_date: null,
    sex: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
