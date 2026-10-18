-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'gym_owner',
    'trainer',
    'member'
);

CREATE TYPE subscription_status AS ENUM (
    'trial',
    'active',
    'expired',
    'cancelled',
    'suspended'
);

CREATE TYPE member_status AS ENUM (
    'active',
    'expired',
    'pending',
    'suspended',
    'inactive',
    'blocked'
);

CREATE TYPE attendance_method AS ENUM (
    'qr_scan',
    'manual',
    'self_checkin'
);

CREATE TYPE invoice_status AS ENUM (
    'paid',
    'pending',
    'overdue',
    'cancelled'
);

CREATE TYPE notice_priority AS ENUM (
    'normal',
    'urgent'
);

CREATE TYPE goal_type AS ENUM (
    'weight_loss',
    'weight_gain',
    'maintenance',
    'muscle_gain'
);

CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'other'
);
