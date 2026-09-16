const XLSX = require('xlsx');
const fs = require('fs');

function generateReport(entries, outputPath) {
  try {
    // Prepare data for spreadsheet
    const reportData = entries.map(entry => ({
      'Entry ID': entry.id,
      'Job Number': entry.jobNumber,
      'Location': entry.location,
      'Assigned PM': entry.assignedPm,
      'Status': entry.status,
      'Created': new Date(entry.createdAt).toLocaleString(),
      'Pages Scanned': entry.pages ? entry.pages.length : 0,
      'Pallet Count': entry.palletCount || 0,
      'Notes': entry.notes || ''
    }));

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(reportData);

    // Set column widths
    const columnWidths = [
      { wch: 36 }, // Entry ID
      { wch: 12 }, // Job Number
      { wch: 15 }, // Location
      { wch: 15 }, // Assigned PM
      { wch: 12 }, // Status
      { wch: 20 }, // Created
      { wch: 14 }, // Pages Scanned
      { wch: 12 }, // Pallet Count
      { wch: 30 }  // Notes
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

    // Write file
    XLSX.writeFile(workbook, outputPath);

    console.log(`Report generated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

function generateSummaryReport(entries, outputPath) {
  try {
    // Calculate summary statistics
    const byLocation = {};
    const byStatus = {};
    const byPm = {};

    entries.forEach(entry => {
      // By location
      byLocation[entry.location] = (byLocation[entry.location] || 0) + 1;

      // By status
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;

      // By PM
      byPm[entry.assignedPm] = (byPm[entry.assignedPm] || 0) + 1;
    });

    const summary = [
      {
        'Metric': 'Total Entries',
        'Count': entries.length
      },
      {},
      {
        'Location': 'Count'
      },
      ...Object.entries(byLocation).map(([loc, count]) => ({
        'Location': loc,
        'Count': count
      })),
      {},
      {
        'Status': 'Count'
      },
      ...Object.entries(byStatus).map(([status, count]) => ({
        'Status': status,
        'Count': count
      })),
      {},
      {
        'PM': 'Count'
      },
      ...Object.entries(byPm).map(([pm, count]) => ({
        'PM': pm,
        'Count': count
      }))
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');

    XLSX.writeFile(workbook, outputPath);

    console.log(`Summary report generated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Summary report generation error:', error);
    throw error;
  }
}

module.exports = {
  generateReport,
  generateSummaryReport
};
