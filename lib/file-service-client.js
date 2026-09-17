const axios = require('axios');

const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://71.172.107.128:3001';

// Get project name from file service
async function getProjectName(projectNumber) {
  try {
    if (!projectNumber) {
      return null;
    }

    const response = await axios.get(`${FILE_SERVICE_URL}/api/projects/${projectNumber}`, {
      timeout: 5000
    });

    if (response.data && response.data.projectName) {
      return response.data.projectName;
    }

    return null;
  } catch (error) {
    console.warn(`File service lookup failed for project ${projectNumber}:`, error.message);
    return null;
  }
}

// Upload file to file service
async function uploadFile(logisticsId, directoryPath, filePath, fileBuffer) {
  try {
    const formData = new FormData();
    formData.append('logisticsId', logisticsId);
    formData.append('directoryPath', directoryPath);
    formData.append('file', new Blob([fileBuffer]), filePath);

    const response = await axios.post(`${FILE_SERVICE_URL}/api/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.warn(`File service upload failed:`, error.message);
    return null;
  }
}

module.exports = {
  getProjectName,
  uploadFile,
  FILE_SERVICE_URL
};
