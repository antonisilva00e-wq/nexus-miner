const { initDatabase, getDb, createWrapper } = require('./server/database/connection');
const { createSchema } = require('./server/database/schema');

async function migrate() {
  await initDatabase();
  const rawDb = getDb();
  const db = createWrapper(rawDb);
  
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN has_website INTEGER DEFAULT -1;`);
    console.log("Added has_website to leads");
  } catch (e) {
    console.log("has_website already exists or error:", e.message);
  }
  
  try {
    db.exec(`ALTER TABLE leads ADD COLUMN website_status TEXT;`);
    console.log("Added website_status to leads");
  } catch (e) {
    console.log("website_status already exists or error:", e.message);
  }

  // Create sites table
  createSchema(db);
  console.log("Schema updated.");
}

migrate().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
