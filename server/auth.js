import { db } from './db.js';

export function getBearerToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

export function requireMemberAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const session = db.getSession(token);
  if (!session || session.userType !== 'member') {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const member = db.getMemberById(session.identifier);
  if (!member) {
    return res.status(401).json({ error: 'Member account not found.' });
  }

  if (member.status === 'Suspended') {
    return res.status(403).json({ error: 'Your membership account is suspended. Please contact store support.' });
  }

  req.member = member;
  req.sessionToken = token;
  next();
}

export function requireAdminAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Admin authorization required.' });
  }

  const session = db.getSession(token);
  if (!session || session.userType !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  req.admin = session.data;
  req.sessionToken = token;
  next();
}
