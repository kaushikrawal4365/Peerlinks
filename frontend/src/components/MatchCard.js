import React from 'react';
import { Card, CardContent, Typography, Button, Box, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)({
  maxWidth: 400,
  margin: 'auto',
  marginBottom: 20,
  borderRadius: 24,
  backdropFilter: 'blur(20px)',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  position: 'relative',
  overflow: 'visible',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 16px 48px 0 rgba(31, 38, 135, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});

const MatchCard = ({ user, onLike, onPass }) => {
  const { name, profileImage, subjectsToTeach = [], subjectsToLearn = [] } = user;

  return (
    <StyledCard>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Avatar 
          src={profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '')}&background=random`}
          sx={{ 
            width: 120, 
            height: 120, 
            margin: '0 auto -60px',
            border: '4px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 8px 32px rgba(31, 38, 135, 0.3)',
            backdropFilter: 'blur(10px)',
          }}
        />
        <CardContent sx={{ pt: 8 }}>
          <Typography variant="h6" component="div" gutterBottom>
            {name || 'Anonymous User'}
          </Typography>
          
          {subjectsToTeach.length > 0 && (
            <Box sx={{ mb: 2, textAlign: 'left' }}>
              <Typography variant="subtitle2" color="textSecondary">
                Can teach:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {subjectsToTeach.map((subject, index) => (
                  <Typography 
                    key={`teach-${index}`}
                    variant="caption"
                    sx={{
                      bgcolor: 'rgba(25, 118, 210, 0.15)',
                      color: 'primary.main',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 3,
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(25, 118, 210, 0.2)',
                      fontWeight: 500,
                    }}
                  >
                    {subject}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {subjectsToLearn.length > 0 && (
            <Box sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" color="textSecondary">
                Wants to learn:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {subjectsToLearn.map((subject, index) => (
                  <Typography 
                    key={`learn-${index}`}
                    variant="caption"
                    sx={{
                      bgcolor: 'rgba(156, 39, 176, 0.15)',
                      color: 'secondary.main',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 3,
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(156, 39, 176, 0.2)',
                      fontWeight: 500,
                    }}
                  >
                    {subject}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Button 
              variant="contained" 
              color="error" 
              onClick={onPass}
              sx={{ 
                borderRadius: 5, 
                textTransform: 'none', 
                px: 3,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 16px rgba(244, 67, 54, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(244, 67, 54, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Pass
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={onLike}
              sx={{ 
                borderRadius: 5, 
                textTransform: 'none', 
                px: 4,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Like
            </Button>
          </Box>
        </CardContent>
      </Box>
    </StyledCard>
  );
};

export default MatchCard;
