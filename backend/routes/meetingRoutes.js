const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get all meetings for current user (both created and invited)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const meetings = await Meeting.find({
      $or: [
        { creator: userId },
        { participant: userId }
      ]
    })
    .populate('creator', 'name email')
    .populate('participant', 'name email')
    .sort({ startTime: 1 });
    
    res.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Create a new meeting
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, participantId, startTime, endTime, isRecurring, recurringPattern } = req.body;
    
    // Validate required fields
    if (!title || !participantId || !startTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Calculate end time if not provided (default 1 hour)
    const calculatedEndTime = endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000);
    
    // Check for conflicts
    const conflictingMeetings = await Meeting.find({
      $or: [
        { creator: req.user._id },
        { participant: req.user._id }
      ],
      status: 'accepted',
      $or: [
        // Meeting starts during another meeting
        {
          startTime: { $lte: new Date(startTime) },
          endTime: { $gt: new Date(startTime) }
        },
        // Meeting ends during another meeting
        {
          startTime: { $lt: calculatedEndTime },
          endTime: { $gte: calculatedEndTime }
        },
        // Meeting encompasses another meeting
        {
          startTime: { $gte: new Date(startTime) },
          endTime: { $lte: calculatedEndTime }
        }
      ]
    });
    
    if (conflictingMeetings.length > 0) {
      return res.status(409).json({ 
        error: 'Time slot conflicts with an existing meeting',
        conflicts: conflictingMeetings
      });
    }
    
    // Create the meeting
    const meeting = new Meeting({
      title,
      description: description || '',
      creator: req.user._id,
      participant: participantId,
      startTime: new Date(startTime),
      endTime: calculatedEndTime,
      isRecurring: isRecurring || false,
      recurringPattern: recurringPattern || ''
    });
    
    await meeting.save();
    
    // Populate creator and participant info
    await meeting.populate('creator', 'name email');
    await meeting.populate('participant', 'name email');
    
    // Notify participant via socket
    const io = req.app.get('io');
    io.emit('meeting_request', {
      meeting,
      message: `${req.user.name} has invited you to a meeting: ${title}`
    });
    
    res.status(201).json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Update meeting status (accept/reject)
router.patch('/:meetingId/status', authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;
    
    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const meeting = await Meeting.findById(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Check if user is participant or creator
    if (meeting.participant.toString() !== req.user._id.toString() && 
        meeting.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this meeting' });
    }
    
    // Only participant can accept/reject
    if (['accepted', 'rejected'].includes(status) && 
        meeting.participant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the participant can accept or reject meetings' });
    }
    
    // Only creator can cancel
    if (status === 'cancelled' && meeting.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the creator can cancel meetings' });
    }
    
    // Check for conflicts when accepting
    if (status === 'accepted') {
      const conflictingMeetings = await Meeting.find({
        $or: [
          { creator: req.user._id },
          { participant: req.user._id }
        ],
        _id: { $ne: meetingId },
        status: 'accepted',
        $or: [
          // Meeting starts during another meeting
          {
            startTime: { $lte: meeting.startTime },
            endTime: { $gt: meeting.startTime }
          },
          // Meeting ends during another meeting
          {
            startTime: { $lt: meeting.endTime },
            endTime: { $gte: meeting.endTime }
          },
          // Meeting encompasses another meeting
          {
            startTime: { $gte: meeting.startTime },
            endTime: { $lte: meeting.endTime }
          }
        ]
      });
      
      if (conflictingMeetings.length > 0) {
        return res.status(409).json({ 
          error: 'Time slot conflicts with an existing meeting',
          conflicts: conflictingMeetings
        });
      }
    }
    
    meeting.status = status;
    await meeting.save();
    
    // Populate creator and participant info
    await meeting.populate('creator', 'name email');
    await meeting.populate('participant', 'name email');
    
    // Notify the other user via socket
    const io = req.app.get('io');
    const notifyUserId = meeting.creator.toString() === req.user._id.toString() 
      ? meeting.participant.toString() 
      : meeting.creator.toString();
    
    let message;
    if (status === 'accepted') {
      message = `${req.user.name} has accepted your meeting: ${meeting.title}`;
    } else if (status === 'rejected') {
      message = `${req.user.name} has declined your meeting: ${meeting.title}`;
    } else if (status === 'cancelled') {
      message = `${req.user.name} has cancelled the meeting: ${meeting.title}`;
    }
    
    io.emit('meeting_update', {
      meeting,
      userId: notifyUserId,
      message
    });
    
    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({ error: 'Failed to update meeting status' });
  }
});

// Update meeting details (only creator can update)
router.put('/:meetingId', authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, description, startTime, endTime, isRecurring, recurringPattern } = req.body;
    
    const meeting = await Meeting.findById(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Only creator can update meeting details
    if (meeting.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the creator can update meeting details' });
    }
    
    // Calculate new end time if start time changed but end time not provided
    let newEndTime = endTime;
    if (startTime && !endTime) {
      const duration = meeting.endTime - meeting.startTime;
      newEndTime = new Date(new Date(startTime).getTime() + duration);
    }
    
    // Check for conflicts if time is changing
    if (startTime || endTime) {
      const updatedStart = startTime ? new Date(startTime) : meeting.startTime;
      const updatedEnd = newEndTime ? new Date(newEndTime) : meeting.endTime;
      
      const conflictingMeetings = await Meeting.find({
        $or: [
          { creator: req.user._id },
          { participant: req.user._id }
        ],
        _id: { $ne: meetingId },
        status: 'accepted',
        $or: [
          // Meeting starts during another meeting
          {
            startTime: { $lte: updatedStart },
            endTime: { $gt: updatedStart }
          },
          // Meeting ends during another meeting
          {
            startTime: { $lt: updatedEnd },
            endTime: { $gte: updatedEnd }
          },
          // Meeting encompasses another meeting
          {
            startTime: { $gte: updatedStart },
            endTime: { $lte: updatedEnd }
          }
        ]
      });
      
      if (conflictingMeetings.length > 0) {
        return res.status(409).json({ 
          error: 'Updated time slot conflicts with an existing meeting',
          conflicts: conflictingMeetings
        });
      }
    }
    
    // Update meeting fields
    if (title) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (startTime) meeting.startTime = new Date(startTime);
    if (newEndTime) meeting.endTime = new Date(newEndTime);
    if (isRecurring !== undefined) meeting.isRecurring = isRecurring;
    if (recurringPattern) meeting.recurringPattern = recurringPattern;
    
    // If meeting was already accepted, set back to pending when details change
    if (meeting.status === 'accepted') {
      meeting.status = 'pending';
    }
    
    await meeting.save();
    
    // Populate creator and participant info
    await meeting.populate('creator', 'name email');
    await meeting.populate('participant', 'name email');
    
    // Notify participant via socket
    const io = req.app.get('io');
    io.emit('meeting_update', {
      meeting,
      userId: meeting.participant.toString(),
      message: `${req.user.name} has updated the meeting: ${meeting.title}`
    });
    
    res.json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Delete a meeting
router.delete('/:meetingId', authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const meeting = await Meeting.findById(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Only creator can delete meeting
    if (meeting.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the creator can delete meetings' });
    }
    
    await Meeting.findByIdAndDelete(meetingId);
    
    // Notify participant via socket
    const io = req.app.get('io');
    io.emit('meeting_deleted', {
      meetingId,
      userId: meeting.participant.toString(),
      message: `${req.user.name} has deleted the meeting: ${meeting.title}`
    });
    
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

module.exports = router;