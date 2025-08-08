import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  Grid,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import UserProfileDialog from './UserProfileDialog';
import { 
  Check as CheckIcon, 
  Close as CloseIcon,
  Person as PersonIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { matchAPI } from '../services/api';

// TabPanel component for better tab management
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`matches-tabpanel-${index}`}
      aria-labelledby={`matches-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `matches-tab-${index}`,
    'aria-controls': `matches-tabpanel-${index}`,
  };
}

function Matches() {
  const { currentUser } = useAuth();
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [pendingTab, setPendingTab] = useState('received');
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load all match data
  const loadMatches = async () => {
    try {
      setLoading(true);
      
      console.log('Loading matches...');
      
      const [potentialRes, statusRes] = await Promise.allSettled([
        matchAPI.getPotentialMatches(),
        matchAPI.getMatchStatus()
      ]);
      
      if (potentialRes.status === 'fulfilled') {
        const potentialData = potentialRes.value?.data || [];
        console.log('Potential matches loaded:', potentialData.length);
        setPotentialMatches(Array.isArray(potentialData) ? potentialData : []);
      } else {
        console.error('Error fetching potential matches:', potentialRes.reason);
        showSnackbar('Failed to load potential matches', 'error');
      }
      
      if (statusRes.status === 'fulfilled') {
        const statusData = statusRes.value?.data || {};
        console.log('Match status loaded:', {
          connections: statusData.connections?.length || 0,
          pendingSent: statusData.pending?.sent?.length || 0,
          pendingReceived: statusData.pending?.received?.length || 0
        });
        
        setConnections(Array.isArray(statusData.connections) ? statusData.connections : []);
        setPending({
          sent: Array.isArray(statusData.pending?.sent) ? statusData.pending.sent : [],
          received: Array.isArray(statusData.pending?.received) ? statusData.pending.received : []
        });
      } else {
        console.error('Error fetching match status:', statusRes.reason);
        showSnackbar('Failed to load match status', 'error');
      }
    } catch (error) {
      console.error('Unexpected error in loadMatches:', error);
      showSnackbar('An unexpected error occurred while loading matches', 'error');
    } finally {
      setLoading(false);
      console.log('Finished loading matches');
    }
  };

  // Handle accepting a match
  const handleAccept = async (userId) => {
    try {
      console.log('Accepting match for user:', userId);
      const response = await matchAPI.respondToMatch(userId, 'accepted');
      console.log('Accept response:', response.data);
      showSnackbar(
        response.data?.message || 'Connection request accepted!',
        'success'
      );
      loadMatches();
    } catch (error) {
      console.error('Error accepting match:', error);
      showSnackbar(
        error.response?.data?.error || 'Failed to accept connection',
        'error'
      );
    }
  };

  // Handle rejecting a match
  const handleReject = async (userId) => {
    try {
      const response = await matchAPI.respondToMatch(userId, 'rejected');
      showSnackbar(
        response.data?.message || 'Match rejected', 
        'info'
      );
      loadMatches();
    } catch (error) {
      console.error('Error rejecting match:', error);
      showSnackbar(
        error.response?.data?.error || 'Failed to reject match', 
        'error'
      );
    }
  };

  // Handle sending a connection request
  const handleConnect = async (userId) => {
    try {
      const response = await matchAPI.likeUser(userId);
      showSnackbar(
        response.data?.message || 'Connection request sent!', 
        response.data?.isMutual ? 'success' : 'info'
      );
      loadMatches();
    } catch (error) {
      console.error('Error sending connection request:', error);
      showSnackbar(
        error.response?.data?.error || 'Failed to send connection request', 
        'error'
      );
    }
  };

  // Handle sending a message to a connection
  const handleMessage = (userId) => {
    window.location.href = `/chat/${userId}`;
  };

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Load matches on component mount
  useEffect(() => {
    loadMatches();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle opening user profile dialog
  const handleOpenProfile = (user) => {
    setSelectedUser(user);
    setProfileDialogOpen(true);
  };

  // Handle closing user profile dialog
  const handleCloseProfile = () => {
    setProfileDialogOpen(false);
  };

  // Render user card with appropriate actions based on type
  const renderUserCard = (user, type) => {
    console.log('Rendering user card:', user, 'type:', type);
    const isPendingReceived = type === 'pending' && pending.received.some(u => u._id === user._id);
    const isPendingSent = type === 'pending' && pending.sent.some(u => u._id === user._id);
    
    return (
      <Card 
        key={user._id} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          borderRadius: 4,
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 16px 48px 0 rgba(31, 38, 135, 0.5)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
          }
        }}
        onClick={() => handleOpenProfile(user)}
      >
        <Box sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              fontSize: '2rem',
              display: user.profileImage ? 'none' : 'flex',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h6" component="div">
            {user.name || 'Unknown User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {user.bio || 'No bio available'}
          </Typography>
          {user.matchScore && (
            <Typography variant="caption" color="primary">
              Match Score: {(user.matchScore * 100).toFixed(0)}%
            </Typography>
          )}
          
          {(user.subjectsToTeach?.length > 0 || user.commonSubjects?.theyTeach?.length > 0) && (
            <Box mb={2}>
              <Typography variant="subtitle2" color="primary">Can teach you:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {(user.commonSubjects?.theyTeach || user.subjectsToTeach || []).map((subject, index) => {
                  const subjectName = typeof subject === 'string' ? subject : subject.subject || subject;
                  return (
                    <Chip 
                      key={`teach-${index}`} 
                      label={subjectName} 
                      size="small" 
                      color="primary"
                      sx={{
                        borderRadius: 3,
                        backdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(25, 118, 210, 0.15)',
                        border: '1px solid rgba(25, 118, 210, 0.3)',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
          
          {(user.subjectsToLearn?.length > 0 || user.commonSubjects?.theyLearn?.length > 0) && (
            <Box mb={2}>
              <Typography variant="subtitle2" color="secondary">You can teach:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {(user.commonSubjects?.theyLearn || user.subjectsToLearn || []).map((subject, index) => {
                  const subjectName = typeof subject === 'string' ? subject : subject.subject || subject;
                  return (
                    <Chip 
                      key={`learn-${index}`} 
                      label={subjectName} 
                      size="small" 
                      color="secondary"
                      sx={{
                        borderRadius: 3,
                        backdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(156, 39, 176, 0.15)',
                        border: '1px solid rgba(156, 39, 176, 0.3)',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
        
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          {type === 'potential' && (
            <Button 
              size="small" 
              variant="contained" 
              color="primary"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                handleConnect(user._id);
              }}
              startIcon={<PersonIcon />}
            >
              Connect
            </Button>
          )}
          
          {type === 'connection' && (
            <Button 
              size="small" 
              variant="contained" 
              color="primary"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                handleMessage(user._id);
              }}
              startIcon={<MessageIcon />}
            >
              Chat Now
            </Button>
          )}
          
          {isPendingReceived && (
            <>
              <Tooltip title="Accept">
                <IconButton 
                  color="success" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleAccept(user._id);
                  }}
                >
                  <CheckIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton 
                  color="error" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleReject(user._id);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
          
          {isPendingSent && (
            <Chip 
              label="Request Sent" 
              color="info" 
              size="small" 
              sx={{ ml: 'auto' }}
              onClick={(e) => e.stopPropagation()} // Prevent card click
            />
          )}
        </CardActions>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Peer Connections
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                <span>Potential Matches</span>
                {potentialMatches.length > 0 && (
                  <Chip 
                    label={potentialMatches.length} 
                    size="small" 
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            } 
            {...a11yProps(0)} 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckIcon sx={{ mr: 1 }} />
                <span>Connections</span>
                {connections.length > 0 && (
                  <Chip 
                    label={connections.length} 
                    size="small" 
                    color="success"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            } 
            {...a11yProps(1)} 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                <span>Pending</span>
                {pending.received.length > 0 && (
                  <Chip 
                    label={pending.received.length} 
                    size="small" 
                    color="warning"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            } 
            {...a11yProps(2)} 
          />
        </Tabs>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Potential Matches Tab */}
          <TabPanel value={tabValue} index={0}>
            {potentialMatches.length > 0 ? (
              <Grid container spacing={3}>
                {potentialMatches.map((match) => {
                  console.log('Rendering match:', match);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={match._id}>
                      {renderUserCard(match, 'potential')}
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No more potential matches
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You've seen all available matches. Check back later for new peers or update your profile to find better matches.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Connections Tab */}
          <TabPanel value={tabValue} index={1}>
            {connections.length > 0 ? (
              <Grid container spacing={3}>
                {connections.map((connection) => (
                  <Grid item xs={12} sm={6} md={4} key={connection._id}>
                    {renderUserCard(connection, 'connection')}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <CheckIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No connections yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start connecting with potential peers to see them here.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Pending Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={pendingTab}
                onChange={(e, newValue) => setPendingTab(newValue)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckIcon sx={{ mr: 1 }} />
                      <span>Received</span>
                      {pending.received.length > 0 && (
                        <Chip 
                          label={pending.received.length} 
                          size="small" 
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                  value="received"
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1 }} />
                      <span>Sent</span>
                      {pending.sent.length > 0 && (
                        <Chip 
                          label={pending.sent.length} 
                          size="small" 
                          color="secondary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                  value="sent"
                />
              </Tabs>
            </Box>

            <Box>
              {pendingTab === 'received' ? (
                pending.received.length > 0 ? (
                  <Grid container spacing={3}>
                    {pending.received.map((user) => (
                      <Grid item xs={12} sm={6} md={4} key={user._id}>
                        {renderUserCard(user, 'pending')}
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box textAlign="center" py={4}>
                    <CheckIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No pending requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You don't have any pending connection requests at the moment.
                    </Typography>
                  </Box>
                )
              ) : (
                pending.sent.length > 0 ? (
                  <Grid container spacing={3}>
                    {pending.sent.map((user) => (
                      <Grid item xs={12} sm={6} md={4} key={user._id}>
                        {renderUserCard(user, 'pending')}
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box textAlign="center" py={4}>
                    <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No sent requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You haven't sent any connection requests yet.
                    </Typography>
                  </Box>
                )
              )}
            </Box>
          </TabPanel>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* User Profile Dialog */}
      <UserProfileDialog 
        open={profileDialogOpen} 
        onClose={handleCloseProfile} 
        user={selectedUser} 
      />
    </Container>
  );
}

export default Matches;