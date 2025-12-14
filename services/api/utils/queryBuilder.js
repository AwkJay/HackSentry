export const buildHackathonQuery = (query) => {
  const filter = {};
  const today = new Date();

  if (query.status) filter.status = query.status;

  if (query.mode) filter.participation_mode = query.mode;

  if (query.platform) filter.platform = query.platform;

  if (query.country) filter["location.country"] = query.country;
  if (query.state) filter["location.state"] = query.state;
  if (query.city) filter["location.city"] = query.city;

  if (query.tags)
    filter.tags = { $in: query.tags.split(",") };

  if (query.minPrize || query.maxPrize) {
    filter["prize_money.total"] = {};
    if (query.minPrize) filter["prize_money.total"].$gte = Number(query.minPrize);
    if (query.maxPrize) filter["prize_money.total"].$lte = Number(query.maxPrize);
  }

  /* Deadline filters */
  if (query.deadline === "7days") {
    filter.registration_deadline = {
      $gte: today,
      $lte: new Date(today.getTime() + 7 * 86400000),
    };
  } else if (query.deadline === "14days") {
    filter.registration_deadline = {
      $gte: today,
      $lte: new Date(today.getTime() + 14 * 86400000),
    };
  } else if (query.deadline === "30days") {
    filter.registration_deadline = {
      $gte: today,
      $lte: new Date(today.getTime() + 30 * 86400000),
    };
  }

  /* 🔥 Closing Soon filter - deadline within X days */
  if (query.closingSoon === "true") {
    filter.registration_deadline = {
      $gte: today,
      $lte: new Date(today.getTime() + 7 * 86400000),
    };
    filter.status = { $in: ["upcoming", "ongoing"] };
  }

  if (query.closingIn) {
    const days = Number(query.closingIn);
    filter.registration_deadline = {
      $gte: today,
      $lte: new Date(today.getTime() + days * 86400000),
    };
  }

  /* Team size filters */
  if (query.teamSizeMin) {
    filter["team_size.min"] = { $gte: Number(query.teamSizeMin) };
  }
  if (query.teamSizeMax) {
    filter["team_size.max"] = { $lte: Number(query.teamSizeMax) };
  }
  if (query.soloAllowed === "true") {
    filter["team_size.solo_allowed"] = true;
  }

  /* Organizer filters */
  if (query.verified === "true") {
    filter["organizer.verified"] = true;
  }
  if (query.organizerType) {
    filter["organizer.type"] = query.organizerType;
  }

  /* Has prize filter */
  if (query.hasPrize === "true") {
    filter["prize_money.has_prize"] = true;
  }

  return filter;
};

/* Get sorting configuration */
export const buildSortConfig = (query) => {
  const { sortBy = "urgency_score", order = "desc" } = query;

  const sortOrder = order === "desc" ? -1 : 1;

  /* Map sort aliases */
  const sortMap = {
    urgency: "computed_fields.urgency_score",
    urgency_score: "computed_fields.urgency_score",
    deadline: "registration_deadline",
    start_date: "start_date",
    prize: "prize_money.total",
    bookmarks: "metadata.bookmark_count",
    views: "metadata.view_count",
    trending: "metadata.bookmark_count",
    recent: "metadata.added_date",
  };

  const sortField = sortMap[sortBy] || sortBy;

  return { [sortField]: sortOrder };
};
