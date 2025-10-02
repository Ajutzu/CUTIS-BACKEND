// Send authentication token cookie
export const setCookie = (res, type, token, options = {}) => {
  const { rememberMe = true } = options;
  const cookieConfig = {
    auth: {
      name: 'token',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
  };

  const config = cookieConfig[type];
  const base = {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
  };

  // Session cookie when rememberMe is false (no maxAge), otherwise persistent
  const cookieOptions = rememberMe ? { ...base, maxAge: config.maxAge } : base;

  res.cookie(config.name, token, cookieOptions);
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
