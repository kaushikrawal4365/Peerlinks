const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { 
  getPotentialMatches, 
  respondToMatch, 
  getMatchStatus,
  getConnections,
  likeUser
} = require('../controllers/matchController');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @route   GET /api/matches/potential
 * @desc    Get potential matches for the current user using ML algorithm
 * @access  Private
 */
router.get('/potential', auth, getPotentialMatches);

/**
 * @route   PUT /api/matches/:userId/respond
 * @desc    Respond to a match request (accept/reject)
 * @access  Private
 */
router.put('/:userId/respond', auth, respondToMatch);

/**
 * @route   GET /api/matches/status
 * @desc    Get match status including connections and pending requests
 * @access  Private
 */
router.get('/status', auth, getMatchStatus);

/**
 * @route   GET /api/matches/connections
 * @desc    Get all connections for the current user
 * @access  Private
 */
router.get('/connections', auth, getConnections);

/**
 * @route   DELETE /api/connections/:userId
 * @desc    Remove a connection with another user
 * @access  Private
 */
router.delete('/connections/:userId', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Remove connection from both users
    await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { connections: userId } },
      { session }
    );

    await User.findByIdAndUpdate(
      userId,
      { $pull: { connections: currentUserId } },
      { session }
    );

    // Update match status to rejected
    await User.updateOne(
      { _id: currentUserId, 'matches.user': userId },
      { $set: { 'matches.$.status': 'rejected' } },
      { session }
    );

    await User.updateOne(
      { _id: userId, 'matches.user': currentUserId },
      { $set: { 'matches.$.status': 'rejected' } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Connection removed successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error removing connection:', error);
    res.status(500).json({ error: 'Server error while removing connection' });
  }
});

// Like/connect with another user
router.post('/like/:userId', auth, likeUser);

// Handle socket.io connection for real-time updates
router.io = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Store socket ID with user ID when user connects
    socket.on('register', async (userId) => {
      try {
        await User.findByIdAndUpdate(userId, { socketId: socket.id });
        console.log(`User ${userId} connected with socket ${socket.id}`);
      } catch (error) {
        console.error('Error registering socket:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        await User.findOneAndUpdate(
          { socketId: socket.id },
          { $unset: { socketId: '' } }
        );
        console.log('Client disconnected:', socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};

// ✅ Reject a user
router.post('/reject/:userId', auth, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(currentUserId);
    const match = currentUser.matches.find(
      m => m.user.toString() === targetUserId
    );

    if (match) {
      match.status = 'rejected';
    } else {
      currentUser.matches.push({
        user: targetUserId,
        status: 'rejected',
        matchScore: 0
      });
    }

    await currentUser.save();
    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('❌ Error rejecting user:', error);
    res.status(500).json({ error: 'Server Error' });
  }
});





module.exports = router;
