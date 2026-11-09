import { col } from '../db.js';
import { newId, toStr, toObject } from '../utils.js';

/** Insert an activity entry; never throws (activity logging must not break a request). */
export async function logActivity(userId, { activity_type, title, description = '', metadata = {} }) {
  try {
    await col('user_activities').insertOne({
      _id: newId(),
      user_id: userId,
      activity_type: toStr(activity_type, 100) || 'activity',
      title: toStr(title, 300) || 'Activity',
      description: toStr(description, 1000),
      metadata: toObject(metadata),
      created_at: new Date(),
    });
  } catch (err) {
    console.warn('[activity] failed to log:', err.message);
  }
}
