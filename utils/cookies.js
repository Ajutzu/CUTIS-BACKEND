// Send authentication token cookie
export const setCookie = (res, type, token) => {
  const cookieConfig = {
    auth: {
      name: "token",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    reset: {
      name: "resetToken",
      maxAge: 5 * 60 * 1000, // 5 minutes
    },
    otp: {
      name: "resetOtp",
      maxAge: 5 * 60 * 1000, // 5 minutes
    },
  };

  const config = cookieConfig[type];
  res.cookie(config.name, token, {
    httpOnly: true,
    secure: true, // Always true for HTTPS production
    sameSite: "None", // Required for cross-origin
    maxAge: config.maxAge,
    path: "/",
    domain: undefined, // Don't set domain for cross-origin cookies
  });
};

// Clear specific token cookie
export const clearCookie = (res, tokenName) => {
  res.clearCookie(tokenName, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    domain: undefined,
  });
};
