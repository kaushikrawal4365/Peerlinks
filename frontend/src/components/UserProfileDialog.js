import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  Grid,
  Rating
} from '@mui/material';
import {
  Close as CloseIcon,
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Email as EmailIcon,
  Star as StarIcon
} from '@mui/icons-material';

const UserProfileDialog = ({ open, onClose, user }) => {
  if (!user) return null;

  const formatSubject = (subject) => {
    if (typeof subject === 'string') return subject;
    
    const name = subject.subject || 'Unknown Subject';
    const level = subject.proficiency || subject.desiredLevel || subject.priority || 0;
    
    return { name, level };
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }
      }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(5px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.9), rgba(25, 118, 210, 0.7))',
        backdropFilter: 'blur(20px)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <Typography variant="h6">User Profile</Typography>
        <IconButton 
          onClick={onClose}
          sx={{ color: 'white' }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ 
          p: 3, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <Avatar
            src={user.profileImage}
            sx={{ 
              width: 100, 
              height: 100,
              fontSize: '3rem',
              bgcolor: 'primary.main',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(31, 38, 135, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {user.name || 'Unknown User'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {user.email || 'No email available'}
              </Typography>
            </Box>
            
            {user.matchScore && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StarIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="primary.main" fontWeight="bold">
                  Match Score: {(user.matchScore * 100).toFixed(0)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        <Divider />
        
        <Box sx={{ 
          p: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" gutterBottom>About</Typography>
          <Typography variant="body1">
            {user.bio || 'No bio available'}
          </Typography>
        </Box>
        
        <Divider />
        
        <Box sx={{ 
          p: 3,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SchoolIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Can Teach</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(user.subjectsToTeach?.length > 0 || user.commonSubjects?.theyTeach?.length > 0) ? (
                    (user.commonSubjects?.theyTeach || user.subjectsToTeach || []).map((subject, index) => {
                      const formattedSubject = formatSubject(subject);
                      return (
                        <Box key={`teach-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{formattedSubject.name}</Typography>
                          <Rating 
                            value={formattedSubject.level} 
                            readOnly 
                            size="small"
                            max={5}
                          />
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">No teaching subjects listed</Typography>
                  )}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MenuBookIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Wants to Learn</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(user.subjectsToLearn?.length > 0 || user.commonSubjects?.theyLearn?.length > 0) ? (
                    (user.commonSubjects?.theyLearn || user.subjectsToLearn || []).map((subject, index) => {
                      const formattedSubject = formatSubject(subject);
                      return (
                        <Box key={`learn-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">{formattedSubject.name}</Typography>
                          <Rating 
                            value={formattedSubject.level} 
                            readOnly 
                            size="small"
                            max={5}
                          />
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">No learning subjects listed</Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {(user.commonSubjects?.theyTeach?.length > 0 || user.commonSubjects?.theyLearn?.length > 0) && (
          <>
            <Divider />
            <Box sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="h6" gutterBottom>Why You Match</Typography>
              
              {user.commonSubjects?.theyTeach?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    They can teach you:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {user.commonSubjects.theyTeach.map((subject, index) => (
                      <Chip 
                        key={`common-teach-${index}`}
                        label={typeof subject === 'string' ? subject : subject.subject}
                        size="small"
                        color="primary"
                        sx={{
                          borderRadius: 3,
                          backdropFilter: 'blur(10px)',
                          backgroundColor: 'rgba(25, 118, 210, 0.15)',
                          border: '1px solid rgba(25, 118, 210, 0.3)',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {user.commonSubjects?.theyLearn?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                    You can teach them:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {user.commonSubjects.theyLearn.map((subject, index) => (
                      <Chip 
                        key={`common-learn-${index}`}
                        label={typeof subject === 'string' ? subject : subject.subject}
                        size="small"
                        color="secondary"
                        sx={{
                          borderRadius: 3,
                          backdropFilter: 'blur(10px)',
                          backgroundColor: 'rgba(156, 39, 176, 0.15)',
                          border: '1px solid rgba(156, 39, 176, 0.3)',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;