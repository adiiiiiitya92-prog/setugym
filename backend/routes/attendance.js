const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');

/**
 * Calculates geodetic distance in meters using Haversine formula
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

/**
 * POST /attendance/checkin
 * Logs check-in if token is valid and user is within 100 meters of boundary coordinates.
 */
router.post('/checkin', async (req, res) => {
  const {
    userId,
    userName,
    role, // 'member' | 'trainer'
    gymId,
    userLatitude,
    userLongitude,
    qrLatitude,
    qrLongitude,
    qrGeneratedAt,
    qrToken
  } = req.body;

  // 1. Validate inputs
  if (!userId || !userName || !role || !gymId || userLatitude === undefined || userLongitude === undefined || qrLatitude === undefined || qrLongitude === undefined || !qrGeneratedAt) {
    return res.status(400).json({ error: "Missing required check-in parameters." });
  }

  // 2. Token expiration check (10 minutes)
  const generatedTime = new Date(qrGeneratedAt).getTime();
  const now = new Date().getTime();
  const diffMins = (now - generatedTime) / (1000 * 60);

  if (diffMins > 10 || diffMins < -1) {
    return res.status(400).json({ error: "QR code is expired. Ask gym reception to regenerate code." });
  }

  // 3. Location geofence validation (100 meters)
  const distance = getDistance(userLatitude, userLongitude, qrLatitude, qrLongitude);
  if (distance > 100) {
    return res.status(400).json({ 
      error: `Too far from gym! You are ${Math.round(distance)} meters away. Must be within 100 meters.` 
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // 4. Save check-in record to database
  const { data: newRecord, error: insertError } = await supabaseAdmin
    .from('attendance')
    .insert({
      gym_id: gymId,
      member_id: userId,
      scanned_by: null, // self check-in
      method: 'self_checkin',
      check_in_time: new Date().toISOString(),
      check_in_date: todayStr
    })
    .select()
    .single();

  if (insertError) {
    // Unique daily constraint error handling
    if (insertError.code === '23505') {
      return res.status(400).json({ error: "Already checked in. Double check-ins are not permitted." });
    }
    return res.status(500).json({ error: 'Failed to register check-in: ' + insertError.message });
  }

  // Format to match frontend structure
  const formattedRecord = {
    id: newRecord.id,
    userId: newRecord.member_id,
    userName,
    role,
    gymId: newRecord.gym_id,
    date: newRecord.check_in_date,
    checkInTime: new Date(newRecord.check_in_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    checkOutTime: null,
    status: 'checked_in',
    duration: 0,
    scannedBy: "Self QR",
    method: 'qr'
  };

  res.status(201).json({
    message: "Check-in registered successfully!",
    record: formattedRecord
  });
});

/**
 * POST /attendance/checkout
 * Logs checkout if active session exists and at least 30 minutes have elapsed.
 */
router.post('/checkout', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId for checkout verification." });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Find today's active check-in record
  const { data: record, error: fetchError } = await supabaseAdmin
    .from('attendance')
    .select('*, profiles(full_name, role)')
    .eq('member_id', userId)
    .eq('check_in_date', todayStr)
    .is('check_out_time', null)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: 'Database search error: ' + fetchError.message });
  }

  if (!record) {
    return res.status(404).json({ error: "No active check-in session found for today." });
  }

  // Validate duration elapsed (at least 30 minutes)
  const checkInDate = new Date(record.check_in_time);
  const now = new Date();
  const elapsedMinutes = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60));

  if (elapsedMinutes < 30) {
    const remaining = 30 - elapsedMinutes;
    return res.status(400).json({
      error: `⏳ You must stay at least 30 minutes before checking out. ${remaining} minutes remaining.`
    });
  }

  // Update check-out details in database
  const { data: updatedRecord, error: updateError } = await supabaseAdmin
    .from('attendance')
    .update({
      check_out_time: now.toISOString(),
      duration: elapsedMinutes
    })
    .eq('id', record.id)
    .select('*, profiles(full_name, role)')
    .single();

  if (updateError) {
    return res.status(500).json({ error: 'Failed to record checkout: ' + updateError.message });
  }

  const formattedRecord = {
    id: updatedRecord.id,
    userId: updatedRecord.member_id,
    userName: updatedRecord.profiles?.full_name || 'Member',
    role: updatedRecord.profiles?.role || 'member',
    gymId: updatedRecord.gym_id,
    date: updatedRecord.check_in_date,
    checkInTime: new Date(updatedRecord.check_in_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    checkOutTime: new Date(updatedRecord.check_out_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    status: 'checked_out',
    duration: updatedRecord.duration,
    scannedBy: updatedRecord.scanned_by || "Self QR",
    method: 'qr'
  };

  res.json({
    message: "Checked out successfully!",
    record: formattedRecord
  });
});

/**
 * GET /attendance/today
 * Retrieve today's attendance logs, optionally filtered by role
 */
router.get('/today', async (req, res) => {
  const { role, gymId } = req.query;
  const todayStr = new Date().toISOString().split('T')[0];

  let query = supabaseAdmin
    .from('attendance')
    .select('*, profiles(full_name, role)')
    .eq('check_in_date', todayStr);

  if (gymId) {
    query = query.eq('gym_id', gymId);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch today\'s logs: ' + error.message });
  }

  // Format database data to match frontend structure
  let records = data.map(r => ({
    id: r.id,
    userId: r.member_id,
    userName: r.profiles?.full_name || 'Member',
    role: r.profiles?.role || 'member',
    gymId: r.gym_id,
    date: r.check_in_date,
    checkInTime: new Date(r.check_in_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    checkOutTime: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : null,
    status: r.check_out_time ? 'checked_out' : 'checked_in',
    duration: r.duration || 0,
    scannedBy: r.scanned_by || "Self QR",
    method: r.method === 'self_checkin' ? 'qr' : 'manual'
  }));

  if (role && (role === 'member' || role === 'trainer')) {
    records = records.filter(r => r.role === role);
  }

  res.json({
    date: todayStr,
    count: records.length,
    records: records
  });
});

module.exports = router;
