const { findMatches, updateMatchStatus, getAcceptedMatches } = require('../utils/matchUtils');
const User = require('../models/User');
const mongoose = require('mongoose');
const { calculateBestMatches } = require('../utils/mlMatches');

/**
 * @route   GET /api/matches
 * @desc    Get potential matches for the current user
 * @access  Private
 */
const getPotentialMatches = async (req, res) => {
  try {
    console.log('🔍 [Match Controller] Getting potential matches for user:', req.user._id);
    
    // Get current user with full profile
    const currentUser = await User.findById(req.user._id)
      .select('name email subjectsToTeach subjectsToLearn matches connections')
      .lean();
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all other users with complete profiles
    const allUsers = await User.find({
      _id: { $ne: req.user._id },
      isProfileComplete: true,
      status: { $ne: 'blocked' }
    }).select('name email bio subjectsToTeach subjectsToLearn profileImage').lean();

    console.log(`Found ${allUsers.length} potential candidates`);

    // Use ML matching algorithm
    const matches = await calculateBestMatches(currentUser, allUsers);
    
    // Filter out existing connections, rejected matches, and pending matches
    const connectionIds = (currentUser.connections || []).map(id => id.toString());
    const existingMatchIds = (currentUser.matches || [])
      .map(m => m.userId ? m.userId.toString() : m.user ? m.user.toString() : null)
      .filter(Boolean);
    
    const filteredMatches = matches.filter(match => {
      const matchId = match.user.toString();
      return !connectionIds.includes(matchId) && !existingMatchIds.includes(matchId);
    });

    console.log(`✅ Returning ${filteredMatches.length} filtered matches`);
    console.log('Sample match data:', JSON.stringify(filteredMatches[0], null, 2));
    res.json(filteredMatches);
    
  } catch (error) {
    console.error('❌ Error getting potential matches:', error);
    res.status(500).json({ 
      error: 'Server error while finding matches',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @route   PUT /api/matches/:userId/respond
 * @desc    Respond to a match request (accept/reject)
 * @access  Private
 */
const respondToMatch = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { status } = req.body;
    const { userId: targetUserId } = req.params;

    console.log(`🔄 Processing ${status} request from ${req.user._id} to ${targetUserId}`);

    if (!['accepted', 'rejected', 'pending'].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be "accepted", "rejected", or "pending"' 
      });
    }

    // Get both users
    const [currentUser, targetUser] = await Promise.all([
      User.findById(req.user._id).session(session).select('+matches +connections'),
      User.findById(targetUserId).session(session).select('+matches +connections')
    ]);

    if (!targetUser) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    console.log(`👥 Current user: ${currentUser.name}, Target user: ${targetUser.name}`);

    // Initialize arrays if they don't exist
    if (!currentUser.matches) currentUser.matches = [];
    
    const now = new Date();
    
    if (status === 'pending') {
      // Check if there's already a pending request in either direction
      const hasExistingPending = currentUser.matches.some(
        m => m.userId && m.userId.toString() === targetUserId && m.status === 'pending'
      );
      
      if (hasExistingPending) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'A pending request already exists with this user'
        });
      }
      
      // Create a new pending match request
      currentUser.matches.push({
        userId: targetUserId,
        status: 'pending',
        isInitiator: true,
        createdAt: now,
        updatedAt: now
      });
      
      // Create a pending match for the target user
      targetUser.matches = targetUser.matches || [];
      targetUser.matches.push({
        userId: currentUser._id,
        status: 'pending',
        isInitiator: false,
        createdAt: now,
        updatedAt: now
      });
      
      await Promise.all([
        currentUser.save({ session }),
        targetUser.save({ session })
      ]);
      
      await session.commitTransaction();
      
      return res.json({
        success: true,
        message: 'Connection request sent!',
        isMutual: false
      });
    } 
    // If accepting a match
    else if (status === 'accepted') {
      // Check if target user has sent a request
      const targetMatchIndex = targetUser.matches.findIndex(
        m => m.userId && m.userId.toString() === currentUser._id.toString()
      );
      
      if (targetMatchIndex === -1) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'No pending request found from this user'
        });
      }
      
      // Initialize connections arrays if they don't exist
      currentUser.connections = currentUser.connections || [];
      targetUser.connections = targetUser.connections || [];
      
      // Add to connections if not already connected
      if (!currentUser.connections.some(id => id.toString() === targetUserId)) {
        currentUser.connections.push(targetUserId);
      }
      if (!targetUser.connections.some(id => id.toString() === currentUser._id.toString())) {
        targetUser.connections.push(currentUser._id);
      }
      
      // Update match status for both users
      const existingMatchIndex = currentUser.matches.findIndex(
        m => m.userId && m.userId.toString() === targetUserId
      );
      
      if (existingMatchIndex !== -1) {
        currentUser.matches[existingMatchIndex].status = 'accepted';
        currentUser.matches[existingMatchIndex].updatedAt = now;
      } else {
        currentUser.matches.push({
          userId: targetUserId,
          status: 'accepted',
          isInitiator: false,
          createdAt: now,
          updatedAt: now
        });
      }
      
      // Update target user's match status
      targetUser.matches[targetMatchIndex].status = 'accepted';
      targetUser.matches[targetMatchIndex].updatedAt = now;
      
      await Promise.all([
        currentUser.save({ session }),
        targetUser.save({ session })
      ]);
      
      await session.commitTransaction();
      
      return res.json({
        success: true,
        message: 'Connection established successfully! You can now start interacting.',
        isMutual: true
      });
    } 
    // If rejecting a match
    else if (status === 'rejected') {
      // Update or create match status as rejected
      const existingMatchIndex = currentUser.matches.findIndex(
        m => m.userId && m.userId.toString() === targetUserId
      );
      
      if (existingMatchIndex !== -1) {
        currentUser.matches[existingMatchIndex].status = 'rejected';
        currentUser.matches[existingMatchIndex].updatedAt = now;
      } else {
        currentUser.matches.push({
          userId: targetUserId,
          status: 'rejected',
          isInitiator: false,
          createdAt: now,
          updatedAt: now
        });
      }
      
      await currentUser.save({ session });
      await session.commitTransaction();
      
      return res.json({
        success: true,
        message: 'Match request declined',
        isMutual: false
      });
    }
  } catch (error) {
    console.error('❌ Error processing match response:', error);
    await session.abortTransaction();
    
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

/**
 * @route   GET /api/matches/status
 * @desc    Get match status including connections and pending requests
 * @access  Private
 */
const getMatchStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with populated connections
    const user = await User.findById(userId)
      .populate('connections', 'name email profileImage bio subjectsToTeach subjectsToLearn')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all users to check for pending matches
    const allUsers = await User.find({
      _id: { $ne: userId },
      isProfileComplete: true
    }).select('name email profileImage bio matches').lean();

    const pending = { sent: [], received: [] };

    // Check current user's matches for sent requests
    if (user.matches) {
      for (const match of user.matches) {
        if (match.status === 'pending') {
          const matchUserId = match.userId || match.user;
          const matchedUser = allUsers.find(u => u._id.toString() === matchUserId.toString());
          if (matchedUser) {
            pending.sent.push({
              _id: matchedUser._id,
              name: matchedUser.name,
              email: matchedUser.email,
              profileImage: matchedUser.profileImage,
              bio: matchedUser.bio
            });
          }
        }
      }
    }

    // Check other users' matches for received requests
    for (const otherUser of allUsers) {
      if (otherUser.matches) {
        const matchToMe = otherUser.matches.find(m => {
          const matchUserId = m.userId || m.user;
          return matchUserId && matchUserId.toString() === userId.toString() && m.status === 'pending';
        });
        
        if (matchToMe) {
          pending.received.push({
            _id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            profileImage: otherUser.profileImage,
            bio: otherUser.bio
          });
        }
      }
    }

    res.json({
      connections: user.connections || [],
      pending
    });

  } catch (error) {
    console.error('❌ Error getting match status:', error);
    res.status(500).json({ 
      error: 'Server error while fetching match status'
    });
  }
};

