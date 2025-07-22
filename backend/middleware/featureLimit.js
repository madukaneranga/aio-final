export const checkFeatureAccess = (featureName) => {
  return (req, res, next) => {
    const featureAccess = req.package?.[featureName];

    if (!featureAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Your current plan does not support "${featureName}".`,
      });
    }

    next();
  };
};

export const checkFeatureLimit = (featureName, getCurrentCount) => {
  return async (req, res, next) => {
    try {
      const limit = req.package?.[featureName];

      // If the limit is not defined or not a number, allow by default
      if (typeof limit !== "number") return next();

      const currentCount = await getCurrentCount(req);

      if (currentCount >= limit) {
        return res.status(403).json({
          success: false,
          message: `Limit exceeded: Only ${limit} ${featureName} allowed.`,
        });
      }

      next();
    } catch (err) {
      console.error(`Error in checkFeatureLimit for ${featureName}:`, err);
      res.status(500).json({
        success: false,
        message: "Server error while checking feature limit.",
      });
    }
  };
};

export const checkImageLimit = (featureName, type = "images") => {
  return async (req, res, next) => {
    try {
      const maxImages = req.package?.[featureName];

      // If the limit is not defined or not a number, allow by default
      if (typeof maxImages !== "number") return next();

      const images = req.body[type];

      if (Array.isArray(images) && images.length > maxImages) {
        return res.status(403).json({
          success: false,
          message: `Limit exceeded: Only ${maxImages} ${featureName} allowed.`,
        });
      }

      next();
    } catch (err) {
      console.error(`Error in checkImageLimit for ${featureName}:`, err);
      res.status(500).json({
        success: false,
        message: "Server error while checking image limit.",
      });
    }
  };
};
