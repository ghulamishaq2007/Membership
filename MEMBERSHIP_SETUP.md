# ZENVORA SHOOP — Customer Membership & Loyalty System

A secure, server-backed Customer Membership and Loyalty Rewards system for **ZENVORA SHOOP** (https://zenvorashoop.netlify.app/).

---

## 🔒 Security & Architecture Standards Complied With

- **Zero Firebase Dependency**: Fully independent server-side database engine with atomic writes and transaction locking.
- **Server-Side Authentication**: Password hashing using Node.js `scrypt` with cryptographic salts. Bearer session tokens with automatic TTL expiration.
- **Customer Privacy Isolation**: Customers can strictly only view their own membership profile, stars, and order records. Sensitive data like CNIC is masked on the customer dashboard.
- **Protected Database**: Static access to `/data` and `/server` is forbidden (`403 Forbidden`).
- **Preserved Existing Website**: All existing pages, navigation, styling, scripts, cart, checkout, and products remain 100% intact.

---

## 1. Customer Membership Portal

* **URL**: [`/membership.html`](/membership.html)
* **Access Point**: Discreetly located in the website footer under **Quick Links** → **Membership**.

### Demo Customer Credentials
* **Membership ID**: `ZV-000001` *(or use CNIC: `42101-1234567-1`)*
* **Password / PIN**: `1234`
* **Current Status**:
  * **Customer**: Ayesha Khan
  * **Level**: Gold Member
  * **Total Shopping**: 4 Purchases (Rs. 18,500)
  * **Total Stars**: 4 Stars
  * **Reward Milestone**: 4 / 5 Shopping (80% progress) — **1 Shopping Remaining to unlock reward**

---

## 2. Executive Admin Portal

* **URL**: [`/admin-membership.html`](/admin-membership.html)
* **Access Point**: Private direct link (no public button on customer page).

### Default Admin Credentials
* **Admin Username**: `admin` *(or `admin@zenvorashoop.com`)*
* **Admin Password**: `ZenvoraAdmin2026!`

*(Note: Admin password can be changed at any time directly in the Admin Portal header).*

### Admin Features & Controls:
1. **Summary Analytics**: Real-time counts of Total Members, Active Members, Silver/Gold/VIP tiers, Total Shopping, and Unlocked Rewards.
2. **Dynamic Reward Target**: Configure the milestone threshold (default is 5 shopping = 1 reward) directly from the dashboard.
3. **Customer Search & Filters**: Search in real-time by Name, CNIC, Phone, or Member ID. Filter by Tier or Reward Status.
4. **Create New Member**: Generates `ZV-00000X` ID, sets tier, initial stars, phone, CNIC, and PIN.
5. **Add Completed Shopping**:
   - Enter order number, amount, date, and items.
   - **Automatic Real-time Recalculation**: Increments shopping count, adds amount to total spent, awards 1 Loyalty Star, and instantly unlocks reward if the threshold is reached!
6. **Redeem Reward**: Mark rewards as redeemed and reset the customer's cycle to begin their next milestone journey.
7. **Customer Full History**: View complete transaction logs with order numbers, amounts, and dates.
