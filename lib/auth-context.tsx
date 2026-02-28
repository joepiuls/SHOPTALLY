import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Appearance, Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  loadOnboardingStatus,
  saveOnboardingDone,
  clearOnboardingDone,
  loadCachedUserProfile,
  saveCachedUserProfile,
  clearCachedUserProfile,
  loadCachedPermissions,
  saveCachedPermissions,
  clearCachedPermissions,
  loadAppSettings,
  saveAppSettings,
  loadSyncQueue,
  clearAppData,
} from './storage';
import NetInfo from '@react-native-community/netinfo';
import { startSyncListener } from './sync';
import { setupNotificationChannels, registerForPushNotifications } from './notifications';
import type {
  UserProfile,
  StaffPermissions,
  AppSettings,
  StaffRole,
  ShopProfile,
} from './types';

interface AuthContextValue {
  // State
  session: Session | null;
  user: UserProfile | null;
  permissions: StaffPermissions | null; // null = owner (all access)
  appSettings: AppSettings;
  isLoading: boolean;
  isOnboardingDone: boolean;

  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Setup actions
  createShop: (shopData: Partial<ShopProfile> & { name: string }) => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Staff management (owner-only)
  inviteStaff: (email: string, role: StaffRole) => Promise<void>;
  updateStaffPermissions: (staffId: string, perms: Partial<StaffPermissions>) => Promise<void>;
  deactivateStaff: (staffId: string) => Promise<void>;
  fetchShopStaff: () => Promise<UserProfile[]>;

