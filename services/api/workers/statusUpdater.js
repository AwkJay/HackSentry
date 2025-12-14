import UnifiedHackathon from "../model/UnifiedHackathon.js";

/* Update hackathon statuses and computed fields */
export const updateHackathonStatus = async () => {
  const today = new Date();

  console.log(`📊 [${today.toISOString()}] Updating hackathon statuses...`);

  try {
    const hackathons = await UnifiedHackathon.find();
    let updated = 0;

    for (const h of hackathons) {
      const oldStatus = h.status;

      /* Update status based on dates */
      if (h.end_date && h.end_date < today) {
        h.status = "past";
      } else if (h.start_date && h.start_date <= today && (!h.end_date || h.end_date >= today)) {
        h.status = "ongoing";
      } else if (h.start_date && h.start_date > today) {
        h.status = "upcoming";
      }

      /* Calculate days until event */
      if (h.start_date) {
        h.computed_fields = h.computed_fields || {};
        h.computed_fields.days_until_event = Math.ceil(
          (h.start_date - today) / 86400000
        );
      }

      /* Calculate days until deadline */
      if (h.registration_deadline) {
        h.computed_fields = h.computed_fields || {};
        h.computed_fields.days_until_deadline = Math.ceil(
          (h.registration_deadline - today) / 86400000
        );

        /* 🔥 Calculate urgency score */
        h.computed_fields.urgency_score = calculateUrgencyScore(h, today);
      }

      /* Only save if something changed */
      if (h.isModified()) {
        await h.save();
        updated++;
      }
    }

    console.log(`✅ Updated ${updated} hackathons`);
    return updated;
  } catch (error) {
    console.error(`❌ Status update failed: ${error.message}`);
    throw error;
  }
};

/* 
  Calculate urgency score (0-100)
  Higher = more urgent/attractive
*/
const calculateUrgencyScore = (hackathon, today) => {
  let score = 0;
  const h = hackathon;

  /* Deadline proximity (max 40 points) */
  if (h.registration_deadline) {
    const daysUntil = Math.ceil((h.registration_deadline - today) / 86400000);

    if (daysUntil <= 0) {
      score += 0; // Past deadline
    } else if (daysUntil <= 1) {
      score += 40; // Last day!
    } else if (daysUntil <= 3) {
      score += 35;
    } else if (daysUntil <= 7) {
      score += 30;
    } else if (daysUntil <= 14) {
      score += 20;
    } else if (daysUntil <= 30) {
      score += 10;
    } else {
      score += 5;
    }
  }

  /* Prize money (max 25 points) */
  if (h.prize_money?.total) {
    const prize = h.prize_money.total;
    if (prize >= 1000000) score += 25;       // 10L+
    else if (prize >= 500000) score += 22;   // 5L+
    else if (prize >= 100000) score += 18;   // 1L+
    else if (prize >= 50000) score += 14;    // 50K+
    else if (prize >= 10000) score += 10;    // 10K+
    else score += 5;
  }

  /* Bookmark count - social proof (max 20 points) */
  if (h.metadata?.bookmark_count) {
    const bookmarks = h.metadata.bookmark_count;
    score += Math.min(20, bookmarks * 2);
  }

  /* View count (max 10 points) */
  if (h.metadata?.view_count) {
    const views = h.metadata.view_count;
    score += Math.min(10, Math.floor(views / 10));
  }

  /* Verified organizer bonus (5 points) */
  if (h.organizer?.verified) {
    score += 5;
  }

  return Math.min(100, score);
};

export default { updateHackathonStatus };
