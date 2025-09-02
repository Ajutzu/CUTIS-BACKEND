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
    },
    temp_reg: {
      name: 'temp_reg',
      maxAge: 10 * 60 * 1000 // 10 minutes
    },
    temp_update: {
      name: 'temp_update',
      maxAge: 10 * 60 * 1000 // 10 minutes
    }
  };

  const config = cookieConfig[type];
  res.cookie(config.name, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: config.maxAge,
    path: '/',
  });
};

// Clear specific token cookie
export const clearCookie = (res, tokenName) => {
  res.clearCookie(tokenName, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
  });
};
