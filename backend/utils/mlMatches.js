// Helper function to calculate cosine similarity between two vectors
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += Math.pow(vecA[i], 2);
    normB += Math.pow(vecB[i], 2);
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const calculateBestMatches = async (currentUser, allUsers) => {
  try {
    console.log('\n=== Starting ML match calculation ===');
    
    if (!currentUser || !allUsers || !Array.isArray(allUsers)) {
      throw new Error('Invalid input parameters');
    }

    // Extract subject names from objects
    const extractSubjects = (subjectArray) => {
      if (!Array.isArray(subjectArray)) return [];
      return subjectArray
        .filter(s => s && (s.subject || typeof s === 'string'))
        .map(s => (typeof s === 'string' ? s : s.subject))
        .map(s => s.toString().trim().toLowerCase())
        .filter(Boolean);
    };

    const currentTeachSubjects = extractSubjects(currentUser.subjectsToTeach);
    const currentLearnSubjects = extractSubjects(currentUser.subjectsToLearn);

    console.log(`Current user (${currentUser.name || currentUser.email}):`);
    console.log('- Teaching:', currentTeachSubjects.join(', '));
    console.log('- Learning:', currentLearnSubjects.join(', '));

    // Get unique subject list across all users
    const subjectSet = new Set();
    
    // Add current user's subjects
    currentTeachSubjects.forEach(s => subjectSet.add(s));
    currentLearnSubjects.forEach(s => subjectSet.add(s));
    
    // Add other users' subjects
    allUsers.forEach(user => {
      extractSubjects(user.subjectsToTeach).forEach(s => subjectSet.add(s));
      extractSubjects(user.subjectsToLearn).forEach(s => subjectSet.add(s));
    });
    
    const subjectList = Array.from(subjectSet);
    console.log('\n📋 All unique subjects:', subjectList.join(', '));

    // Vectorize user's subjects (1 if subject exists, 0 otherwise)
    const vectorize = (subjects) => {
      return subjectList.map(subject => subjects.includes(subject) ? 1 : 0);
    };

    const currentLearnVector = vectorize(currentLearnSubjects);
    const currentTeachVector = vectorize(currentTeachSubjects);

    // Calculate matches for each user
    const matches = [];
    
    for (const user of allUsers) {
      if (user._id.toString() === currentUser._id.toString()) continue;
      
      try {
        const userTeachSubjects = extractSubjects(user.subjectsToTeach);
        const userLearnSubjects = extractSubjects(user.subjectsToLearn);
        
        const userTeachVector = vectorize(userTeachSubjects);
        const userLearnVector = vectorize(userLearnSubjects);

        // Calculate cosine similarity
        const teachMatch = cosineSimilarity(currentLearnVector, userTeachVector); // You learn, they teach
        const learnMatch = cosineSimilarity(currentTeachVector, userLearnVector); // You teach, they learn
        const score = (teachMatch + learnMatch) / 2;
        
        // Find actual common subjects
        const commonTeach = userTeachSubjects.filter(s => currentLearnSubjects.includes(s));
        const commonLearn = userLearnSubjects.filter(s => currentTeachSubjects.includes(s));
        
        // Only include matches with common subjects and decent score
        if ((commonTeach.length > 0 || commonLearn.length > 0) && score > 0.1) {
          const match = {
            _id: user._id,
            user: user._id,
            name: user.name,
            email: user.email,
            bio: user.bio,
            profileImage: user.profileImage,
            matchScore: Number(score.toFixed(3)),
            subjectsToTeach: commonTeach,
            subjectsToLearn: commonLearn,
            commonSubjects: {
              theyTeach: commonTeach,
              theyLearn: commonLearn
            }
          };
          
          matches.push(match);
        }
      } catch (err) {
        console.error(`Error processing user ${user._id || 'unknown'}:`, err);
      }
    }
    
    // Sort by score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    console.log(`\n🎯 Found ${matches.length} potential matches`);
    return matches;
  } catch (error) {
    console.error('❌ Error in calculateBestMatches:', error);
    throw error;
  }
};

module.exports = { calculateBestMatches, cosineSimilarity };