// Generate filenames with proper naming convention

// Format date as M/D/YYYY (no zero padding)
function formatDate(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

// Format date for filenames as M-D-YYYY (no zero padding, dashes instead of slashes)
function formatDateForFilename(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
}

// Generate packing slip filename
// Format: ProjectNum-POSuffix ProjectName - M-D-YYYY.jpg
// Example: 12345-01 LED Panels - 9-17-2026.jpg
function generatePackingSlipFilename(projectNumber, poSuffix, projectName, date = new Date()) {
  if (!projectNumber || !poSuffix || !projectName) {
    return null;
  }

  const formattedDate = formatDateForFilename(date);
  const filename = `${projectNumber}-${poSuffix} ${projectName} - ${formattedDate}.jpg`;

  return filename;
}

// Generate folder path for organized slips
// organized/ProjectNum/
function generateOrganizedFolderPath(projectNumber) {
  if (!projectNumber) {
    return null;
  }

  return `organized/${projectNumber}`;
}

module.exports = {
  formatDate,
  formatDateForFilename,
  generatePackingSlipFilename,
  generateOrganizedFolderPath
};