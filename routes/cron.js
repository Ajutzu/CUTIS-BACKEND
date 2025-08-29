import cron from "node-cron";
import User from "./../models/user.js";

// Deactivate users inactive for 30 minutes
cron.schedule("*/10 * * * *", async () => {
  try {
    const now = new Date();
    const threshold = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

    const result = await User.updateMany(
      { is_active: true, updatedAt: { $lt: threshold } },
      { $set: { is_active: false } }
    );

    console.log(`${result.modifiedCount} users automatically deactivated`);
  } catch (err) {
    console.error("Error in auto-deactivation cron job:", err);
  }
});
