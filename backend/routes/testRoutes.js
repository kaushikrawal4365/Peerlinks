const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// Test endpoint to get all matches for a user
router.get('/matches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .populate('matches.userId', 'name email')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      matches: user.matches?.map(match => ({
        to: {
          id: match.userId._id,
          name: match.userId.name,
          email: match.userId.email
        },
        status: match.status,
        score: match.matchScore || match.score || 0,
        date: match.matchDate
      })) || [],
      totalMatches: user.matches?.length || 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Test endpoint to get all connections for a user
router.get('/connections/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .populate('connections', 'name email')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      connections: user.connections?.map(conn => ({
        id: conn._id,
        name: conn.name,
        email: conn.email
      })) || [],
      totalConnections: user.connections?.length || 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting connections:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Test endpoint to check match status between two users
router.get('/status/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId1) || !mongoose.Types.ObjectId.isValid(userId2)) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    const [user1, user2] = await Promise.all([
      User.findById(userId1).populate('matches.userId', 'name email').lean(),
      User.findById(userId2).populate('matches.userId', 'name email').lean()
    ]);

    if (!user1 || !user2) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    // Check user1's match to user2
    const match1to2 = user1.matches?.find(m => 
      m.userId._id.toString() === userId2
    );

    // Check user2's match to user1
    const match2to1 = user2.matches?.find(m => 
      m.userId._id.toString() === userId1
    );

    // Check if they're connected
    const areConnected = user1.connections?.some(c => c.toString() === userId2) || false;

    const result = {
      users: {
        user1: { id: user1._id, name: user1.name, email: user1.email },
        user2: { id: user2._id, name: user2.name, email: user2.email }
      },
      matchStatus: {
        user1ToUser2: match1to2 ? {
          status: match1to2.status,
          score: match1to2.matchScore || match1to2.score || 0,
          date: match1to2.matchDate
        } : null,
        user2ToUser1: match2to1 ? {
          status: match2to1.status,
          score: match2to1.matchScore || match2to1.score || 0,
          date: match2to1.matchDate
        } : null
      },
      connected: areConnected,
      summary: {
        bothLiked: match1to2?.status === 'pending' && match2to1?.status === 'pending',
        mutualMatch: match1to2?.status === 'accepted' && match2to1?.status === 'accepted',
        oneWayLike: (match1to2 && !match2to1) || (match2to1 && !match1to2)
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting match status:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Test endpoint to simulate connection request
router.post('/connect/:fromUserId/:toUserId', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { fromUserId, toUserId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(fromUserId) || !mongoose.Types.ObjectId.isValid(toUserId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId).session(session),
      User.findById(toUserId).session(session)
    ]);

    if (!fromUser || !toUser) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'One or both users not found' });
    }

    // Initialize arrays
    if (!fromUser.matches) fromUser.matches = [];
    if (!toUser.matches) toUser.matches = [];
    if (!fromUser.connections) fromUser.connections = [];
    if (!toUser.connections) toUser.connections = [];

    // Check if already matched
    let existingMatch = fromUser.matches.find(m => {
      const matchUserId = m.userId || m.user;
      return matchUserId && matchUserId.toString() === toUserId;
    });

    if (existingMatch) {
      await session.abortTransaction();
      return res.json({
        success: false,
        message: 'Match already exists',
        existingStatus: existingMatch.status,
        from: { id: fromUser._id, name: fromUser.name },
        to: { id: toUser._id, name: toUser.name }
      });
    }

    // Add match from fromUser to toUser
    fromUser.matches.push({
      userId: toUserId,
      status: 'pending',
      matchDate: new Date()
    });

    // Check if toUser already liked fromUser (mutual match)
    const reverseMatch = toUser.matches.find(m => {
      const matchUserId = m.userId || m.user;
      return matchUserId && matchUserId.toString() === fromUserId;
    });

    let isMutual = false;
    if (reverseMatch && reverseMatch.status === 'pending') {
      // Mutual match - update both to accepted and add connections
      reverseMatch.status = 'accepted';
      reverseMatch.matchDate = new Date();
      
      const currentMatch = fromUser.matches.find(m => {
        const matchUserId = m.userId || m.user;
        return matchUserId && matchUserId.toString() === toUserId;
      });
      if (currentMatch) {
        currentMatch.status = 'accepted';
        currentMatch.matchDate = new Date();
      }

      // Add to connections
      if (!fromUser.connections.includes(toUserId)) {
        fromUser.connections.push(toUserId);
      }
      if (!toUser.connections.includes(fromUserId)) {
        toUser.connections.push(fromUserId);
      }
      
      isMutual = true;
    }

    await Promise.all([
      fromUser.save({ session }),
      toUser.save({ session })
    ]);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      isMutual,
      message: isMutual ? 'Mutual match! Connection established.' : 'Connection request sent.',
      from: { id: fromUser._id, name: fromUser.name, email: fromUser.email },
      to: { id: toUser._id, name: toUser.name, email: toUser.email },
      status: isMutual ? 'accepted' : 'pending',
      timestamp: new Date()
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Test endpoint to get all users (for testing purposes)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email isProfileComplete')
      .limit(20)
      .lean();

    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        profileComplete: user.isProfileComplete
      })),
      total: users.length
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Test endpoint to reset matches for a user (for testing)
router.delete('/reset/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await User.findByIdAndUpdate(userId, {
      $set: { matches: [], connections: [] }
    });

    res.json({
      success: true,
      message: 'User matches and connections reset',
      userId
    });
  } catch (error) {
    console.error('Error resetting user:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;