const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { supabaseAdmin } = require('../supabaseClient');

// Initialize Firebase Admin SDK
let fcmInitialized = false;
try {
  const serviceAccount = require('../service-account-file.json');
  admin.initializeApp({
    credential: admin.cert(serviceAccount)
  });
  fcmInitialized = true;
  console.log("[Notification Engine] Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("[Notification Engine] Firebase Admin SDK initialization failed. Make sure service-account-file.json exists.", error.message);
}

// In-Memory Database for FCM Tokens: array of { userId, role, token }
const registeredTokens = [];

// In-Memory Database for Notification History & Delivery Logs
let deliveryLogs = [];

/**
 * POST /notifications/register-token
 * Registers an FCM push token for a user
 */
router.post('/register-token', (req, res) => {
  const { userId, role, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "Missing userId or token." });
  }

  // Remove existing entry for the token to prevent duplicates
  const existingIndex = registeredTokens.findIndex(rt => rt.token === token);
  if (existingIndex !== -1) {
    registeredTokens[existingIndex] = { userId, role: role || 'everyone', token };
  } else {
    registeredTokens.push({ userId, role: role || 'everyone', token });
  }

  console.log(`[Notification Engine] Registered FCM token for user: ${userId} (${role || 'everyone'}). Total active tokens: ${registeredTokens.length}`);

  res.status(200).json({ message: "FCM token registered successfully." });
});

/**
 * POST /notifications/send
 * Creates a notification in Supabase and logs simulated or real FCM delivery
 */
router.post('/send', async (req, res) => {
  const { title, body, audience, priority, senderId, gymId } = req.body;

  if (!title || !body || !audience) {
    return res.status(400).json({ error: "Missing title, body, or audience group." });
  }

  // default fallback gym ID matching demo seed
  const targetGymId = gymId || '8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f';

  // 1. Insert Notice row into Supabase
  const { data: newNotif, error: insertError } = await supabaseAdmin
    .from('notices')
    .insert({
      gym_id: targetGymId,
      created_by: senderId || null,
      title,
      body,
      priority: priority || 'normal',
      target_role: audience || 'all'
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: 'Failed to create notice in database: ' + insertError.message });
  }

  // 2. Filter target FCM tokens
  let tokens = [];
  if (audience === 'everyone' || audience === 'all') {
    tokens = registeredTokens.map(rt => rt.token);
  } else {
    tokens = registeredTokens
      .filter(rt => rt.role === audience)
      .map(rt => rt.token);
  }

  let targetCount = tokens.length;
  let deliveredCount = 0;
  let failedCount = 0;
  let fcmStatus = 'skipped';
  let messageDetail = "No registered devices found for target audience.";

  // 3. Dispatch multicast push notification if tokens are present
  if (targetCount > 0 && fcmInitialized) {
    const message = {
      notification: {
        title: priority === 'urgent' ? `🚨 URGENT: ${title}` : title,
        body
      },
      data: {
        noticeId: newNotif.id
      },
      android: {
        notification: {
          sound: 'default',
          priority: priority === 'urgent' ? 'high' : 'normal',
          color: '#6C47FF'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      deliveredCount = response.successCount;
      failedCount = response.failureCount;
      fcmStatus = 'completed';
      messageDetail = `Successfully sent ${deliveredCount} FCM push messages. Failed: ${failedCount}.`;
      console.log(`[Notification Engine] ${messageDetail}`);

      // Clean up failed tokens (stale tokens)
      if (response.responses) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (error && (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered')) {
              const failedToken = tokens[idx];
              const tIdx = registeredTokens.findIndex(rt => rt.token === failedToken);
              if (tIdx !== -1) {
                registeredTokens.splice(tIdx, 1);
                console.log(`[Notification Engine] Cleared invalid token: ${failedToken}`);
              }
            }
          }
        });
      }
    } catch (error) {
      fcmStatus = 'failed';
      failedCount = targetCount;
      messageDetail = `FCM Send Error: ${error.message}`;
      console.error('[Notification Engine] FCM Multicast error:', error);
    }
  } else if (targetCount > 0 && !fcmInitialized) {
    fcmStatus = 'failed';
    failedCount = targetCount;
    messageDetail = "Firebase Admin SDK is not initialized.";
    console.warn(`[Notification Engine] ${messageDetail}`);
  }

  // Generate delivery log (kept in-memory for session tracking)
  const newLog = {
    id: crypto.randomUUID(),
    notificationId: newNotif.id,
    title,
    audience,
    targetCount,
    deliveredCount,
    failedCount,
    status: fcmStatus,
    timestamp: newNotif.created_at
  };

  deliveryLogs.unshift(newLog);

  // Map to frontend expected response format
  const formattedNotice = {
    id: newNotif.id,
    title: newNotif.title,
    body: newNotif.body,
    priority: newNotif.priority,
    date: newNotif.created_at.split('T')[0],
    gymId: newNotif.gym_id,
    audience: newNotif.target_role
  };

  res.status(201).json({
    message: messageDetail,
    notification: formattedNotice,
    deliveryLog: newLog
  });
});

/**
 * GET /notifications/history
 * Fetch past posted announcements
 */
router.get('/history', async (req, res) => {
  const { gymId } = req.query;

  let query = supabaseAdmin
    .from('notices')
    .select('*, profiles(full_name)')
    .eq('is_deleted', false);

  if (gymId) {
    query = query.eq('gym_id', gymId);
  }

  const { data: notices, error: fetchError } = await query.order('created_at', { ascending: false });

  if (fetchError) {
    return res.status(500).json({ error: 'Failed to fetch notice history: ' + fetchError.message });
  }

  const results = notices.map(n => ({
    id: n.id,
    title: n.title,
    body: n.body,
    priority: n.priority,
    date: n.created_at.split('T')[0],
    gymId: n.gym_id,
    audience: n.target_role,
    senderName: n.profiles?.full_name || 'Owner'
  }));

  res.json(results);
});

/**
 * GET /notifications/logs
 * Fetch delivery logs/audit history
 */
router.get('/logs', (req, res) => {
  res.json(deliveryLogs);
});

/**
 * DELETE /notifications/history/:id
 * Delete an announcement from logs
 */
router.delete('/history/:id', async (req, res) => {
  const { id } = req.params;

  // Soft delete in database
  const { error: deleteError } = await supabaseAdmin
    .from('notices')
    .update({ is_deleted: true })
    .eq('id', id);

  if (deleteError) {
    return res.status(500).json({ error: 'Failed to delete notice: ' + deleteError.message });
  }

  deliveryLogs = deliveryLogs.filter(l => l.notificationId !== id);
  res.json({ message: "Notification cleared from database history logs." });
});

module.exports = router;
