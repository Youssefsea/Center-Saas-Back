const jwt = require('jsonwebtoken');
dotenv = require('dotenv');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { generateToken };