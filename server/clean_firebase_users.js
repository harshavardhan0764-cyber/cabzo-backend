const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth(app);

async function cleanUsers() {
  console.log('Fetching users from Firebase Auth...');
  const listResult = await auth.listUsers(1000);
  console.log(`Found ${listResult.users.length} users in Firebase.`);
  
  for (const user of listResult.users) {
    console.log(`- Deleting user: ${user.uid} (${user.email || user.phoneNumber || 'no-email'})`);
    await auth.deleteUser(user.uid);
  }
  
  console.log('All previous Firebase users deleted successfully!');
}

cleanUsers().catch(err => {
  console.error('Error deleting users:', err);
  process.exit(1);
});
