
// Send authentication token cookie
export const setCookie = (res, type, token) => {
    const cookieConfig = {
    auth: {
      name: 'token',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    reset: {
      name: 'resetToken',
      maxAge: 5 * 60 * 1000 // 5 minutes
    },
    otp: {
      name: 'resetOtp',
      maxAge: 5 * 60 * 1000 // 5 minutes
    }
  };
  
  const config = cookieConfig[type];
  res.cookie(config.name, token, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    maxAge: config.maxAge, // 7 days
    path: "/",
  });
};

// Clear specific token cookie
export const clearCookie = (res, tokenName) => {

  res.clearCookie(tokenName, {
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
  });
};
