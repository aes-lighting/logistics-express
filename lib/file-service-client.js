const axios = require('axios');

const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://file-service.railway.internal:3000';
const FILE_SERVICE_API_KEY = process.env.FILE_SERVICE_API_KEY || 'yvgDtDvqWY2L8A5gb8k4btePZRW20b9m3ur0vgpinZDoF1pcqgjwmhofS8Z0Yxfb';

// Upload packing slip to file service
// Returns: { projectName, projectNumber, poNumber, file, timestamp }
async function uploadFile(filePath, fileBuffer, poNumber) {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fileBuffer, filePath);
    formData.append('po_number', poNumber);

    const response = await axios.post(`${FILE_SERVICE_URL}/api/upload/packing-slip`, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-API-Key': FILE_SERVICE_API_KEY
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
  uploadFile,
  FILE_SERVICE_URL
};
