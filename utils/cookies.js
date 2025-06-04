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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    maxAge: config.maxAge,
    domain: '.vercel.app',
    path: '/',
  });
};

// Clear specific token cookie
export const clearCookie = (res, tokenName) => {
  res.clearCookie(tokenName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    domain: '.vercel.app',
    path: '/',
  });
};
