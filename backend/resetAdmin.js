const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const resetAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'Admin@peerlink.com' });
    
    if (existingAdmin) {
      console.log('Updating existing admin user...');
      
      // Update admin password
      const hashedPassword = await bcrypt.hash('password@123', 10);
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      
      console.log('Admin user updated successfully!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('password@123', 10);
      const admin = new User({
        name: 'Admin',
        email: 'Admin@peerlink.com',
        password: hashedPassword,
        isAdmin: true,
        isProfileComplete: true,
        status: 'online',
        lastActive: new Date(),
        subjectsToTeach: [
          { subject: 'Mathematics', proficiency: 5, teachingExperience: 3 },
          { subject: 'Computer Science', proficiency: 5, teachingExperience: 5 }
        ],
        subjectsToLearn: [
          { subject: 'Physics', desiredLevel: 3, priority: 2 },
          { subject: 'Chemistry', desiredLevel: 2, priority: 1 }
        ]
      });

      await admin.save();
      console.log('New admin user created successfully!');
    }
    
    console.log('Admin credentials:');
    console.log('Email: Admin@peerlink.com');
    console.log('Password: password@123');

  } catch (error) {
    console.error('Error resetting admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

resetAdminUser();