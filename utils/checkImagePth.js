const fs = require('fs').promises;
const path = require('path');

const checkImagePathAsync = async (relativePath) => {
  try {
    const normalizedPath = path.normalize(relativePath);
    
    // Prevent directory traversal
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid path traversal attempt');
    }

    const fullPath = path.join(__dirname, '..', 'public', normalizedPath);
    console.log('Server checking for file at:', fullPath);

    await fs.access(fullPath);  // Will throw error if file doesn't exist
    return true;
  } catch (error) {
    console.error('Error checking image path:', error.message);
    return false;
  }
};

module.exports = checkImagePathAsync;