/**
 * @route   GET /api/matches/connections
 * @desc    Get all connections for the current user
 * @access  Private
 */
const getConnections = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('connections', 'name email profileImage bio subjectsToTeach subjectsToLearn')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      connections: user.connections || [],
      total: (user.connections || []).length
    });
    
  } catch (error) {
    console.error('❌ Error getting connections:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching connections'
    });
  }
};

/**
 * @route   POST /api/matches/like/:userId
 * @desc    Like/connect with another user
 * @access  Private
 */
const likeUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user ID' 
      });
    }

    // Get users with session
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).session(session),
      User.findById(targetUserId).session(session)
    ]);

    if (!targetUser) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Initialize arrays if they don't exist
    if (!currentUser.matches) currentUser.matches = [];
    if (!targetUser.matches) targetUser.matches = [];
    if (!currentUser.connections) currentUser.connections = [];
    if (!targetUser.connections) targetUser.connections = [];

    // Check if already matched
    let existingMatch = currentUser.matches.find(m => {
      const matchUserId = m.userId || m.user;
      return matchUserId && matchUserId.toString() === targetUserId;
    });

    if (existingMatch) {
      existingMatch.status = 'pending';
      existingMatch.matchDate = new Date();
    } else {
      currentUser.matches.push({
        userId: targetUserId,
        status: 'pending',
        matchDate: new Date()
      });
    }

    // Check if this is a mutual like
    const reverseMatch = targetUser.matches.find(m => {
      const matchUserId = m.userId || m.user;
      return matchUserId && matchUserId.toString() === currentUserId.toString();
    });

    let isMutual = false;

    if (reverseMatch && reverseMatch.status === 'pending') {
      // This is a mutual match - update both users
      reverseMatch.status = 'accepted';
      reverseMatch.matchDate = new Date();
      
      const currentMatch = currentUser.matches.find(m => {
        const matchUserId = m.userId || m.user;
        return matchUserId && matchUserId.toString() === targetUserId;
      });
      if (currentMatch) {
        currentMatch.status = 'accepted';
        currentMatch.matchDate = new Date();
      }

      // Add to connections if not already connected
      if (!currentUser.connections.includes(targetUserId)) {
        currentUser.connections.push(targetUserId);
      }
      if (!targetUser.connections.includes(currentUserId)) {
        targetUser.connections.push(currentUserId);
      }
      
      isMutual = true;
    }

    await Promise.all([
      currentUser.save({ session }),
      targetUser.save({ session })
    ]);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      isMutual,
      message: isMutual 
        ? 'Connection established! You can now message each other.'
        : 'Connection request sent! You\'ll be notified if they accept.'
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error liking user:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      targetUserId: req.params.userId,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Server error while processing like',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPotentialMatches,
  respondToMatch,
  getMatchStatus,
  getConnections,
  likeUser
};
