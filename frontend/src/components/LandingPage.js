import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha,
  Avatar,
  Paper,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  Star as StarIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  Handshake as HandshakeIcon,
  Timeline as TimelineIcon,
  EmojiPeople as EmojiPeopleIcon
} from '@mui/icons-material';

const features = [
  {
    title: 'Personalized Matching',
    description: 'Our AI finds your ideal study partners based on complementary skills and learning goals.',
    icon: <PsychologyIcon fontSize="large" sx={{ color: '#6200ea' }} />,
  },
  {
    title: 'Teach & Learn',
    description: 'Share your expertise in subjects you know while learning from others in areas you want to improve.',
    icon: <HandshakeIcon fontSize="large" sx={{ color: '#03dac6' }} />,
  },
  {
    title: 'Real-time Collaboration',
    description: 'Connect through instant messaging and video meetings to study together from anywhere.',
    icon: <ChatIcon fontSize="large" sx={{ color: '#6200ea' }} />,
  },
  {
    title: 'Growth Tracking',
    description: 'Monitor your progress and celebrate achievements as you master new subjects together.',
    icon: <TimelineIcon fontSize="large" sx={{ color: '#03dac6' }} />,
  },
];

const testimonials = [
  {
    name: "Kaushik Rawal",
    role: "Computer Science Student",
    text: "PeerLink helped me find a study partner who excels in algorithms while I helped them with web development. We both improved our grades significantly!",
    avatar: "A"
  },
  {
    name: "Saekki",
    role: "Biology Major",
    text: "I was struggling with organic chemistry until PeerLink matched me with someone who could explain it clearly. In return, I helped them with genetics.",
    avatar: "S"
  }
];

const LandingPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)`,
          color: 'white',
          pt: { xs: 10, md: 15 },
          pb: { xs: 10, md: 15 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    fontWeight: 800,
                    mb: 2,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1
                  }}
                >
                  Learn What You Need,
                  <br />
                  Teach What You Know
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    lineHeight: 1.6,
                    maxWidth: 600
                  }}
                >
                  PeerLink connects you with the perfect study partners through AI-powered matching. 
                  Exchange knowledge, grow together, and achieve your learning goals faster.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: 'white',
                      color: '#1a2a6c',
                      '&:hover': {
                        bgcolor: alpha('#fff', 0.9),
                      },
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      borderRadius: 2
                    }}
                    onClick={() => navigate('/signup')}
                  >
                    Get Started For Free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: alpha('#fff', 0.9),
                        bgcolor: alpha('#fff', 0.1),
                      },
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      borderRadius: 2
                    }}
                    onClick={() => navigate('/login')}
                  >
                    Sign In
                  </Button>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 450,
                    height: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <Paper
                    elevation={6}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      backdropFilter: 'blur(10px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}
                  >
                    <Avatar sx={{ bgcolor: '#03dac6' }}>
                      <EmojiPeopleIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        "I teach Python, learn Spanish"
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Find your perfect learning match
                      </Typography>
                    </Box>
                  </Paper>
                  
                  <Paper
                    elevation={6}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      backdropFilter: 'blur(10px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      ml: { xs: 0, md: 6 }
                    }}
                  >
                    <Avatar sx={{ bgcolor: '#6200ea' }}>
                      <LightbulbIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        "Everyone is both teacher and student"
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Share knowledge, grow together
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            width: '50%',
            height: '120%',
            bgcolor: alpha('#fff', 0.1),
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />
      </Box>

      {/* How It Works Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography
          variant="h2"
          align="center"
          sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 700,
            mb: 2,
          }}
        >
          How PeerLink Works
        </Typography>
        
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ mb: { xs: 6, md: 8 }, maxWidth: 700, mx: 'auto' }}
        >
          Our platform creates a reciprocal learning ecosystem where everyone both teaches and learns
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2
                }}
              >
                <Typography variant="h4" fontWeight="bold">1</Typography>
              </Avatar>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Create Your Profile
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Tell us what subjects you can teach and what you want to learn, along with your proficiency levels.
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2
                }}
              >
                <Typography variant="h4" fontWeight="bold">2</Typography>
              </Avatar>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Get Smart Matches
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Our AI algorithm finds peers who can teach what you want to learn and learn what you can teach.
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2
                }}
              >
                <Typography variant="h4" fontWeight="bold">3</Typography>
              </Avatar>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Connect & Collaborate
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Chat, schedule study sessions, and track your progress as you help each other grow.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              mb: { xs: 6, md: 8 },
            }}
          >
            Why Choose PeerLink?
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    bgcolor: 'white',
                    borderRadius: 4,
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography
          variant="h2"
          align="center"
          sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 700,
            mb: 2,
          }}
        >
          Success Stories
        </Typography>
        
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ mb: { xs: 6, md: 8 }, maxWidth: 700, mx: 'auto' }}
        >
          See how PeerLink has transformed learning experiences
        </Typography>
        
        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic' }}>
                  "{testimonial.text}"
                </Typography>
                <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    {testimonial.avatar}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {testimonial.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {testimonial.role}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%)`,
          color: 'white',
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 3,
              }}
            >
              Ready to Transform Your Learning?
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                opacity: 0.9,
                maxWidth: 700,
                mx: 'auto'
              }}
            >
              Join PeerLink today and discover the power of collaborative learning. 
              Share knowledge, make connections, and achieve your goals together.
            </Typography>
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: '#1a2a6c',
                '&:hover': {
                  bgcolor: alpha('#fff', 0.9),
                },
                px: 6,
                py: 1.5,
                fontWeight: 600,
                borderRadius: 2
              }}
              onClick={() => navigate('/signup')}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
        
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '-50%',
            left: '10%',
            width: '80%',
            height: '200%',
            bgcolor: alpha('#fff', 0.05),
            borderRadius: '50%',
          }}
        />
      </Box>
    </Box>
  );
};

export default LandingPage;