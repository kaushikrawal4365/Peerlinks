import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Calendar = ({ chatUserId, compact = false }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    isRecurring: false,
    recurringPattern: ''
  });
  const [conflicts, setConflicts] = useState([]);

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Load meetings
  const loadMeetings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/meetings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(response.data);
      setError('');
    } catch (err) {
      console.error('Error loading meetings:', err);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  // Load meetings on component mount and when currentDate changes
  useEffect(() => {
    loadMeetings();
  }, [currentDate]);

  // Handle previous month
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const prevMonth = new Date(prev);
      prevMonth.setMonth(prev.getMonth() - 1);
      return prevMonth;
    });
  };

  // Handle next month
  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const nextMonth = new Date(prev);
      nextMonth.setMonth(prev.getMonth() + 1);
      return nextMonth;
    });
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setMeetingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle dialog open
  const handleOpenDialog = () => {
    // Reset form
    setMeetingForm({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      isRecurring: false,
      recurringPattern: ''
    });
    setConflicts([]);
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle meeting creation
  const handleCreateMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const { title, description, date, time, isRecurring, recurringPattern } = meetingForm;
      
      // Combine date and time
      const startTime = new Date(`${date}T${time}`);
      
      const response = await axios.post('http://localhost:5001/api/meetings', {
        title,
        description,
        participantId: chatUserId,
        startTime: startTime.toISOString(),
        isRecurring,
        recurringPattern
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add new meeting to state
      setMeetings(prev => [...prev, response.data]);
      setOpenDialog(false);
      
    } catch (err) {
      console.error('Error creating meeting:', err);
      if (err.response?.status === 409) {
        // Handle conflicts
        setConflicts(err.response.data.conflicts || []);
      } else {
        setError('Failed to create meeting');
      }
    }
  };

  // Handle meeting click
  const handleMeetingClick = (meeting) => {
    setSelectedMeeting(meeting);
    setOpenDetailsDialog(true);
  };

  // Handle details dialog close
  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
  };

  // Handle meeting status update
  const handleUpdateStatus = async (status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`http://localhost:5001/api/meetings/${selectedMeeting._id}/status`, {
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update meeting in state
      setMeetings(prev => prev.map(m => 
        m._id === selectedMeeting._id ? response.data : m
      ));
      
      setSelectedMeeting(response.data);
      
    } catch (err) {
      console.error(`Error ${status} meeting:`, err);
      if (err.response?.status === 409) {
        // Handle conflicts
        setConflicts(err.response.data.conflicts || []);
      } else {
        setError(`Failed to ${status} meeting`);
      }
    }
  };

  // Handle meeting edit
  const handleEditMeeting = () => {
    // Populate form with selected meeting data
    const meeting = selectedMeeting;
    const startDate = new Date(meeting.startTime);
    
    setMeetingForm({
      title: meeting.title,
      description: meeting.description || '',
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().slice(0, 5),
      isRecurring: meeting.isRecurring,
      recurringPattern: meeting.recurringPattern
    });
    
    setOpenDetailsDialog(false);
    setOpenDialog(true);
  };

  // Handle meeting update
  const handleUpdateMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const { title, description, date, time, isRecurring, recurringPattern } = meetingForm;
      
      // Combine date and time
      const startTime = new Date(`${date}T${time}`);
      
      const response = await axios.put(`http://localhost:5001/api/meetings/${selectedMeeting._id}`, {
        title,
        description,
        startTime: startTime.toISOString(),
        isRecurring,
        recurringPattern
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update meeting in state
      setMeetings(prev => prev.map(m => 
        m._id === selectedMeeting._id ? response.data : m
      ));
      
      setOpenDialog(false);
      
    } catch (err) {
      console.error('Error updating meeting:', err);
      if (err.response?.status === 409) {
        // Handle conflicts
        setConflicts(err.response.data.conflicts || []);
      } else {
        setError('Failed to update meeting');
      }
    }
  };

  // Handle meeting delete
  const handleDeleteMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/meetings/${selectedMeeting._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove meeting from state
      setMeetings(prev => prev.filter(m => m._id !== selectedMeeting._id));
      setOpenDetailsDialog(false);
      
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError('Failed to delete meeting');
    }
  };

  // Render calendar
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    // Create array of days
    const days = [];
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<Box key={`empty-${i}`} sx={{ p: 1, height: 80 }} />);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      
      // Find meetings for this day
      const dayMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return (
          meetingDate.getFullYear() === year &&
          meetingDate.getMonth() === month &&
          meetingDate.getDate() === day
        );
      });
      
      days.push(
        <Box 
          key={day} 
          sx={{ 
            p: compact ? 0.5 : 1, 
            height: compact ? 50 : 80, 
            border: '1px solid #eee',
            bgcolor: date.toDateString() === new Date().toDateString() ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: date.toDateString() === new Date().toDateString() ? 'bold' : 'normal',
              color: date.toDateString() === new Date().toDateString() ? 'primary.main' : 'text.primary'
            }}
          >
            {day}
          </Typography>
          
          {dayMeetings.map((meeting, index) => (
            <Chip
              key={meeting._id}
              label={meeting.title}
              size="small"
              color={
                meeting.status === 'accepted' ? 'success' :
                meeting.status === 'rejected' ? 'error' :
                meeting.status === 'cancelled' ? 'default' : 'primary'
              }
              variant={meeting.creator.toString() === user._id ? 'filled' : 'outlined'}
              onClick={() => handleMeetingClick(meeting)}
              sx={{ 
                mt: 0.5, 
                maxWidth: '100%',
                fontSize: compact ? '0.6rem' : '0.7rem',
                height: compact ? 16 : 20,
                opacity: meeting.status === 'cancelled' ? 0.6 : 1,
                '& .MuiChip-label': {
                  px: compact ? 0.5 : 1
                }
              }}
            />
          ))}
        </Box>
      );
    }
    
    return days;
  };

  return (
    <Box sx={{ mb: compact ? 0 : 3 }}>
      <Paper sx={{ p: compact ? 1 : 2, borderRadius: 2, boxShadow: compact ? 0 : 1 }}>
        {/* Calendar Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handlePrevMonth} size="small">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ mx: 1 }}>
              {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Typography>
            <IconButton onClick={handleNextMonth} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Box>
          
          <Button
            variant={compact ? "outlined" : "contained"}
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{ fontSize: compact ? '0.75rem' : 'inherit' }}
          >
            Schedule Meeting
          </Button>
        </Box>
        
        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Calendar Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <>
            {/* Day headers */}
            <Grid container>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Grid item xs={12/7} key={day}>
                  <Typography 
                    variant={compact ? "caption" : "subtitle2"} 
                    align="center"
                    sx={{ 
                      fontWeight: 'bold',
                      p: compact ? 0.3 : 0.5,
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderRadius: '4px 4px 0 0',
                      fontSize: compact ? '0.7rem' : 'inherit'
                    }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            
            {/* Calendar days */}
            <Grid container>
              {renderCalendar().map((day, index) => (
                <Grid item xs={12/7} key={index}>
                  {day}
                </Grid>
              ))}
            </Grid>
            
            {/* Legend */}
            {!compact && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 1, mr: 0.5 }} />
                  <Typography variant="caption">Created by you</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 12, height: 12, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, mr: 0.5 }} />
                  <Typography variant="caption">Invited by others</Typography>
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>
      
      {/* Create/Edit Meeting Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}
        </DialogTitle>
        <DialogContent>
          {conflicts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant={compact ? "caption" : "body2"} fontWeight="bold">
                Time slot conflicts with existing meetings:
              </Typography>
              {conflicts.map((conflict, index) => (
                <Typography key={index} variant="body2">
                  • {conflict.title} ({formatDate(new Date(conflict.startTime))} {formatTime(new Date(conflict.startTime))})
                </Typography>
              ))}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label="Title"
            name="title"
            value={meetingForm.title}
            onChange={handleFormChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            name="description"
            value={meetingForm.description}
            onChange={handleFormChange}
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Date"
                name="date"
                type="date"
                value={meetingForm.date}
                onChange={handleFormChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Time"
                name="time"
                type="time"
                value={meetingForm.time}
                onChange={handleFormChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>Recurring</InputLabel>
            <Select
              name="isRecurring"
              value={meetingForm.isRecurring}
              onChange={(e) => setMeetingForm(prev => ({
                ...prev,
                isRecurring: e.target.value,
                recurringPattern: e.target.value ? prev.recurringPattern || 'weekly' : ''
              }))}
              label="Recurring"
            >
              <MenuItem value={false}>No</MenuItem>
              <MenuItem value={true}>Yes</MenuItem>
            </Select>
          </FormControl>
          
          {meetingForm.isRecurring && (
            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>Recurring Pattern</InputLabel>
              <Select
                name="recurringPattern"
                value={meetingForm.recurringPattern}
                onChange={handleFormChange}
                label="Recurring Pattern"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={selectedMeeting ? handleUpdateMeeting : handleCreateMeeting} 
            variant="contained"
            disabled={!meetingForm.title || !meetingForm.date || !meetingForm.time}
          >
            {selectedMeeting ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Meeting Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
        {selectedMeeting && (
          <>
            <DialogTitle sx={{ 
              bgcolor: 
                selectedMeeting.status === 'accepted' ? 'success.light' :
                selectedMeeting.status === 'rejected' ? 'error.light' :
                selectedMeeting.status === 'cancelled' ? 'grey.300' : 'primary.light',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Box>
                <Typography variant="h6">{selectedMeeting.title}</Typography>
                <Chip 
                  label={selectedMeeting.status.toUpperCase()} 
                  size="small" 
                  sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', mt: 0.5 }}
                />
              </Box>
              <IconButton onClick={handleCloseDetailsDialog} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body1">
                      {formatDate(new Date(selectedMeeting.startTime))}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body1">
                      {formatTime(new Date(selectedMeeting.startTime))} - {formatTime(new Date(selectedMeeting.endTime))}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Description</Typography>
                  <Typography variant="body1" paragraph>
                    {selectedMeeting.description || 'No description provided.'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Participants</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      label={`${selectedMeeting.creator.name} (Creator)`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={selectedMeeting.participant.name}
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                
                {selectedMeeting.isRecurring && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold">Recurring</Typography>
                    <Typography variant="body1">
                      This meeting repeats {selectedMeeting.recurringPattern}.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
              {/* Show different actions based on user role and meeting status */}
              {selectedMeeting.creator._id === user._id ? (
                // Creator actions
                <>
                  {selectedMeeting.status !== 'cancelled' && (
                    <>
                      <Button 
                        startIcon={<EditIcon />}
                        onClick={handleEditMeeting}
                      >
                        Edit
                      </Button>
                      <Button 
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDeleteMeeting}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </>
              ) : (
                // Participant actions
                <>
                  {selectedMeeting.status === 'pending' && (
                    <>
                      <Button 
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => handleUpdateStatus('accepted')}
                      >
                        Accept
                      </Button>
                      <Button 
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={() => handleUpdateStatus('rejected')}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button onClick={handleCloseDetailsDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Calendar;