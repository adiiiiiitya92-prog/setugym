import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be defined in your environment.');
}

// Custom Database Types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'super_admin' | 'gym_owner' | 'trainer' | 'member';
          gym_id: string | null;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'super_admin' | 'gym_owner' | 'trainer' | 'member';
          gym_id?: string | null;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'super_admin' | 'gym_owner' | 'trainer' | 'member';
          gym_id?: string | null;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      gyms: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          logo_url: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          pincode: string;
          phone: string | null;
          email: string | null;
          gst_number: string | null;
          website: string | null;
          timezone: string;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          logo_url?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          pincode: string;
          phone?: string | null;
          email?: string | null;
          gst_number?: string | null;
          website?: string | null;
          timezone?: string;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          logo_url?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          phone?: string | null;
          email?: string | null;
          gst_number?: string | null;
          website?: string | null;
          timezone?: string;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          billing_cycle: 'monthly' | 'yearly';
          max_members: number;
          max_trainers: number;
          max_gyms: number;
          features: Json;
          is_highlighted: boolean;
          is_active: boolean;
          sort_order: number;
          is_deleted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          billing_cycle: 'monthly' | 'yearly';
          max_members: number;
          max_trainers: number;
          max_gyms?: number;
          features?: Json;
          is_highlighted?: boolean;
          is_active?: boolean;
          sort_order?: number;
          is_deleted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          billing_cycle?: 'monthly' | 'yearly';
          max_members?: number;
          max_trainers?: number;
          max_gyms?: number;
          features?: Json;
          is_highlighted?: boolean;
          is_active?: boolean;
          sort_order?: number;
          is_deleted?: boolean;
          created_at?: string;
        };
      };
      gym_subscriptions: {
        Row: {
          id: string;
          gym_id: string;
          plan_id: string | null;
          status: 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended';
          trial_started_at: string;
          trial_ends_at: string;
          current_period_start: string | null;
          current_period_end: string | null;
          amount_paid: number | null;
          payment_reference: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          plan_id?: string | null;
          status?: 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended';
          trial_started_at?: string;
          trial_ends_at?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          amount_paid?: number | null;
          payment_reference?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          plan_id?: string | null;
          status?: 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended';
          trial_started_at?: string;
          trial_ends_at?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          amount_paid?: number | null;
          payment_reference?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      membership_plans: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          duration_days: number;
          price: number;
          features: Json;
          color_tag: string;
          is_popular: boolean;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          duration_days: number;
          price: number;
          features?: Json;
          color_tag?: string;
          is_popular?: boolean;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          duration_days?: number;
          price?: number;
          features?: Json;
          color_tag?: string;
          is_popular?: boolean;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          gym_id: string;
          member_code: string | null;
          membership_plan_id: string | null;
          assigned_trainer_id: string | null;
          date_of_birth: string | null;
          gender: 'male' | 'female' | 'other' | null;
          address: string | null;
          emergency_contact: string | null;
          join_date: string;
          expiry_date: string | null;
          status: 'active' | 'expired' | 'pending' | 'suspended' | 'inactive' | 'blocked';
          qr_payload: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gym_id: string;
          member_code?: string | null;
          membership_plan_id?: string | null;
          assigned_trainer_id?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          address?: string | null;
          emergency_contact?: string | null;
          join_date?: string;
          expiry_date?: string | null;
          status?: 'active' | 'expired' | 'pending' | 'suspended' | 'inactive' | 'blocked';
          qr_payload?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_code?: string | null;
          membership_plan_id?: string | null;
          assigned_trainer_id?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          address?: string | null;
          emergency_contact?: string | null;
          join_date?: string;
          expiry_date?: string | null;
          status?: 'active' | 'expired' | 'pending' | 'suspended' | 'inactive' | 'blocked';
          qr_payload?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          gym_id: string;
          specialization: string | null;
          schedule: Json;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gym_id: string;
          specialization?: string | null;
          schedule?: Json;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          specialization?: string | null;
          schedule?: Json;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          scanned_by: string | null;
          method: 'qr_scan' | 'manual' | 'self_checkin';
          check_in_time: string;
          check_in_date: string;
          check_out_time: string | null;
          duration: number | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          scanned_by?: string | null;
          method?: 'qr_scan' | 'manual' | 'self_checkin';
          check_in_time?: string;
          check_in_date?: string;
          check_out_time?: string | null;
          duration?: number | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_id?: string;
          scanned_by?: string | null;
          method?: 'qr_scan' | 'manual' | 'self_checkin';
          check_in_time?: string;
          check_in_date?: string;
          check_out_time?: string | null;
          duration?: number | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      diet_plans: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          created_by: string | null;
          title: string;
          goal: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
          daily_calories: number;
          meals: Json;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          created_by?: string | null;
          title: string;
          goal: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
          daily_calories: number;
          meals?: Json;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_id?: string;
          created_by?: string | null;
          title?: string;
          goal?: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
          daily_calories?: number;
          meals?: Json;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_plans: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          created_by: string | null;
          title: string;
          goal: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
          days_per_week: number;
          schedule: Json;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          created_by?: string | null;
          title: string;
          goal: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
          days_per_week: number;
          schedule?: Json;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_id?: string;
          created_by?: string | null;
          title?: string;
          goal?: 'weight_loss' | 'weight_gain' | 'maintenance' | 'muscle_gain';
          days_per_week?: number;
          schedule?: Json;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_completions: {
        Row: {
          id: string;
          workout_plan_id: string;
          member_id: string;
          day_name: string;
          exercise_name: string;
          completed_at: string;
          completion_date: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workout_plan_id: string;
          member_id: string;
          day_name: string;
          exercise_name: string;
          completed_at?: string;
          completion_date?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workout_plan_id?: string;
          member_id?: string;
          day_name?: string;
          exercise_name?: string;
          completed_at?: string;
          completion_date?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          invoice_number: string;
          membership_plan_id: string | null;
          subtotal: number;
          tax_percent: number;
          tax_amount: number;
          total_amount: number;
          status: 'paid' | 'pending' | 'overdue' | 'cancelled';
          due_date: string | null;
          paid_date: string | null;
          payment_method: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          invoice_number: string;
          membership_plan_id?: string | null;
          subtotal: number;
          tax_percent?: number;
          tax_amount: number;
          total_amount: number;
          status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
          due_date?: string | null;
          paid_date?: string | null;
          payment_method?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_id?: string;
          invoice_number?: string;
          membership_plan_id?: string | null;
          subtotal?: number;
          tax_percent?: number;
          tax_amount?: number;
          total_amount?: number;
          status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
          due_date?: string | null;
          paid_date?: string | null;
          payment_method?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_reminders: {
        Row: {
          id: string;
          invoice_id: string;
          member_id: string;
          sent_at: string;
          sent_via: string;
          message: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          member_id: string;
          sent_at?: string;
          sent_via: string;
          message: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          member_id?: string;
          sent_at?: string;
          sent_via?: string;
          message?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notices: {
        Row: {
          id: string;
          gym_id: string;
          created_by: string | null;
          title: string;
          body: string;
          priority: 'normal' | 'urgent';
          target_role: string;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          created_by?: string | null;
          title: string;
          body: string;
          priority?: 'normal' | 'urgent';
          target_role?: string;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          created_by?: string | null;
          title?: string;
          body?: string;
          priority?: 'normal' | 'urgent';
          target_role?: string;
          is_active?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      body_stats: {
        Row: {
          id: string;
          member_id: string;
          weight_kg: number;
          height_cm: number;
          bmi: number | null;
          chest_cm: number | null;
          waist_cm: number | null;
          hips_cm: number | null;
          logged_at: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          weight_kg: number;
          height_cm: number;
          bmi?: number | null;
          chest_cm?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          logged_at?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          weight_kg?: number;
          height_cm?: number;
          bmi?: number | null;
          chest_cm?: number | null;
          waist_cm?: number | null;
          hips_cm?: number | null;
          logged_at?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      progress_photos: {
        Row: {
          id: string;
          member_id: string;
          photo_url: string;
          taken_at: string;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          photo_url: string;
          taken_at?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          photo_url?: string;
          taken_at?: string;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      is_gym_active: {
        Args: { gym_id_param: string };
        Returns: boolean;
      };
      get_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: 'super_admin' | 'gym_owner' | 'trainer' | 'member';
      };
      get_user_gym_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      generate_member_code: {
        Args: { gym_id_param: string };
        Returns: string;
      };
      generate_invoice_number: {
        Args: { gym_id_param: string };
        Returns: string;
      };
    };
  };
}

// Supabase Client Initialization with AsyncStorage for Expo
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// =============================================================================
// CLIENT HELPER FUNCTIONS
// =============================================================================

/**
 * Sign in a user with email and password.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out the current user session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Fetch the profile details of the currently authenticated user.
 */
export async function getCurrentProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  return profile;
}

export interface Profile {
  id: string;
  role: 'super_admin' | 'gym_owner' | 'trainer' | 'member';
  gym_id: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch the current active Supabase session.
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}


/**
 * Fetch the gym details associated with the current user.
 */
export async function getMyGym() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.gym_id) return null;

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', profile.gym_id)
    .single();

  if (gymError) throw gymError;
  return gym;
}

/**
 * Upload a file to a specific Supabase storage bucket.
 * @param bucket Storage bucket name (e.g. 'gym-logos', 'member-avatars', 'progress-photos')
 * @param path Target filepath within the bucket
 * @param file File object or Blob to upload
 */
export async function uploadFile(bucket: string, path: string, file: Blob | ArrayBuffer | any) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;
  
  // Return the public URL if it is a public bucket, or the storage path
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    path: data.path,
    publicUrl: publicUrlData?.publicUrl || null,
  };
}
