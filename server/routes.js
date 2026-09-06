import express from 'express';
import { db, verifyPassword, maskCNIC, normalizeCNIC } from './db.js';
import { requireMemberAuth, requireAdminAuth, getBearerToken } from './auth.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Zenvora Membership API', time: new Date().toISOString() });
});

// =========================================================================
// CUSTOMER MEMBER API ROUTES
// =========================================================================

// POST /api/member/login
router.post('/member/login', (req, res) => {
  try {
    const { identifier, pin, password } = req.body;
    const authCode = (pin || password || '').toString().trim();

    if (!identifier || !authCode) {
      return res.status(400).json({ error: 'Please enter your CNIC / Member ID and Password / PIN.' });
    }

    const member = db.findMemberByIdentifier(identifier);
    if (!member) {
      return res.status(401).json({ error: 'Invalid CNIC / Member ID or PIN.' });
    }

    if (member.status === 'Suspended') {
      return res.status(403).json({ error: 'Your membership account is suspended. Please contact store support.' });
    }

    const isMatch = verifyPassword(authCode, member.passwordHash, member.passwordSalt);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid CNIC / Member ID or PIN.' });
    }

    const { token, expiresAt } = db.createSession('member', member.memberId, {
      memberId: member.memberId,
      name: member.name
    });

    res.json({
      success: true,
      token,
      expiresAt,
      member: {
        memberId: member.memberId,
        name: member.name,
        membershipLevel: member.membershipLevel,
        status: member.status
      }
    });
  } catch (err) {
    console.error('Member login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// GET /api/member/me (Customer Profile & Loyalty Dashboard)
router.get('/member/me', requireMemberAuth, (req, res) => {
  try {
    const member = req.member;
    const settings = db.getSettings();
    const target = settings.rewardTargetShopping || 5;
    const currentCycle = member.currentCycleShopping !== undefined ? member.currentCycleShopping : member.totalShopping;
    const remaining = Math.max(0, target - currentCycle);
    const progressPercent = Math.min(100, Math.round((currentCycle / target) * 100));

    res.json({
      memberId: member.memberId,
      name: member.name,
      maskedCnic: maskCNIC(member.cnic),
      phone: member.phone ? member.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2') : '',
      membershipLevel: member.membershipLevel,
      status: member.status,
      totalShopping: member.totalShopping,
      totalSpent: member.totalSpent,
      totalStars: member.totalStars,
      currentCycleShopping: currentCycle,
      rewardTargetShopping: target,
      shoppingRemaining: remaining,
      progressPercent,
      rewardStatus: member.rewardStatus,
      isRewardUnlocked: member.rewardStatus === 'Reward Unlocked' || currentCycle >= target,
      lastShoppingDate: member.lastShoppingDate,
      createdAt: member.createdAt,
      currency: settings.currency || 'Rs.'
    });
  } catch (err) {
    console.error('Member profile error:', err);
    res.status(500).json({ error: 'Failed to fetch membership profile.' });
  }
});

// GET /api/member/shopping (Customer's Own Shopping History)
router.get('/member/shopping', requireMemberAuth, (req, res) => {
  try {
    const records = db.getShopping(req.member.memberId);
    // Sort newest first
    records.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    res.json({
      memberId: req.member.memberId,
      records
    });
  } catch (err) {
    console.error('Member shopping history error:', err);
    res.status(500).json({ error: 'Failed to fetch shopping history.' });
  }
});

// POST /api/member/logout
router.post('/member/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) {
    db.deleteSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});


// =========================================================================
// ADMIN API ROUTES
// =========================================================================

// POST /api/admin/login
router.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const admin = db.getAdmin();
    const cleanUser = username.trim().toLowerCase();
    const adminUser = (admin.username || 'admin').toLowerCase();

    if (cleanUser !== adminUser && cleanUser !== 'admin@zenvorashoop.com') {
      return res.status(401).json({ error: 'Invalid admin username or password.' });
    }

    const isMatch = verifyPassword(password.trim(), admin.passwordHash, admin.passwordSalt);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin username or password.' });
    }

    const { token, expiresAt } = db.createSession('admin', admin.username, {
      id: admin.id,
      username: admin.username,
      name: admin.name
    });

    res.json({
      success: true,
      token,
      expiresAt,
      admin: {
        username: admin.username,
        name: admin.name
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during admin login.' });
  }
});

// GET /api/admin/stats
router.get('/admin/stats', requireAdminAuth, (req, res) => {
  try {
    const members = db.getMembers();
    const shopping = db.getShopping();
    const settings = db.getSettings();

    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'Active').length;
    const silverMembers = members.filter(m => m.membershipLevel === 'Silver').length;
    const goldMembers = members.filter(m => m.membershipLevel === 'Gold').length;
    const vipMembers = members.filter(m => m.membershipLevel === 'VIP').length;
    const newMembers = members.filter(m => m.membershipLevel === 'New Member').length;

    const totalShopping = shopping.filter(s => s.status === 'Completed').length;
    const totalSpent = shopping
      .filter(s => s.status === 'Completed')
      .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    const rewardsUnlocked = members.filter(m => m.rewardStatus === 'Reward Unlocked').length;
    const rewardsRedeemed = members.filter(m => m.rewardStatus === 'Reward Redeemed').length;

    res.json({
      totalMembers,
      activeMembers,
      silverMembers,
      goldMembers,
      vipMembers,
      newMembers,
      totalShopping,
      totalSpent,
      rewardsUnlocked,
      rewardsRedeemed,
      rewardTargetShopping: settings.rewardTargetShopping,
      currency: settings.currency || 'Rs.'
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to compute admin statistics.' });
  }
});

// GET /api/admin/settings
router.get('/admin/settings', requireAdminAuth, (req, res) => {
  res.json(db.getSettings());
});

// POST /api/admin/settings (Change reward requirement e.g. from 5 to another target)
router.post('/admin/settings', requireAdminAuth, (req, res) => {
  try {
    const { rewardTargetShopping, starsPerShopping } = req.body;
    const updated = db.updateSettings({
      rewardTargetShopping,
      starsPerShopping
    });
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update settings.' });
  }
});

// GET /api/admin/members (Search & Filter)
router.get('/api/admin/members', requireAdminAuth, (req, res) => {
  // Alias if accessed with prefix
});
router.get('/admin/members', requireAdminAuth, (req, res) => {
  try {
    const { search, level, status, rewardStatus } = req.query;
    let members = db.getMembers();

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      const normQ = normalizeCNIC(q);
      members = members.filter(m => {
        if (m.memberId.toLowerCase().includes(q)) return true;
        if (m.name.toLowerCase().includes(q)) return true;
        if (m.phone && m.phone.toLowerCase().includes(q)) return true;
        if (m.cnic && m.cnic.toLowerCase().includes(q)) return true;
        if (normQ && normalizeCNIC(m.cnic).includes(normQ)) return true;
        return false;
      });
    }

    if (level && level !== 'All') {
      members = members.filter(m => m.membershipLevel === level);
    }

    if (status && status !== 'All') {
      members = members.filter(m => m.status === status);
    }

    if (rewardStatus && rewardStatus !== 'All') {
      members = members.filter(m => m.rewardStatus === rewardStatus);
    }

    // Return safe member list for admin (does not expose password hashes)
    const sanitized = members.map(m => {
      const { passwordHash, passwordSalt, ...rest } = m;
      return rest;
    });

    res.json({ members: sanitized });
  } catch (err) {
    console.error('Admin get members error:', err);
    res.status(500).json({ error: 'Failed to retrieve members.' });
  }
});

// GET /api/admin/members/:id (Customer Profile & History)
router.get('/admin/members/:id', requireAdminAuth, (req, res) => {
  try {
    const member = db.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const shopping = db.getShopping(member.memberId);
    shopping.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const { passwordHash, passwordSalt, ...sanitized } = member;
    res.json({
      member: sanitized,
      shopping
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load member profile.' });
  }
});

// POST /api/admin/members (Add Customer)
router.post('/admin/members', requireAdminAuth, (req, res) => {
  try {
    const {
      name,
      cnic,
      phone,
      memberId,
      password,
      membershipLevel,
      initialStars,
      initialShoppingCount,
      status,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer Full Name is required.' });
    }

    if (!cnic || !cnic.trim()) {
      return res.status(400).json({ error: 'Customer CNIC is required.' });
    }

    const newMember = db.createMember({
      name,
      cnic,
      phone,
      memberId,
      password: password || '1234',
      membershipLevel: membershipLevel || 'New Member',
      initialStars: initialStars !== undefined ? initialStars : initialShoppingCount,
      initialShoppingCount: initialShoppingCount || 0,
      status: status || 'Active',
      notes
    });

    const { passwordHash, passwordSalt, ...sanitized } = newMember;
    res.status(201).json({ success: true, member: sanitized });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create customer.' });
  }
});

// PUT /api/admin/members/:id (Edit Customer)
router.put('/admin/members/:id', requireAdminAuth, (req, res) => {
  try {
    const updated = db.updateMember(req.params.id, req.body);
    const { passwordHash, passwordSalt, ...sanitized } = updated;
    res.json({ success: true, member: sanitized });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update customer.' });
  }
});

// DELETE /api/admin/members/:id
router.delete('/admin/members/:id', requireAdminAuth, (req, res) => {
  try {
    const success = db.deleteMember(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Member not found.' });
    }
    res.json({ success: true, message: 'Member and shopping history removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete member.' });
  }
});

// POST /api/admin/shopping (Add Shopping)
router.post('/admin/shopping', requireAdminAuth, (req, res) => {
  try {
    const { memberId, orderNumber, amount, date, status, notes } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is required.' });
    }

    if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      return res.status(400).json({ error: 'A valid shopping amount is required.' });
    }

    const record = db.addShopping({
      memberId,
      orderNumber,
      amount: parseFloat(amount),
      date,
      status: status || 'Completed',
      notes
    });

    const updatedMember = db.getMemberById(memberId);
    const { passwordHash, passwordSalt, ...sanitizedMember } = updatedMember;

    res.status(201).json({
      success: true,
      record,
      member: sanitizedMember
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to record shopping transaction.' });
  }
});

// DELETE /api/admin/shopping/:id
router.delete('/admin/shopping/:id', requireAdminAuth, (req, res) => {
  try {
    const success = db.deleteShopping(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Shopping record not found.' });
    }
    res.json({ success: true, message: 'Shopping record deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shopping record.' });
  }
});

// POST /api/admin/members/:id/redeem-reward (Mark Reward as Redeemed & Start New Cycle)
router.post('/admin/members/:id/redeem-reward', requireAdminAuth, (req, res) => {
  try {
    const { notes } = req.body;
    const updated = db.redeemReward(req.params.id, notes);
    const { passwordHash, passwordSalt, ...sanitized } = updated;
    res.json({
      success: true,
      message: 'Reward marked as redeemed. Customer loyalty cycle has been reset for their next reward!',
      member: sanitized
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to redeem reward.' });
  }
});

// POST /api/admin/change-password
router.post('/admin/change-password', requireAdminAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const admin = db.getAdmin();
    const isMatch = verifyPassword(currentPassword, admin.passwordHash, admin.passwordSalt);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    db.updateAdminPassword(newPassword);
    res.json({ success: true, message: 'Admin password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update admin password.' });
  }
});

// POST /api/admin/logout
router.post('/admin/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) {
    db.deleteSession(token);
  }
  res.json({ success: true, message: 'Admin logged out successfully.' });
});

// Fallback for unmatched API routes
router.use((req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

export default router;