  // Settings
  updateAppSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // Refresh
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'system',
    notificationsEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingDone, setIsOnboardingDone] = useState(false);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, shop:shops(*)')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        // Fall back to cached profile if network fails
        const cached = await loadCachedUserProfile();
        if (cached) setUser(cached);
        return;
      }

      const userProfile: UserProfile = {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        shop_id: profile.shop_id,
        is_active: profile.is_active,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        shop: profile.shop ?? null,
      };

      setUser(userProfile);
      await saveCachedUserProfile(userProfile);
      registerForPushNotifications().catch(() => {});

      // Load permissions for non-owners
      if (profile.role !== 'owner' && profile.shop_id) {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('*')
          .eq('staff_id', userId)
          .eq('shop_id', profile.shop_id)
          .single();

        if (perms) {
          setPermissions(perms as StaffPermissions);
          await saveCachedPermissions(perms as StaffPermissions);
        } else {
          // No permissions row yet — default to minimal access
          setPermissions({
            id: '',
            staff_id: userId,
            shop_id: profile.shop_id,
            can_access_dashboard: true,
            can_access_products: false,
            can_access_marketplace: false,
            can_access_orders: false,
            can_access_sales: false,
            can_access_reports: false,
            can_access_staff: false,
            can_access_settings: false,
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        // Owner: null permissions = all access
        setPermissions(null);
        await clearCachedPermissions();
      }
    } catch {
      // Network error — use cache
      const cached = await loadCachedUserProfile();
      const cachedPerms = await loadCachedPermissions();
      if (cached) setUser(cached);
      if (cachedPerms) setPermissions(cachedPerms);
    }
  }, []);

  // Initialise: restore session + load cached state
  useEffect(() => {
    const init = async () => {
      const [onboardingFlag, settings, { data: { session: existingSession } }] = await Promise.all([
        loadOnboardingStatus(),
        loadAppSettings(),
        supabase.auth.getSession(),
      ]);

      setIsOnboardingDone(onboardingFlag);
      setAppSettings(settings);
      Appearance.setColorScheme(settings.theme === 'system' ? null : settings.theme);

      if (existingSession) {
        setSession(existingSession);
        await loadUserProfile(existingSession.user.id);
      } else {
        // Load cached profile for offline display while we know there's no session
        const cached = await loadCachedUserProfile();
        if (cached) setUser(cached);
      }

      setIsLoading(false);
    };

    setupNotificationChannels();
    init();

    // Listen for auth state changes (token refresh, sign out, sign in from deep link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          await loadUserProfile(newSession.user.id);
        } else {
          setUser(null);
          setPermissions(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange handles updating session + profile
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const doSignOut = async () => {
      await supabase.auth.signOut();
      await clearCachedUserProfile();
      await clearCachedPermissions();
      await clearAppData();
      setUser(null);
      setPermissions(null);
      setSession(null);
    };

    const [netState, queue] = await Promise.all([NetInfo.fetch(), loadSyncQueue()]);

    if (queue.length > 0 && !netState.isConnected) {
      Alert.alert(
        'Unsynced Changes',
        'You have offline changes that haven\'t been uploaded yet. Logging out will erase them.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log out anyway', style: 'destructive', onPress: doSignOut },
        ]
      );
      return;
    }

    await doSignOut();
  }, []);

  const signOutAllDevices = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' });
    await clearCachedUserProfile();
    await clearCachedPermissions();
    setUser(null);
    setPermissions(null);
    setSession(null);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'shoptally://auth/reset-password',
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const createShop = useCallback(async (shopData: Partial<ShopProfile> & { name: string }) => {
    if (!session?.user) throw new Error('Not authenticated');

    const { data: shop, error } = await supabase
      .from('shops')
      .insert({
        name: shopData.name,
        phone: shopData.phone ?? '',
        address: shopData.address ?? '',
        bio: shopData.bio ?? '',
        accent_color: shopData.accentColor ?? '#C2410C',
        language: shopData.language ?? 'en',
        owner_id: session.user.id,
        opening_hours: shopData.openingHours ?? [],
        delivery_radius: shopData.deliveryRadius ?? 10,
      })
      .select()
      .single();

    if (error) throw error;

    // Link profile to the new shop and set role as owner
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ shop_id: shop.id, role: 'owner' })
      .eq('id', session.user.id);

    if (profileError) throw profileError;

    await loadUserProfile(session.user.id);
  }, [session, loadUserProfile]);

  const completeOnboarding = useCallback(async () => {
    await saveOnboardingDone();
    setIsOnboardingDone(true);
  }, []);

  const inviteStaff = useCallback(async (email: string, role: StaffRole) => {
    if (!user?.shop_id) throw new Error('No shop found');

    const { error } = await supabase.functions.invoke('invite-staff', {
      body: { email, role, shop_id: user.shop_id },
    });

    if (error) throw error;
  }, [user]);

  const updateStaffPermissions = useCallback(
    async (staffId: string, perms: Partial<StaffPermissions>) => {
      if (!user?.shop_id) throw new Error('No shop found');

      const { error } = await supabase
        .from('staff_permissions')
        .upsert(
          {
            staff_id: staffId,
            shop_id: user.shop_id,
            ...perms,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'staff_id,shop_id' }
        );

      if (error) throw error;
    },
    [user]
  );

  const deactivateStaff = useCallback(async (staffId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', staffId);

    if (error) throw error;
  }, []);

  const fetchShopStaff = useCallback(async (): Promise<UserProfile[]> => {
    if (!user?.shop_id) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*, permissions:staff_permissions(*)')
      .eq('shop_id', user.shop_id)
      .neq('id', session?.user.id ?? '') // exclude self
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as UserProfile[];
  }, [user, session]);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    await clearCachedUserProfile();
    await clearCachedPermissions();
    await clearOnboardingDone(); // Ensure onboarding runs again after account deletion
    setUser(null);
    setPermissions(null);
    setSession(null);
    setIsOnboardingDone(false);
  }, []);

  const updateAppSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setAppSettings(prev => {
      const next = { ...prev, ...updates };
      saveAppSettings(next);
      if (updates.theme !== undefined) {
        Appearance.setColorScheme(updates.theme === 'system' ? null : updates.theme);
      }
      return next;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) {
      await loadUserProfile(session.user.id);
    }
  }, [session, loadUserProfile]);

  // Start offline sync listener when user's shop_id is known
  useEffect(() => {
    if (!user?.shop_id) return;
    const unsubscribe = startSyncListener(user.shop_id);
    return unsubscribe;
  }, [user?.shop_id]);

  const value: AuthContextValue = {
    session,
    user,
    permissions,
    appSettings,
    isLoading,
    isOnboardingDone,
    signIn,
    signUp,
    signOut,
    signOutAllDevices,
    sendPasswordReset,
    updatePassword,
    deleteAccount,
    createShop,
    completeOnboarding,
    inviteStaff,
    updateStaffPermissions,
    deactivateStaff,
    fetchShopStaff,
    updateAppSettings,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
