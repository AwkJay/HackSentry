import cron from "node-cron";
import Bookmark from "../model/Bookmark.js";
import User from "../model/User.js";

/* 
  Reminder Worker - checks bookmarks and sends reminders
  Runs every hour
*/

const REMINDER_THRESHOLDS = {
  days_7: 7 * 24 * 60 * 60 * 1000,   // 7 days in ms
  days_2: 2 * 24 * 60 * 60 * 1000,   // 2 days in ms
  hours_12: 12 * 60 * 60 * 1000,     // 12 hours in ms
};

/* Check if we should send a reminder */
const shouldSendReminder = (deadline, threshold) => {
  const now = new Date();
  const deadlineMs = new Date(deadline).getTime();
  const timeUntil = deadlineMs - now.getTime();

  /* Check if within threshold window (threshold -> threshold - 1 hour) */
  return timeUntil > 0 && timeUntil <= threshold && timeUntil > threshold - 3600000;
};

/* Process reminders for a specific threshold */
const processReminders = async (thresholdKey, thresholdMs) => {
  const now = new Date();
  const reminderField = `reminder_settings.${thresholdKey}`;
  const sentField = `notifications_sent.${thresholdKey}`;

  /* Find bookmarks that:
     1. Have this reminder enabled
     2. Haven't been sent this reminder yet
     3. Hackathon deadline is within threshold
  */
  const bookmarks = await Bookmark.find({
    [reminderField]: true,
    [sentField]: false,
  }).populate([
    { path: "hackathon", select: "title slug registration_deadline url" },
    { path: "user", select: "email name preferences" },
  ]);

  const remindersToSend = [];

  for (const bookmark of bookmarks) {
    if (!bookmark.hackathon?.registration_deadline) continue;

    /* Check user's notification preferences */
    const userPref = bookmark.user?.preferences?.notification_settings;
    if (!userPref?.email_enabled) continue;
    if (!userPref?.[`reminder_${thresholdKey.replace("days_", "").replace("hours_", "")}days`]) continue;

    if (shouldSendReminder(bookmark.hackathon.registration_deadline, thresholdMs)) {
      remindersToSend.push({
        bookmark,
        user: bookmark.user,
        hackathon: bookmark.hackathon,
        reminderType: thresholdKey,
      });
    }
  }

  /* Send reminders and mark as sent */
  for (const reminder of remindersToSend) {
    try {
      /* TODO: Integrate email service (Resend/SendGrid) */
      console.log(
        `📧 [REMINDER] Would send ${reminder.reminderType} reminder to ${reminder.user.email} for "${reminder.hackathon.title}"`
      );

      /* Mark as sent */
      await Bookmark.findByIdAndUpdate(reminder.bookmark._id, {
        [`notifications_sent.${thresholdKey}`]: true,
      });
    } catch (error) {
      console.error(`Error sending reminder: ${error.message}`);
    }
  }

  return remindersToSend.length;
};

/* Main reminder check function */
export const checkReminders = async () => {
  console.log(`🔔 [${new Date().toISOString()}] Running reminder check...`);

  try {
    const sent7days = await processReminders("days_7", REMINDER_THRESHOLDS.days_7);
    const sent2days = await processReminders("days_2", REMINDER_THRESHOLDS.days_2);
    const sent12hours = await processReminders("hours_12", REMINDER_THRESHOLDS.hours_12);

    console.log(
      `✅ Reminders sent: 7-day=${sent7days}, 2-day=${sent2days}, 12-hour=${sent12hours}`
    );
  } catch (error) {
    console.error(`❌ Reminder check failed: ${error.message}`);
  }
};

/* Schedule the cron job - runs every hour */
export const startReminderWorker = () => {
  console.log("🚀 Starting reminder worker (runs hourly)...");

  /* Run every hour at minute 0 */
  cron.schedule("0 * * * *", () => {
    checkReminders();
  });

  /* Also run immediately on startup for testing */
  // checkReminders();
};

export default { checkReminders, startReminderWorker };
