# Migration Scripts

This directory contains scripts for migrating data from local MongoDB to MongoDB Atlas.

## Scripts Overview

### Core Migration Scripts

#### `migrate-to-atlas.js`
- **Purpose**: Main migration script to transfer data from local MongoDB to MongoDB Atlas
- **Usage**: `node migrate-to-atlas.js`
- **Requirements**: 
  - Local MongoDB running
  - MongoDB Atlas connection string in environment
  - Network access to Atlas

#### `import-to-atlas.js`
- **Purpose**: Import backup JSON files to MongoDB Atlas
- **Usage**: `node import-to-atlas.js`
- **Requirements**: 
  - Backup JSON files in `../backup/` directory
  - MongoDB Atlas connection string

#### `backup-local-data.js`
- **Purpose**: Create backup of local MongoDB data to JSON files
- **Usage**: `node backup-local-data.js`
- **Output**: JSON files in `../backup/` directory

### Data Fix Scripts

#### `fix-seller-references.js`
- **Purpose**: Convert string seller IDs to ObjectId in products collection
- **Usage**: `node fix-seller-references.js`
- **When to use**: After initial migration if seller references are strings

#### `fix-seller-references-to-existing-users.js`
- **Purpose**: Update product seller references to point to existing users
- **Usage**: `node fix-seller-references-to-existing-users.js`
- **When to use**: When seller IDs don't match existing user IDs

#### `fix-user-ids-to-objectids.js`
- **Purpose**: Convert string user IDs to ObjectId in users collection
- **Usage**: `node fix-user-ids-to-objectids.js`
- **When to use**: When user _id fields are stored as strings

### Verification Scripts

#### `check-backup.js`
- **Purpose**: Verify the structure of local backup data
- **Usage**: `node check-backup.js`
- **Output**: Console log of data structure

#### `verify-atlas-data.js`
- **Purpose**: Verify data structure in MongoDB Atlas
- **Usage**: `node verify-atlas-data.js`
- **Output**: Console log of Atlas data structure

### Utility Scripts

#### `update-env.js`
- **Purpose**: Update MONGODB_URI in backend/.env to Atlas connection string
- **Usage**: `node update-env.js`
- **Note**: Updates the environment file automatically

#### `test-atlas-connection.js`
- **Purpose**: Test connectivity to MongoDB Atlas
- **Usage**: `node test-atlas-connection.js`
- **Output**: Connection status and basic operations test

#### `setup-atlas-user.js`
- **Purpose**: Test connection with admin credentials and guide user setup
- **Usage**: `node setup-atlas-user.js`
- **Note**: Used for diagnosis, no longer needed after setup

## Migration Process

1. **Backup Local Data**: Run `backup-local-data.js`
2. **Test Atlas Connection**: Run `test-atlas-connection.js`
3. **Migrate Data**: Run `migrate-to-atlas.js` or `import-to-atlas.js`
4. **Verify Data**: Run `verify-atlas-data.js`
5. **Fix Data Issues**: Run appropriate fix scripts if needed
6. **Update Environment**: Run `update-env.js`

## Environment Variables

Required environment variables:
- `MONGODB_URI`: Local MongoDB connection string
- `ATLAS_URI`: MongoDB Atlas connection string

## Important Notes

- Always backup data before running migration scripts
- Test in development environment first
- Some scripts may need to be run multiple times if data issues persist
- Check console output for detailed error messages
