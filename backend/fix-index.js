const mongoose = require('mongoose');

async function fixIndex() {
  await mongoose.connect('mongodb://localhost:27017/unichat');
  console.log('Connected to MongoDB');
  
  try {
    // Drop the old incorrect unique index on name
    await mongoose.connection.collection('channels').dropIndex('name_1');
    console.log('Dropped incorrect index: name_1');
  } catch (err) {
    console.log('Index name_1 may not exist:', err.message);
  }
  
  try {
    // Create the correct compound index
    await mongoose.connection.collection('channels').createIndex(
      { workspace: 1, name: 1 }, 
      { unique: true }
    );
    console.log('Created correct compound index: workspace_1_name_1');
  } catch (err) {
    console.log('Compound index may already exist:', err.message);
  }
  
  console.log('Done!');
  await mongoose.disconnect();
}

fixIndex().catch(console.error);
