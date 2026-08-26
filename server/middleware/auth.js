import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bookbridge_super_secret_jwt_key_2026_production';

export const generateToken = (user, profile) => {
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      role: (user.role || 'STUDENT').toUpperCase(),
      full_name: profile ? profile.fullName : 'Student'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }
    req.user = decoded;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};
