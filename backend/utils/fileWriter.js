const fs = require('fs');
const path = require('path');

// Check if we should rewrite mock data files
const shouldRewriteMock = () => {
  return process.env.MOCK_DATA === 'true' && 
         (process.env.REWRITE_MOCK === undefined || process.env.REWRITE_MOCK === 'true');
};

// Write specific data array to mockData.js file
const writeToMockDataFile = (dataType, dataArray) => {
  if (!shouldRewriteMock()) {
    return; // Don't write if conditions not met
  }

  try {
    const mockDataPath = path.join(__dirname, '../data/mockData.js');
    
    // Read current file content
    let fileContent = fs.readFileSync(mockDataPath, 'utf8');
    
    // Convert data array to formatted string
    const formattedData = JSON.stringify(dataArray, null, 2);
    
    // Create regex pattern to match the specific data export
    const exportPattern = new RegExp(
      `(const ${dataType} = )\\[[\\s\\S]*?\\];`,
      'g'
    );
    
    // Replace the specific data array
    const newContent = fileContent.replace(
      exportPattern,
      `$1${formattedData};`
    );
    
    // Write back to file
    fs.writeFileSync(mockDataPath, newContent, 'utf8');
    
    console.log(`✅ Mock data file updated: ${dataType}`);
  } catch (error) {
    console.error(`❌ Failed to write mock data file: ${error.message}`);
    throw new Error(`Failed to persist ${dataType} data: ${error.message}`);
  }
};

// Write multiple data types at once
const writeMultipleToMockDataFile = (dataUpdates) => {
  if (!shouldRewriteMock()) {
    return;
  }

  try {
    const mockDataPath = path.join(__dirname, '../data/mockData.js');
    let fileContent = fs.readFileSync(mockDataPath, 'utf8');
    
    // Apply all updates
    for (const [dataType, dataArray] of Object.entries(dataUpdates)) {
      const formattedData = JSON.stringify(dataArray, null, 2);
      const exportPattern = new RegExp(
        `(const ${dataType} = )\\[[\\s\\S]*?\\];`,
        'g'
      );
      fileContent = fileContent.replace(exportPattern, `$1${formattedData};`);
    }
    
    fs.writeFileSync(mockDataPath, fileContent, 'utf8');
    console.log(`✅ Mock data file updated: ${Object.keys(dataUpdates).join(', ')}`);
  } catch (error) {
    console.error(`❌ Failed to write mock data file: ${error.message}`);
    throw new Error(`Failed to persist data: ${error.message}`);
  }
};

module.exports = {
  shouldRewriteMock,
  writeToMockDataFile,
  writeMultipleToMockDataFile
};