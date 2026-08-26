import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import initDb, { isMongoConnected, getStore, saveStore } from '../db/database.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';

dotenv.config();

export const createAdminAccount = async () => {
  const adminEmailRaw = process.env.ADMIN_EMAIL;
  const adminPasswordRaw = process.env.ADMIN_PASSWORD;

  if (!adminEmailRaw || !adminPasswordRaw || adminPasswordRaw === 'CHANGE_ME') {
    console.error('❌ Admin creation error: Please set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file before running this script.');
    process.exit(1);
  }

  const cleanEmail = adminEmailRaw.toLowerCase().trim();

  const connected = await initDb();

  if (connected && isMongoConnected) {
    // Check if an Admin with this email already exists in MongoDB Atlas
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      if (existingUser.role === 'ADMIN' || existingUser.role === 'admin') {
        console.log(`ℹ️ Admin user (${cleanEmail}) already exists in MongoDB. No duplicate account created.`);
        process.exit(0);
      } else {
        // Upgrade user to ADMIN if requested
        existingUser.role = 'ADMIN';
        await existingUser.save();
        console.log(`✅ Existing user (${cleanEmail}) upgraded to ADMIN role in MongoDB.`);
        process.exit(0);
      }
    }

    // Hash password securely with bcrypt
    const passwordHash = await bcrypt.hash(adminPasswordRaw, 10);

    // Create new Admin User in MongoDB Atlas
    const adminUser = await User.create({
      email: cleanEmail,
      phone: '+1 (555) 019-2831',
      passwordHash,
      role: 'ADMIN',
      status: 'active',
      isEmailVerified: true
    });

    // Create corresponding Admin UserProfile
    await UserProfile.create({
      user: adminUser._id,
      fullName: 'Platform Administrator',
      institution: 'State University of Technology',
      department: 'Administration',
      semester: 8,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      ecoPoints: 500,
      rating: 5.0
    });

    console.log(`🎉 Admin user created successfully in MongoDB!`);
    console.log(`   - Email: ${cleanEmail}`);
    console.log(`   - Role: ADMIN`);
    console.log(`   - Status: Active & Verified`);
    process.exit(0);
  } else {
    // Offline document store fallback
    const store = getStore();
    const existingUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existingUser) {
      console.log(`ℹ️ Admin user (${cleanEmail}) already exists in local store.`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(adminPasswordRaw, 10);
    const newAdmin = {
      id: `user_admin_${Date.now()}`,
      _id: `user_admin_${Date.now()}`,
      email: cleanEmail,
      phone: '+1 (555) 019-2831',
      passwordHash,
      role: 'ADMIN',
      status: 'active',
      isEmailVerified: true
    };

    store.users.push(newAdmin);
    store.userprofiles.push({
      id: `prof_admin_${Date.now()}`,
      _id: `prof_admin_${Date.now()}`,
      user: newAdmin.id,
      fullName: 'Platform Administrator',
      institution: 'State University of Technology',
      department: 'Administration',
      semester: 8,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      ecoPoints: 500,
      rating: 5.0
    });

    saveStore();
    console.log(`🎉 Admin user created successfully in document store!`);
    console.log(`   - Email: ${cleanEmail}`);
    process.exit(0);
  }
};

if (process.argv[1].endsWith('createAdmin.js')) {
  createAdminAccount().catch((err) => {
    console.error('❌ Failed to create admin user:', err.message);
    process.exit(1);
  });
}
