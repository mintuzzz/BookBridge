import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import OtpVerification from '../models/OtpVerification.js';
import EcoPoint from '../models/EcoPoint.js';
import Notification from '../models/Notification.js';
import Session from '../models/Session.js';
import { isMongoConnected, checkIsMongoConnected, getStore, saveStore } from '../db/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import sendOtpEmail from '../services/emailService.js';

const router = express.Router();

const isDbMongo = () => {
  return checkIsMongoConnected() || isMongoConnected;
};

// 1. Register Student Step 1: Submit info, generate & email 6-digit OTP
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, password, institution, department, semester } = req.body;

    const cleanFullName = typeof full_name === 'string' ? full_name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanFullName || !cleanEmail || !cleanPhone || !cleanPassword || cleanPassword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required registration fields.'
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    console.log(`📩 [Register Event] Processing registration for: ${cleanEmail}`);

    // Check if email already belongs to an existing user
    let existingUser = null;
    if (isDbMongo()) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      const store = getStore();
      existingUser = store.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
    }

    if (existingUser) {
      // If user is verified (or legacy user without isEmailVerified false), reject registration
      if (existingUser.isEmailVerified !== false) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered.'
        });
      }
      // If unverified user exists, allow sending new OTP / completing registration
    }

    // Hash password & generate 6-digit cryptographic OTP
    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    const tempUserData = {
      fullName: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      institution: (institution || 'State University of Technology').trim(),
      department: (department || 'Computer Science').trim(),
      semester: parseInt(semester, 10) || 1
    };

    if (isDbMongo()) {
      // Invalidate any previous pending OTP for registration
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: 'REGISTER' });

      await OtpVerification.create({
        email: cleanEmail,
        otpHash,
        purpose: 'REGISTER',
        expiresAt,
        attempts: 0,
        verified: false,
        tempUserData
      });
    } else {
      const store = getStore();
      store.otpverifications = (store.otpverifications || []).filter(
        (o) => !(o.email === cleanEmail && o.purpose === 'REGISTER')
      );
      store.otpverifications.push({
        id: `otp_${Date.now()}`,
        _id: `otp_${Date.now()}`,
        email: cleanEmail,
        otpHash,
        purpose: 'REGISTER',
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        verified: false,
        tempUserData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveStore();
    }

    // Send real OTP email to user's inbox
    try {
      await sendOtpEmail({
        toEmail: cleanEmail,
        studentName: cleanFullName,
        otpCode,
        purpose: 'REGISTER'
      });
      console.log(`✉️ Real OTP email dispatched successfully to: ${cleanEmail}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send OTP email: ${emailErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'Could not send verification email. Please check your email configuration or try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
      email: cleanEmail,
      expiresIn: 300
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'We couldn\'t process registration. Please try again.'
    });
  }
});

// 2. Verify OTP & Activate Student Account in MongoDB
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, purpose = 'REGISTER' } = req.body;

    const cleanEmail = (email || '').toString().toLowerCase().trim();
    const cleanOtp = (otp || '').toString().trim();
    const cleanPurpose = (purpose || 'REGISTER').toString().toUpperCase().trim();

    console.log(`🔍 [Verify OTP Request Received] Email: "${cleanEmail}", OTP length: ${cleanOtp.length}, Purpose: "${cleanPurpose}"`);

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit verification code.'
      });
    }

    let record = null;
    const store = getStore();

    if (isMongoConnected) {
      record = await OtpVerification.findOne({ email: cleanEmail, purpose: cleanPurpose })
        .sort({ createdAt: -1 });
    } else {
      const list = store.otpverifications
        .filter((o) => o.email === cleanEmail && o.purpose === cleanPurpose)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      record = list[0] || null;
    }

    if (!record) {
      console.warn(`⚠️ [OTP Record Not Found] No active record found for email: ${cleanEmail}`);
      return res.status(400).json({
        success: false,
        message: 'Verification code not found. Please request a new code.'
      });
    }

    console.log(`📌 [OTP Record Found] Email: ${cleanEmail}, Attempts: ${record.attempts}, Verified: ${record.verified}`);

    if (record.verified) {
      return res.status(400).json({
        success: false,
        message: 'This email has already been verified.'
      });
    }

    // Check expiration
    const expiryTime = new Date(record.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      console.warn(`⏰ [OTP Expired] Expiry time: ${new Date(record.expiresAt).toISOString()}, Current time: ${new Date().toISOString()}`);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        expired: true
      });
    }

    // Check max attempts (5)
    if (record.attempts >= 5) {
      console.warn(`⛔ [OTP Attempt Limit Exceeded] Email: ${cleanEmail}, Attempts: ${record.attempts}`);
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new code.',
        maxAttempts: true
      });
    }

    // Compare submitted OTP against bcrypt hash
    const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);

    if (!isMatch) {
      record.attempts += 1;
      if (isMongoConnected) {
        await record.save();
      } else {
        saveStore();
      }

      console.warn(`❌ [OTP Compare Failed] Incorrect OTP entered for ${cleanEmail}. Attempt count updated to ${record.attempts}`);

      if (record.attempts >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Too many verification attempts. Please request a new code.',
          maxAttempts: true
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid verification code.'
      });
    }

    // Mark OTP as verified
    record.verified = true;
    if (isMongoConnected) {
      await record.save();
    } else {
      saveStore();
    }

    console.log(`✅ [OTP Verification Success] OTP verified cleanly for: ${cleanEmail}`);

    if (cleanPurpose === 'PASSWORD_RESET') {
      return res.json({
        success: true,
        message: 'Verification successful! You can now set a new password.',
        verified: true
      });
    }

    // Registration Completion Flow
    const tempUser = record.tempUserData;
    if (!tempUser) {
      return res.status(400).json({
        success: false,
        message: 'Registration session data missing. Please re-register.'
      });
    }

    let userPayload = null;
    let token = null;

    if (isMongoConnected) {
      let newUser = await User.findOne({ email: cleanEmail });
      let newProfile = null;

      if (!newUser) {
        newUser = await User.create({
          email: tempUser.email,
          phone: tempUser.phone,
          passwordHash: tempUser.passwordHash,
          role: 'STUDENT',
          status: 'active',
          isEmailVerified: true
        });

        newProfile = await UserProfile.create({
          user: newUser._id,
          fullName: tempUser.fullName,
          institution: tempUser.institution,
          department: tempUser.department,
          semester: tempUser.semester,
          avatarUrl: '',
          ecoPoints: 0,
          rating: 0
        });

        await Session.create({
          user: newUser._id,
          token: 'active_session',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await EcoPoint.create({
          user: newUser._id,
          points: 50,
          action: 'register',
          description: 'Welcome bonus for joining BookBridge!'
        });

        await Notification.create({
          user: newUser._id,
          title: '🎉 Welcome to BookBridge!',
          message: 'Your student account has been verified. You earned 50 Eco Points!',
          type: 'eco'
        });
      } else {
        newProfile = await UserProfile.findOne({ user: newUser._id });
      }

      // Clean up OTP record after successful account activation
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: 'REGISTER' });

      userPayload = {
        id: newUser._id.toString(),
        full_name: newProfile ? newProfile.fullName : tempUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: 'student',
        institution: newProfile ? newProfile.institution : tempUser.institution,
        department: newProfile ? newProfile.department : tempUser.department,
        semester: newProfile ? newProfile.semester : tempUser.semester,
        avatar_url: newProfile ? newProfile.avatarUrl : '',
        eco_points: newProfile ? newProfile.ecoPoints : 50,
        rating: newProfile ? (newProfile.rating || 0) : 0
      };

      token = generateToken(newUser, newProfile);
    } else {
      // Document Store fallback
      let newUser = store.users.find((u) => u.email === cleanEmail);
      let newProfile = null;

      if (!newUser) {
        const userId = `user_${Date.now()}`;
        newUser = {
          id: userId,
          _id: userId,
          email: tempUser.email,
          phone: tempUser.phone,
          passwordHash: tempUser.passwordHash,
          role: 'STUDENT',
          status: 'active',
          isEmailVerified: true
        };

        newProfile = {
          id: `prof_${Date.now()}`,
          _id: `prof_${Date.now()}`,
          user: userId,
          fullName: tempUser.fullName,
          institution: tempUser.institution,
          department: tempUser.department,
          semester: tempUser.semester,
          avatarUrl: '',
          ecoPoints: 50,
          rating: 0
        };

        store.users.push(newUser);
        store.userprofiles.push(newProfile);
      } else {
        newUser.isEmailVerified = true;
        newUser.status = 'active';
        newUser.passwordHash = tempUser.passwordHash;
        newUser.phone = tempUser.phone;
        newProfile = store.userprofiles.find((p) => (p.user?._id || p.user).toString() === (newUser._id || newUser.id).toString());
      }

      store.otpverifications = (store.otpverifications || []).filter(
        (o) => !(o.email === cleanEmail && o.purpose === 'REGISTER')
      );
      saveStore();

      userPayload = {
        id: (newUser._id || newUser.id).toString(),
        full_name: newProfile ? newProfile.fullName : tempUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: 'student',
        institution: newProfile ? newProfile.institution : tempUser.institution,
        department: newProfile ? newProfile.department : tempUser.department,
        semester: newProfile ? newProfile.semester : tempUser.semester,
        avatar_url: newProfile ? newProfile.avatarUrl : '',
        eco_points: newProfile ? newProfile.ecoPoints : 50,
        rating: newProfile ? (newProfile.rating || 0) : 0
      };

      token = generateToken(newUser, newProfile);
    }

    return res.json({
      success: true,
      message: 'Account verified and created successfully! Welcome to BookBridge.',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify verification code.'
    });
  }
});

// 3. Resend OTP Endpoint with 60s Rate Limiting
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose = 'REGISTER' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPurpose = (purpose || 'REGISTER').toString().toUpperCase().trim();
    const store = getStore();

    let record = null;
    if (isDbMongo()) {
      record = await OtpVerification.findOne({ email: cleanEmail, purpose: cleanPurpose }).sort({ createdAt: -1 });
    } else {
      const list = store.otpverifications
        .filter((o) => o.email === cleanEmail && o.purpose === cleanPurpose)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      record = list[0] || null;
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found for this email. Please register again.'
      });
    }

    if (record.verified) {
      return res.status(400).json({
        success: false,
        message: 'This email has already been verified.'
      });
    }

    // 60-Second Cooldown Enforcement
    const lastSentTime = new Date(record.updatedAt || record.createdAt).getTime();
    const secondsPassed = Math.floor((Date.now() - lastSentTime) / 1000);
    if (secondsPassed < 60) {
      const waitSeconds = 60 - secondsPassed;
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        waitSeconds
      });
    }

    // Generate new 6-digit OTP code & hash
    const newOtpCode = crypto.randomInt(100000, 1000000).toString();
    const newOtpHash = await bcrypt.hash(newOtpCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    if (isDbMongo()) {
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: cleanPurpose, verified: false });

      await OtpVerification.create({
        email: cleanEmail,
        otpHash: newOtpHash,
        purpose: cleanPurpose,
        expiresAt,
        attempts: 0,
        verified: false,
        tempUserData: record.tempUserData
      });
    } else {
      store.otpverifications = store.otpverifications.filter(
        (o) => !(o.email === cleanEmail && o.purpose === cleanPurpose && !o.verified)
      );
      store.otpverifications.push({
        id: `otp_${Date.now()}`,
        _id: `otp_${Date.now()}`,
        email: cleanEmail,
        otpHash: newOtpHash,
        purpose: cleanPurpose,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        verified: false,
        tempUserData: record.tempUserData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveStore();
    }

    const studentName = record.tempUserData ? record.tempUserData.fullName : 'Student';

    // Dispatch real email (No OTP in console log!)
    try {
      await sendOtpEmail({
        toEmail: cleanEmail,
        studentName,
        otpCode: newOtpCode,
        purpose: cleanPurpose
      });
      console.log(`✉️ Real OTP email resent successfully to: ${cleanEmail}`);
    } catch (emailErr) {
      console.error(`❌ Failed to resend verification email: ${emailErr.message}`);
      return res.status(500).json({
        success: false,
        message: 'Could not resend verification email. Please try again later.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      expiresIn: 300
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'We could not resend the verification email.'
    });
  }
});

// 4. Forgot Password — Initiate Real Email OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your account email address.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const store = getStore();

    let user = null;
    let profile = null;

    if (isMongoConnected) {
      user = await User.findOne({ email: cleanEmail });
      if (user) profile = await UserProfile.findOne({ user: user._id });
    } else {
      user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) profile = store.userprofiles.find((p) => (p.user?._id || p.user).toString() === (user._id || user.id).toString());
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No student account found with this email address.'
      });
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (isMongoConnected) {
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: 'PASSWORD_RESET' });
      await OtpVerification.create({
        email: cleanEmail,
        otpHash,
        purpose: 'PASSWORD_RESET',
        expiresAt,
        attempts: 0,
        verified: false
      });
    } else {
      store.otpverifications = store.otpverifications.filter((o) => !(o.email === cleanEmail && o.purpose === 'PASSWORD_RESET'));
      store.otpverifications.push({
        id: `otp_${Date.now()}`,
        _id: `otp_${Date.now()}`,
        email: cleanEmail,
        otpHash,
        purpose: 'PASSWORD_RESET',
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        verified: false,
        createdAt: new Date().toISOString()
      });
      saveStore();
    }

    try {
      await sendOtpEmail({
        toEmail: cleanEmail,
        studentName: profile ? profile.fullName : 'Student',
        otpCode,
        purpose: 'PASSWORD_RESET'
      });
      console.log(`✉️ Password reset verification email dispatched to: ${cleanEmail}`);
    } catch (emailErr) {
      console.error(`❌ Failed to send password reset email: ${emailErr.message}`);
    }

    return res.json({
      success: true,
      message: 'Password reset code sent to your email address.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send password reset code.'
    });
  }
});

// 5. Reset Password Endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, verification code, and new password.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const store = getStore();

    let record = null;
    if (isMongoConnected) {
      record = await OtpVerification.findOne({ email: cleanEmail, purpose: 'PASSWORD_RESET', verified: true });
    } else {
      record = store.otpverifications.find((o) => o.email === cleanEmail && o.purpose === 'PASSWORD_RESET' && o.verified);
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Please verify the OTP code first before resetting password.'
      });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    if (isMongoConnected) {
      await User.findOneAndUpdate({ email: cleanEmail }, { passwordHash });
      await OtpVerification.deleteMany({ email: cleanEmail, purpose: 'PASSWORD_RESET' });
    } else {
      const user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) user.passwordHash = passwordHash;
      store.otpverifications = store.otpverifications.filter((o) => !(o.email === cleanEmail && o.purpose === 'PASSWORD_RESET'));
      saveStore();
    }

    return res.json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new password.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update password.'
    });
  }
});

// 6. Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !rawPassword || rawPassword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password.'
      });
    }

    const store = getStore();

    let user = null;
    let profile = null;

    if (isDbMongo()) {
      user = await User.findOne({ email: cleanEmail }).lean();
      if (user) profile = await UserProfile.findOne({ user: user._id }).lean();
    } else {
      user = store.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
      if (user) profile = store.userprofiles.find((p) => (p.user?._id || p.user).toString() === (user._id || user.id).toString());
    }

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status === 'suspended' || user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: `Account ${user.status}. Please contact platform admin.`
      });
    }

    const match = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Block unverified accounts from logging in
    if (user.isEmailVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        unverified: true,
        email: user.email
      });
    }

    const userPayload = {
      id: (user._id || user.id).toString(),
      full_name: profile ? profile.fullName : 'Student',
      email: user.email,
      phone: user.phone,
      role: (user.role || 'STUDENT').toLowerCase(),
      institution: profile ? profile.institution : 'State University of Technology',
      department: profile ? profile.department : 'Computer Science',
      semester: profile ? profile.semester : 1,
      avatar_url: profile ? profile.avatarUrl : '',
      eco_points: profile ? profile.ecoPoints : 0,
      rating: profile ? (profile.rating || 0) : 0,
      created_at: user.createdAt
    };

    const token = generateToken(user, profile);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
});

// 7. Get Profile (`/me`)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const store = getStore();
    const userId = req.user.id;

    let user = null;
    let profile = null;

    if (isDbMongo()) {
      user = await User.findById(userId).lean();
      if (user) profile = await UserProfile.findOne({ user: userId }).lean();
    } else {
      user = store.users.find((u) => (u._id || u.id).toString() === userId);
      profile = store.userprofiles.find((p) => (p.user?._id || p.user).toString() === userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.json({
      id: (user._id || user.id).toString(),
      full_name: profile ? profile.fullName : 'Student',
      email: user.email,
      phone: user.phone,
      role: (user.role || 'STUDENT').toLowerCase(),
      institution: profile ? profile.institution : 'State University of Technology',
      department: profile ? profile.department : 'Computer Science',
      semester: profile ? profile.semester : 1,
      avatar_url: profile ? profile.avatarUrl : '',
      eco_points: profile ? profile.ecoPoints : 0,
      rating: profile ? (profile.rating || 0) : 0,
      status: user.status,
      created_at: user.createdAt
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.'
    });
  }
});

// 8. Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, institution, department, semester, avatar_url } = req.body;
    const store = getStore();
    const userId = req.user.id;

    let user = store.users.find((u) => (u._id || u.id).toString() === userId);
    let profile = store.userprofiles.find((p) => (p.user?._id || p.user).toString() === userId);

    if (user && phone) user.phone = phone;
    if (profile) {
      if (full_name) profile.fullName = full_name;
      if (institution) profile.institution = institution;
      if (department) profile.department = department;
      if (semester) profile.semester = parseInt(semester, 10);
      if (avatar_url) profile.avatarUrl = avatar_url;
    }
    saveStore();

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: userId,
        full_name: profile ? profile.fullName : full_name,
        email: user ? user.email : req.user.email,
        phone: user ? user.phone : phone,
        role: (req.user.role || 'STUDENT').toLowerCase(),
        institution: profile ? profile.institution : institution,
        department: profile ? profile.department : department,
        semester: profile ? profile.semester : semester,
        avatar_url: profile ? profile.avatarUrl : avatar_url,
        eco_points: profile ? profile.ecoPoints : 0,
        rating: profile ? (profile.rating || 0) : 0
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.'
    });
  }
});

export default router;
