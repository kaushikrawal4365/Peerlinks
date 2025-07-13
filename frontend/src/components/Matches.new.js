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
  CardMedia,
  IconButton,
  Tooltip
} from '@mui/material';
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
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load all match data
  const loadMatches = async () => {
    try {
      setLoading(true);
      
      // Load potential matches and match status in parallel
      const [potentialRes, statusRes] = await Promise.all([
        matchAPI.getPotentialMatches(),
        matchAPI.getMatchStatus()
      ]);
      
      setPotentialMatches(potentialRes.data || []);
      setConnections(statusRes.data?.connections || []);
      setPending({
        sent: statusRes.data?.pending?.sent || [],
        received: statusRes.data?.pending?.received || []
      });
      
    } catch (error) {
      console.error('Error loading matches:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load matches',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle accepting a match
  const handleAccept = async (userId) => {
    try {
      const response = await matchAPI.respondToMatch(userId, 'accepted');
      setSnackbar({
        open: true,
        message: response.message || 'Connection request accepted!',
        severity: 'success'
      });
      loadMatches(); // Refresh the data
    } catch (error) {
      console.error('Error accepting match:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to accept connection',
        severity: 'error'
      });
    }
  };

  // Handle rejecting a match
  const handleReject = async (userId) => {
    try {
      await matchAPI.respondToMatch(userId, 'rejected');
      setSnackbar({
        open: true,
        message: 'Match rejected',
        severity: 'info'
      });
      loadMatches(); // Refresh the data
    } catch (error) {
      console.error('Error rejecting match:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reject match',
        severity: 'error'
      });
    }
  };

  // Handle sending a connection request
  const handleConnect = async (userId) => {
    try {
      await matchAPI.respondToMatch(userId, 'pending');
      setSnackbar({
        open: true,
        message: 'Connection request sent!',
        severity: 'success'
      });
      loadMatches(); // Refresh the data
    } catch (error) {
      console.error('Error sending connection request:', error);
      setSnackbar({
        open: true,
        message: 'Failed to send connection request',
        severity: 'error'
      });
    }
  };

  // Handle sending a message to a connection
  const handleMessage = (userId) => {
    // TODO: Implement messaging functionality
    setSnackbar({
      open: true,
      message: 'Messaging feature coming soon!',
      severity: 'info'
    });
  };

  // Load matches on component mount
  useEffect(() => {
    loadMatches();
  }, []);

  // Render user card with appropriate actions based on type
  const renderUserCard = (user, type) => {
    const isPendingReceived = type === 'pending' && pending.received.some(u => u._id === user._id);
    const isPendingSent = type === 'pending' && pending.sent.some(u => u._id === user._id);
    
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardMedia
          component="img"
          height="140"
          image={user.profileImage || '/default-avatar.png'}
          alt={user.name}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h6" component="div">
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {user.bio || 'No bio available'}
          </Typography>
          
          {user.subjectsToTeach?.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" color="primary">Teaches:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {user.subjectsToTeach.map((subject, index) => (
                  <Chip key={`teach-${index}`} label={subject} size="small" />
                ))}
              </Box>
            </Box>
          )}
          
          {user.subjectsToLearn?.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" color="secondary">Learning:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {user.subjectsToLearn.map((subject, index) => (
                  <Chip key={`learn-${index}`} label={subject} size="small" color="secondary" />
                ))}
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
              onClick={() => handleConnect(user._id)}
              startIcon={<PersonIcon />}
            >
              Connect
            </Button>
          )}
          
          {type === 'connection' && (
            <Button 
              size="small" 
              variant="outlined" 
              color="primary"
              onClick={() => handleMessage(user._id)}
              startIcon={<MessageIcon />}
            >
              Message
            </Button>
          )}
          
          {isPendingReceived && (
            <>
              <Tooltip title="Accept">
                <IconButton 
                  color="success" 
                  onClick={() => handleAccept(user._id)}
                >
                  <CheckIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton 
                  color="error" 
                  onClick={() => handleReject(user._id)}
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
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTabs-flexContainer': {
              justifyContent: 'space-around',
            },
          }}
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
                {potentialMatches.map((user) => (
                  <Grid item xs={12} sm={6} md={4} key={user._id}>
                    {renderUserCard(user, 'potential')}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No potential matches found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Check back later or update your profile to find better matches.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Connections Tab */}
          <TabPanel value={tabValue} index={1}>
            {connections.length > 0 ? (
              <Grid container spacing={3}>
                {connections.map((user) => (
                  <Grid item xs={12} sm={6} md={4} key={user._id}>
                    {renderUserCard(user, 'connection')}
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
                  Connect with potential peers to see them here.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {/* Pending Tab */}
          <TabPanel value={tabValue} index={2}>
            {pending.received.length > 0 || pending.sent.length > 0 ? (
              <>
                {pending.received.length > 0 && (
                  <Box mb={4}>
                    <Typography variant="h6" gutterBottom>
                      Received Requests ({pending.received.length})
                    </Typography>
                    <Grid container spacing={3}>
                      {pending.received.map((user) => (
                        <Grid item xs={12} sm={6} md={4} key={user._id}>
                          {renderUserCard(user, 'pending')}
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                
                {pending.sent.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Sent Requests ({pending.sent.length})
                    </Typography>
                    <Grid container spacing={3}>
                      {pending.sent.map((user) => (
                        <Grid item xs={12} sm={6} md={4} key={user._id}>
                          {renderUserCard(user, 'pending')}
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No pending requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your connection requests will appear here.
                </Typography>
              </Box>
            )}
          </TabPanel>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Matches;
