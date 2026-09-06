import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(path.dirname(__dirname), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const SHOPPING_FILE = path.join(DATA_DIR, 'shopping.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Atomic write helper
function atomicWrite(filePath, data) {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function readJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

// Password hashing using Node.js built-in crypto (scrypt)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  try {
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (err) {
    return false;
  }
}

// Initialize default data if empty
function initializeDB() {
  // 1. Settings
  let settings = readJSON(SETTINGS_FILE, null);
  if (!settings) {
    settings = {
      rewardTargetShopping: 5, // Default 5 shopping = reward unlocked
      starsPerShopping: 1,
      currency: 'Rs.',
      updatedAt: new Date().toISOString()
    };
    atomicWrite(SETTINGS_FILE, settings);
  }

  // 2. Admin User
  let admin = readJSON(ADMIN_FILE, null);
  if (!admin || !admin.username) {
    const initialAdminPass = process.env.ADMIN_PASSWORD || 'ZenvoraAdmin2026!';
    const { hash, salt } = hashPassword(initialAdminPass);
    admin = {
      id: 'ADM-001',
      username: 'admin',
      name: 'ZENVORA Head Office',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString()
    };
    atomicWrite(ADMIN_FILE, admin);
    console.log(`[ZENVORA] Default Admin initialized. Username: admin`);
  }

  // 3. Members & Sample Member
  let members = readJSON(MEMBERS_FILE, null);
  if (!members || !Array.isArray(members) || members.length === 0) {
    const { hash: sampleHash, salt: sampleSalt } = hashPassword('1234');
    members = [
      {
        memberId: 'ZV-000001',
        name: 'Ayesha Khan',
        cnic: '42101-1234567-1',
        phone: '03232974451',
        passwordHash: sampleHash,
        passwordSalt: sampleSalt,
        membershipLevel: 'Gold',
        status: 'Active',
        totalShopping: 4,
        totalSpent: 18500,
        totalStars: 4,
        currentCycleShopping: 4,
        rewardStatus: 'In Progress', // 'Not Eligible', 'In Progress', 'Reward Unlocked', 'Reward Redeemed'
        rewardHistory: [],
        createdAt: '2026-08-01T10:00:00.000Z',
        lastShoppingDate: '2026-09-01',
        notes: 'VIP customer. Prefers luxury lawn suits.'
      }
    ];
    atomicWrite(MEMBERS_FILE, members);
  }

  // 4. Shopping Records
  let shopping = readJSON(SHOPPING_FILE, null);
  if (!shopping || !Array.isArray(shopping) || shopping.length === 0) {
    shopping = [
      {
        shoppingId: 'SHP-00001',
        memberId: 'ZV-000001',
        orderNumber: '#ZV-1001',
        date: '2026-08-15',
        amount: 4500,
        status: 'Completed',
        notes: 'Pakistani Printed Lawn Suit White Green'
      },
      {
        shoppingId: 'SHP-00002',
        memberId: 'ZV-000001',
        orderNumber: '#ZV-1002',
        date: '2026-08-20',
        amount: 3200,
        status: 'Completed',
        notes: 'Men Khaddar Plain Blue Suit Summer'
      },
      {
        shoppingId: 'SHP-00003',
        memberId: 'ZV-000001',
        orderNumber: '#ZV-1003',
        date: '2026-08-28',
        amount: 5400,
        status: 'Completed',
        notes: 'Brown Embroidered 3-Piece Cotton Lawn Suit'
      },
      {
        shoppingId: 'SHP-00004',
        memberId: 'ZV-000001',
        orderNumber: '#ZV-1004',
        date: '2026-09-01',
        amount: 5400,
        status: 'Completed',
        notes: 'Turquoise Block Printed 3Pcs Maxi Set'
      }
    ];
    atomicWrite(SHOPPING_FILE, shopping);
  }

  // 5. Sessions
  let sessions = readJSON(SESSIONS_FILE, null);
  if (!sessions) {
    sessions = {};
    atomicWrite(SESSIONS_FILE, sessions);
  }
}

initializeDB();

// Clean CNIC helper (removes dashes/spaces for flexible lookup)
export function normalizeCNIC(cnic) {
  if (!cnic) return '';
  return cnic.replace(/[^0-9]/g, '');
}

// Mask CNIC for customer privacy (e.g. 42101-*******-1)
export function maskCNIC(cnic) {
  if (!cnic) return '*****-*******-*';
  const clean = cnic.replace(/[^0-9]/g, '');
  if (clean.length === 13) {
    return `${clean.slice(0, 5)}-*******-${clean.slice(12)}`;
  }
  return '*****-*******-*';
}

// Database Operations
export const db = {
  // SETTINGS
  getSettings() {
    return readJSON(SETTINGS_FILE, {
      rewardTargetShopping: 5,
      starsPerShopping: 1,
      currency: 'Rs.'
    });
  },

  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = {
      ...current,
      ...newSettings,
      rewardTargetShopping: Math.max(1, parseInt(newSettings.rewardTargetShopping, 10) || 5),
      updatedAt: new Date().toISOString()
    };
    atomicWrite(SETTINGS_FILE, updated);
    return updated;
  },

  // ADMIN
  getAdmin() {
    return readJSON(ADMIN_FILE, {});
  },

  updateAdminPassword(newPassword) {
    const admin = this.getAdmin();
    const { hash, salt } = hashPassword(newPassword);
    admin.passwordHash = hash;
    admin.passwordSalt = salt;
    admin.updatedAt = new Date().toISOString();
    atomicWrite(ADMIN_FILE, admin);
    return true;
  },

  // SESSIONS
  createSession(userType, identifier, data = {}) {
    const sessions = readJSON(SESSIONS_FILE, {});
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    sessions[token] = {
      token,
      userType, // 'admin' or 'member'
      identifier, // username or memberId
      data,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    atomicWrite(SESSIONS_FILE, sessions);
    return { token, expiresAt };
  },

  getSession(token) {
    if (!token) return null;
    const sessions = readJSON(SESSIONS_FILE, {});
    const session = sessions[token];
    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      delete sessions[token];
      atomicWrite(SESSIONS_FILE, sessions);
      return null;
    }
    return session;
  },

  deleteSession(token) {
    if (!token) return;
    const sessions = readJSON(SESSIONS_FILE, {});
    if (sessions[token]) {
      delete sessions[token];
      atomicWrite(SESSIONS_FILE, sessions);
    }
  },

  // MEMBERS
  getMembers() {
    return readJSON(MEMBERS_FILE, []);
  },

  getMemberById(memberId) {
    const members = this.getMembers();
    return members.find(m => m.memberId.toUpperCase() === memberId.toUpperCase()) || null;
  },

  findMemberByIdentifier(identifier) {
    if (!identifier) return null;
    const cleanInput = identifier.trim();
    const norm = normalizeCNIC(cleanInput);
    const members = this.getMembers();

    return members.find(m => {
      // Check Member ID match
      if (m.memberId.toUpperCase() === cleanInput.toUpperCase()) return true;
      // Check CNIC match (with or without dashes)
      if (normalizeCNIC(m.cnic) === norm && norm.length >= 10) return true;
      // Check Phone match
      if (m.phone && m.phone.replace(/[^0-9]/g, '') === norm && norm.length >= 10) return true;
      return false;
    }) || null;
  },

  generateNextMemberId() {
    const members = this.getMembers();
    let maxNum = 0;
    for (const m of members) {
      const match = m.memberId.match(/ZV-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    return `ZV-${nextNum.toString().padStart(6, '0')}`;
  },

  createMember(data) {
    const members = this.getMembers();
    const settings = this.getSettings();

    // Check duplicate CNIC or MemberId
    const existingId = data.memberId && members.find(m => m.memberId.toUpperCase() === data.memberId.toUpperCase());
    if (existingId) {
      throw new Error(`Member ID ${data.memberId} is already in use.`);
    }

    const normCNIC = normalizeCNIC(data.cnic);
    const existingCNIC = members.find(m => normalizeCNIC(m.cnic) === normCNIC);
    if (existingCNIC) {
      throw new Error(`CNIC ${data.cnic} is already registered to ${existingCNIC.name} (${existingCNIC.memberId}).`);
    }

    const memberId = data.memberId && data.memberId.trim() !== ''
      ? data.memberId.trim().toUpperCase()
      : this.generateNextMemberId();

    const { hash, salt } = hashPassword(data.password || '1234');
    const initialShopping = parseInt(data.initialShoppingCount, 10) || 0;
    const initialStars = parseInt(data.initialStars, 10) || initialShopping;

    const currentCycle = initialShopping;
    const rewardStatus = currentCycle >= settings.rewardTargetShopping
      ? 'Reward Unlocked'
      : (currentCycle > 0 ? 'In Progress' : 'Not Eligible');

    const newMember = {
      memberId,
      name: data.name.trim(),
      cnic: data.cnic.trim(),
      phone: data.phone ? data.phone.trim() : '',
      passwordHash: hash,
      passwordSalt: salt,
      membershipLevel: data.membershipLevel || 'New Member', // 'New Member', 'Silver', 'Gold', 'VIP'
      status: data.status || 'Active', // 'Active', 'Inactive', 'Suspended'
      totalShopping: initialShopping,
      totalSpent: parseFloat(data.initialSpent) || 0,
      totalStars: initialStars,
      currentCycleShopping: currentCycle,
      rewardStatus,
      rewardHistory: [],
      createdAt: new Date().toISOString(),
      lastShoppingDate: null,
      notes: data.notes ? data.notes.trim() : ''
    };

    members.unshift(newMember);
    atomicWrite(MEMBERS_FILE, members);
    return newMember;
  },

  updateMember(memberId, updates) {
    const members = this.getMembers();
    const index = members.findIndex(m => m.memberId.toUpperCase() === memberId.toUpperCase());
    if (index === -1) {
      throw new Error('Member not found');
    }

    const current = members[index];

    // If updating CNIC, check duplicates
    if (updates.cnic && updates.cnic !== current.cnic) {
      const normCNIC = normalizeCNIC(updates.cnic);
      const existing = members.find(m => m.memberId !== current.memberId && normalizeCNIC(m.cnic) === normCNIC);
      if (existing) {
        throw new Error(`CNIC ${updates.cnic} is already registered to another member.`);
      }
      current.cnic = updates.cnic.trim();
    }

    if (updates.name) current.name = updates.name.trim();
    if (updates.phone !== undefined) current.phone = updates.phone.trim();
    if (updates.membershipLevel) current.membershipLevel = updates.membershipLevel;
    if (updates.status) current.status = updates.status;
    if (updates.notes !== undefined) current.notes = updates.notes;

    if (updates.password && updates.password.trim() !== '') {
      const { hash, salt } = hashPassword(updates.password.trim());
      current.passwordHash = hash;
      current.passwordSalt = salt;
    }

    if (updates.totalStars !== undefined) {
      current.totalStars = parseInt(updates.totalStars, 10) || 0;
    }

    if (updates.totalShopping !== undefined) {
      current.totalShopping = parseInt(updates.totalShopping, 10) || 0;
    }

    if (updates.totalSpent !== undefined) {
      current.totalSpent = parseFloat(updates.totalSpent) || 0;
    }

    if (updates.currentCycleShopping !== undefined) {
      current.currentCycleShopping = parseInt(updates.currentCycleShopping, 10) || 0;
    }

    if (updates.lastShoppingDate !== undefined) {
      current.lastShoppingDate = updates.lastShoppingDate;
    }

    if (updates.rewardStatus) {
      current.rewardStatus = updates.rewardStatus;
    }

    current.updatedAt = new Date().toISOString();
    members[index] = current;
    atomicWrite(MEMBERS_FILE, members);
    return current;
  },

  deleteMember(memberId) {
    let members = this.getMembers();
    const initialLen = members.length;
    members = members.filter(m => m.memberId.toUpperCase() !== memberId.toUpperCase());
    if (members.length === initialLen) return false;

    atomicWrite(MEMBERS_FILE, members);

    // Also delete shopping records
    let shopping = this.getShopping();
    shopping = shopping.filter(s => s.memberId.toUpperCase() !== memberId.toUpperCase());
    atomicWrite(SHOPPING_FILE, shopping);

    return true;
  },

  // SHOPPING
  getShopping(memberId = null) {
    const list = readJSON(SHOPPING_FILE, []);
    if (memberId) {
      return list.filter(s => s.memberId.toUpperCase() === memberId.toUpperCase());
    }
    return list;
  },

  addShopping(data) {
    const member = this.getMemberById(data.memberId);
    if (!member) {
      throw new Error(`Member ${data.memberId} not found.`);
    }

    const settings = this.getSettings();
    const shoppingList = this.getShopping();

    const shoppingId = `SHP-${(shoppingList.length + 1).toString().padStart(5, '0')}`;
    const amount = parseFloat(data.amount) || 0;
    const date = data.date || new Date().toISOString().split('T')[0];
    const orderNumber = data.orderNumber ? data.orderNumber.trim() : `#ZV-${Date.now().toString().slice(-4)}`;

    const newRecord = {
      shoppingId,
      memberId: member.memberId,
      orderNumber,
      date,
      amount,
      status: data.status || 'Completed',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    shoppingList.unshift(newRecord);
    atomicWrite(SHOPPING_FILE, shoppingList);

    // If status is Completed, automatically update customer stats
    if (newRecord.status === 'Completed') {
      const updatedTotalShopping = member.totalShopping + 1;
      const updatedCycleShopping = (member.currentCycleShopping || 0) + 1;
      const updatedTotalSpent = member.totalSpent + amount;
      const updatedTotalStars = member.totalStars + (settings.starsPerShopping || 1);

      let updatedRewardStatus = member.rewardStatus;
      if (updatedCycleShopping >= settings.rewardTargetShopping) {
        updatedRewardStatus = 'Reward Unlocked';
      } else if (updatedRewardStatus !== 'Reward Unlocked') {
        updatedRewardStatus = 'In Progress';
      }

      this.updateMember(member.memberId, {
        totalShopping: updatedTotalShopping,
        currentCycleShopping: updatedCycleShopping,
        totalSpent: updatedTotalSpent,
        totalStars: updatedTotalStars,
        rewardStatus: updatedRewardStatus,
        lastShoppingDate: date
      });
    }

    return newRecord;
  },

  deleteShopping(shoppingId) {
    let shoppingList = this.getShopping();
    const item = shoppingList.find(s => s.shoppingId === shoppingId);
    if (!item) return false;

    shoppingList = shoppingList.filter(s => s.shoppingId !== shoppingId);
    atomicWrite(SHOPPING_FILE, shoppingList);

    // If completed, recalculate member stats
    if (item.status === 'Completed') {
      const member = this.getMemberById(item.memberId);
      if (member) {
        const memberShopping = shoppingList.filter(s => s.memberId === member.memberId && s.status === 'Completed');
        const totalShopping = memberShopping.length;
        const totalSpent = memberShopping.reduce((sum, s) => sum + s.amount, 0);
        const settings = this.getSettings();
        const currentCycle = Math.max(0, (member.currentCycleShopping || 1) - 1);

        this.updateMember(member.memberId, {
          totalShopping,
          totalSpent,
          totalStars: Math.max(0, member.totalStars - (settings.starsPerShopping || 1)),
          currentCycleShopping: currentCycle,
          rewardStatus: currentCycle >= settings.rewardTargetShopping ? 'Reward Unlocked' : 'In Progress'
        });
      }
    }
    return true;
  },

  // REWARD REDEMPTION
  redeemReward(memberId, notes = '') {
    const member = this.getMemberById(memberId);
    if (!member) throw new Error('Member not found');

    const rewardRecord = {
      redeemedAt: new Date().toISOString(),
      cycleShopping: member.currentCycleShopping,
      notes: notes || 'Reward claimed and redeemed'
    };

    const history = member.rewardHistory || [];
    history.unshift(rewardRecord);

    // Reset current cycle to start new loyalty cycle
    const updated = this.updateMember(memberId, {
      rewardStatus: 'Reward Redeemed',
      currentCycleShopping: 0,
      rewardHistory: history
    });

    return updated;
  },

  // START NEW CYCLE
  resetLoyaltyCycle(memberId) {
    return this.updateMember(memberId, {
      currentCycleShopping: 0,
      rewardStatus: 'In Progress'
    });
  }
};
