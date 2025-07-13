/**
 * Match Utility Functions
 * 
 * This module provides functions to find and manage matches between users
 * based on their teaching and learning subjects.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Find potential matches for a user
 * @param {string} currentUserId - ID of the current user
 * @returns {Promise<Array>} - Array of potential matches with scores
 */
async function findMatches(currentUserId) {
  try {
    console.log('🔍 Finding matches for user:', currentUserId);
    
    // 1. Get current user with basic info
    const currentUser = await User.findById(currentUserId)
      .select('subjectsToTeach subjectsToLearn matches')
      .lean();

    if (!currentUser) {
      console.error('❌ User not found:', currentUserId);
      throw new Error('User not found');
    }
    
    // 2. Initialize empty arrays if they don't exist
    if (!Array.isArray(currentUser.subjectsToTeach)) currentUser.subjectsToTeach = [];
    if (!Array.isArray(currentUser.subjectsToLearn)) currentUser.subjectsToLearn = [];
    
    console.log('📚 Current user subjects - Teach:', currentUser.subjectsToTeach);
    console.log('📖 Current user subjects - Learn:', currentUser.subjectsToLearn);

    // 3. Get all potential matches (users who completed profile)
    const allUsers = await User.find({ 
      _id: { $ne: currentUserId },
      isProfileComplete: true
    }).select('name email bio subjectsToTeach subjectsToLearn')
      .lean();

    console.log(`🔍 Found ${allUsers.length} potential match candidates`);
    
    const matches = [];

    // 4. Simple matching logic
    for (const user of allUsers) {
      try {
        // Initialize arrays if they don't exist
        const userSubjectsToTeach = Array.isArray(user.subjectsToTeach) ? user.subjectsToTeach : [];
        const userSubjectsToLearn = Array.isArray(user.subjectsToLearn) ? user.subjectsToLearn : [];
        
        // Extract subject names (safely)
        const userTeachSubjects = userSubjectsToTeach
          .filter(s => s && s.subject)
          .map(s => s.subject.toString().toLowerCase().trim());
          
        const userLearnSubjects = userSubjectsToLearn
          .filter(s => s && s.subject)
          .map(s => s.subject.toString().toLowerCase().trim());

        // Current user's subjects (already initialized as arrays)
        const currentTeachSubjects = currentUser.subjectsToTeach
          .filter(s => s && s.subject)
          .map(s => s.subject.toString().toLowerCase().trim());
          
        const currentLearnSubjects = currentUser.subjectsToLearn
          .filter(s => s && s.subject)
          .map(s => s.subject.toString().toLowerCase().trim());

        // Find matching subjects (case-insensitive)
        const commonTeach = userTeachSubjects.filter(subject => 
          currentLearnSubjects.includes(subject)
        );
        
        const commonLearn = userLearnSubjects.filter(subject =>
          currentTeachSubjects.includes(subject)
        );

        // Calculate match score
        const score = commonTeach.length + commonLearn.length;

        // Only include if there's at least one match in either direction
        if (score > 0) {
          // Check for existing match status
          const existingMatch = Array.isArray(currentUser.matches) 
            ? currentUser.matches.find(m => 
                m && m.userId && m.userId.toString() === user._id.toString()
              )
            : null;

          // Skip if previously rejected
          if (existingMatch && existingMatch.status === 'rejected') {
            continue;
          }

          matches.push({
            userId: user._id,
            name: user.name || 'Anonymous',
            email: user.email || '',
            bio: user.bio || '',
            score,
            commonSubjects: {
              theyTeach: commonTeach,
              theyLearn: commonLearn
            },
            status: (existingMatch && existingMatch.status) || 'pending',
            lastActive: user.lastActive || null
          });
        }
      } catch (error) {
        console.error(`⚠️ Error processing user ${user?._id || 'unknown'}:`, error.message);
        continue; // Skip to next user if there's an error
      }
    }

    console.log(`✅ Found ${matches.length} valid matches`);
    
    // Sort by score (highest first) and then by last active time (most recent first)
    return matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.lastActive || 0) - new Date(a.lastActive || 0);
    });
    
  } catch (error) {
    console.error('❌ Error in findMatches:', {
      message: error.message,
      stack: error.stack,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Update match status between two users
 * @param {string} currentUserId - ID of the current user
 * @param {string} targetUserId - ID of the user being matched with
 * @param {string} status - New status ('accepted' or 'rejected')
 * @returns {Promise<Object>} - Updated match information
 */
async function updateMatchStatus(currentUserId, targetUserId, status) {
  if (!mongoose.Types.ObjectId.isValid(currentUserId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new Error('Invalid user ID format');
  }

  if (!['accepted', 'rejected'].includes(status)) {
    throw new Error('Invalid status. Must be "accepted" or "rejected"');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get both users with session
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).session(session),
      User.findById(targetUserId).session(session)
    ]);

    if (!currentUser || !targetUser) {
      throw new Error('One or both users not found');
    }

    // Initialize matches arrays if they don't exist
    if (!currentUser.matches) currentUser.matches = [];
    if (!targetUser.matches) targetUser.matches = [];

    // Update current user's match status
    let currentUserMatch = currentUser.matches.find(
      match => match.userId.toString() === targetUserId
    );

    if (currentUserMatch) {
      currentUserMatch.status = status;
      currentUserMatch.updatedAt = new Date();
    } else {
      currentUser.matches.push({
        userId: targetUser._id,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Check if this is a mutual match
    let isMutual = false;
    const targetUserMatch = targetUser.matches.find(
      match => match.userId.toString() === currentUserId
    );

    if (status === 'accepted' && targetUserMatch?.status === 'accepted') {
      isMutual = true;
      
      // Add to connections if not already connected
      if (!currentUser.connections) currentUser.connections = [];
      if (!targetUser.connections) targetUser.connections = [];
      
      if (!currentUser.connections.includes(targetUser._id)) {
        currentUser.connections.push(targetUser._id);
      }
      if (!targetUser.connections.includes(currentUser._id)) {
        targetUser.connections.push(currentUser._id);
      }
    }

    // Save both users in the transaction
    await Promise.all([
      currentUser.save({ session }),
      targetUser.save({ session })
    ]);

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      isMutual,
      status: isMutual ? 'connected' : status,
      currentUserId: currentUser._id,
      targetUserId: targetUser._id
    };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in updateMatchStatus:', error);
    throw error;
  }
}

/**
 * Get all accepted matches and connections for a user
 * @param {string} userId - ID of the user
 * @returns {Promise<Array>} - List of accepted matches and connections
 */
async function getAcceptedMatches(userId) {
  try {
    // Get user with populated matches and connections
    const user = await User.findById(userId)
      .select('subjectsToTeach subjectsToLearn matches connections')
      .populate('matches.userId', 'name email bio')
      .populate('connections', 'name email bio subjectsToTeach subjectsToLearn')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const acceptedConnections = [];
    const connectionUserIds = new Set();

    // Process direct connections first
    if (user.connections && user.connections.length > 0) {
      for (const connection of user.connections) {
        if (!connection) continue;
        
        connectionUserIds.add(connection._id.toString());
        
        // Find common subjects
        const userTeachSubjects = (connection.subjectsToTeach || []).map(s => 
          s.subject?.toLowerCase().trim()
        ).filter(Boolean);
        
        const userLearnSubjects = (connection.subjectsToLearn || []).map(s => 
          s.subject?.toLowerCase().trim()
        ).filter(Boolean);
        
        const commonTeach = userTeachSubjects.filter(subject => 
          (user.subjectsToLearn || []).some(s => 
            s.subject?.toLowerCase().trim() === subject
          )
        );
        
        const commonLearn = userLearnSubjects.filter(subject =>
          (user.subjectsToTeach || []).some(s => 
            s.subject?.toLowerCase().trim() === subject
          )
        );

        acceptedConnections.push({
          userId: connection._id,
          name: connection.name,
          email: connection.email,
          bio: connection.bio,
          isConnection: true,
          matchedAt: new Date(),
          commonSubjects: {
            theyTeach: commonTeach,
            theyLearn: commonLearn
          }
        });
      }
    }

    // Process accepted matches that aren't already connections
    if (user.matches) {
      for (const match of user.matches) {
        if (match.status === 'accepted' && match.userId && 
            !connectionUserIds.has(match.userId._id.toString())) {
          
          const matchedUser = await User.findById(match.userId._id)
            .select('name email bio subjectsToTeach subjectsToLearn')
            .lean();

          if (matchedUser) {
            const userTeachSubjects = (matchedUser.subjectsToTeach || []).map(s => 
              s.subject?.toLowerCase().trim()
            ).filter(Boolean);
            
            const userLearnSubjects = (matchedUser.subjectsToLearn || []).map(s => 
              s.subject?.toLowerCase().trim()
            ).filter(Boolean);
            
            const commonTeach = userTeachSubjects.filter(subject => 
              (user.subjectsToLearn || []).some(s => 
                s.subject?.toLowerCase().trim() === subject
              )
            );
            
            const commonLearn = userLearnSubjects.filter(subject =>
              (user.subjectsToTeach || []).some(s => 
                s.subject?.toLowerCase().trim() === subject
              )
            );

            acceptedConnections.push({
              userId: matchedUser._id,
              name: matchedUser.name,
              email: matchedUser.email,
              bio: matchedUser.bio,
              isConnection: false,
              matchedAt: match.matchedAt || new Date(),
              commonSubjects: {
                theyTeach: commonTeach,
                theyLearn: commonLearn
              },
              lastMessage: match.lastMessage
            });
          }
        }
      }
    }

    // Sort by most recent match first
    return acceptedConnections.sort((a, b) => b.matchedAt - a.matchedAt);
  } catch (error) {
    console.error('Error in getAcceptedMatches:', error);
    throw error;
  }
}

module.exports = {
  findMatches,
  updateMatchStatus,
  getAcceptedMatches
};
