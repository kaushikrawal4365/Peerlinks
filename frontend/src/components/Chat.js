import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Container,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Circle as CircleIcon,
  VideoCall as VideoCallIcon,
  Event as EventIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import Calendar from './Calendar';

const Chat = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    date: '',
    time: ''
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Get user's connections
        const connectionsResponse = await axios.get('http://localhost:5001/api/matches/connections', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const connectionsData = connectionsResponse.data?.connections || [];
        setConnections(connectionsData);
        
        // If matchId is provided, select that chat
        if (matchId) {
          const selectedUser = connectionsData.find(conn => conn._id === matchId);
          if (selectedUser) {
            setSelectedChat(selectedUser);
            await loadMessages(matchId, token);
          }
        }
        
        // Initialize socket
        const newSocket = io('http://localhost:5001');
        newSocket.emit('authenticate', token);
        setSocket(newSocket);
        
        // Listen for new messages (including meeting messages)
        newSocket.on('new_message', (message) => {
          console.log('Received message:', message);
          if (message.messageType === 'meeting') {
            console.log('Meeting message received:', message.meeting);
          }
          if (selectedChat && 
              ((message.sender === selectedChat._id && message.recipient === user._id) ||
               (message.sender === user._id && message.recipient === selectedChat._id))) {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
          }
        });
        
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      initializeChat();
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);
  
  const loadMessages = async (userId, token) => {
    try {
      const messagesResponse = await axios.get(`http://localhost:5001/api/chat/messages/${userId}`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      });
      setMessages(messagesResponse.data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  const handleChatSelect = async (connection) => {
    setSelectedChat(connection);
    await loadMessages(connection._id);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem('token');
      const messageData = {
        recipient: selectedChat._id,
        content: newMessage.trim()
      };
      
      await axios.post('http://localhost:5001/api/chat/send', messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleScheduleMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const startTime = new Date(`${meetingData.date}T${meetingData.time}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
      
      const response = await axios.post('http://localhost:5001/api/meetings/schedule', {
        participantId: selectedChat._id,
        title: meetingData.title || `Study Session with ${selectedChat.name}`,
        description: meetingData.description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setScheduleDialog(false);
        setMeetingData({ title: '', description: '', date: '', time: '' });
        // Don't show alert, the meeting will appear in chat
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 2, p: 2 }}>
      {/* Connections List */}
      <Paper sx={{ width: 300, overflow: 'auto' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Messages</Typography>
        </Box>
        <List>
          {connections.map((connection) => (
            <ListItem
              key={connection._id}
              button
              selected={selectedChat?._id === connection._id}
              onClick={() => handleChatSelect(connection)}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <CircleIcon
                      sx={{
                        color: connection.status === 'online' ? '#44b700' : '#ccc',
                        fontSize: 12
                      }}
                    />
                  }
                >
                  <Avatar src={connection.profileImage}>
                    {connection.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={connection.name}
                secondary="Click to start chatting"
                secondaryTypographyProps={{
                  noWrap: true,
                  style: { maxWidth: '180px' }
                }}
              />
            </ListItem>
          ))}
        </List>
        {connections.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No connections yet. Go to Matches to connect with peers!
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Chat Area */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={selectedChat.profileImage}>
                  {selectedChat.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedChat.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {selectedChat.status === 'online' ? 'Online' : 'Offline'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EventIcon />}
                onClick={() => setCalendarOpen(true)}
                size="small"
              >
                Calendar
              </Button>
            </Box>

            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
              {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="body1" color="textSecondary">
                    No messages yet. Start the conversation!
                  </Typography>
                </Box>
              ) : (
                messages.map((message, index) => {
                  console.log('Rendering message:', message.messageType, message.meeting ? 'has meeting' : 'no meeting');
                  
                  // Handle meeting messages differently
                  if (message.messageType === 'meeting' && message.meeting) {
                    console.log('Rendering meeting card for:', message.meeting.title);
                    return (
                      <Box key={message._id || index} sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                        <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', maxWidth: '80%', textAlign: 'center', border: '2px solid #1976d2' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                            <EventIcon color="primary" />
                            <Typography variant="h6" color="primary">
                              {message.meeting.title}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            📅 {new Date(message.meeting.startTime).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                            🔗 {message.meeting.meetLink}
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<VideoCallIcon />}
                            onClick={() => {
                              console.log('Opening meeting link:', message.meeting.meetLink);
                              window.open(message.meeting.meetLink, '_blank');
                            }}
                            size="small"
                          >
                            Join Meeting
                          </Button>
                        </Paper>
                      </Box>
                    );
                  }
                  
                  // Regular messages
                  const isMyMessage = message.sender === user._id || message.sender._id === user._id;
                  return (
                    <Box
                      key={message._id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          backgroundColor: isMyMessage ? '#1976d2' : '#f5f5f5',
                          color: isMyMessage ? 'white' : 'black',
                          maxWidth: '70%',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: isMyMessage ? 'rgba(255,255,255,0.7)' : 'textSecondary',
                            display: 'block',
                            textAlign: 'right',
                            mt: 0.5
                          }}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder={`Message ${selectedChat.name}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  multiline
                  maxRows={3}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Select a connection to start chatting
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Calendar Dialog */}
      <Dialog 
        open={calendarOpen} 
        onClose={() => setCalendarOpen(false)} 
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: '400px',
            height: '400px',
            maxHeight: '80vh',
            position: 'absolute',
            top: '80px',
            right: '20px',
            m: 0,
            borderRadius: 2,
            boxShadow: 3
          }
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'transparent'
          }
        }}
      >
        <DialogTitle sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Calendar</Typography>
          <IconButton size="small" onClick={() => setCalendarOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <Calendar chatUserId={selectedChat?._id} compact={true} />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Chat;
