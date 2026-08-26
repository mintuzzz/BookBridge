import bcrypt from 'bcryptjs';
import initDb, { isMongoConnected } from './database.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';

export const seedDatabase = async () => {
  const connected = await initDb();

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bookbridge.edu').toLowerCase().trim();
  const adminRawPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  const hashedAdminPassword = await bcrypt.hash(adminRawPassword, 10);

  if (connected && isMongoConnected) {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`🌱 Creating Platform Admin user (${adminEmail})...`);

      const adminUser = await User.create({
        email: adminEmail,
        phone: '+1 (555) 019-2831',
        passwordHash: hashedAdminPassword,
        role: 'ADMIN',
        status: 'active',
        isEmailVerified: true
      });

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

      console.log(`✅ Platform Admin (${adminEmail}) initialized cleanly.`);
    } else {
      console.log(`✅ Platform Admin (${adminEmail}) already exists in MongoDB.`);
    }
  }
};

export default seedDatabase;
