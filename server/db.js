// Shared database accessor - use after initDatabase() is called
module.exports = {
  get db() {
    if (!global.__db) throw new Error('Database not initialized yet');
    return global.__db;
  }
};
