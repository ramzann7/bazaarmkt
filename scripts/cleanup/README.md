# Cleanup Scripts

This directory contains scripts for database cleanup and maintenance operations.

## Scripts Overview

### Database Cleanup

#### `clear-db.js`
- **Purpose**: Clear all collections in the database
- **Usage**: `node clear-db.js`
- **Warning**: This will delete ALL data in the database
- **Use Cases**:
  - Development environment reset
  - Testing environment cleanup
  - Before fresh data import

## Usage Instructions

### Clear Database
```bash
cd scripts/cleanup
node clear-db.js
```

### Confirmation
The script will prompt for confirmation before deleting data:
```
Are you sure you want to clear all collections? (yes/no)
```

## Safety Measures

### Before Running Cleanup Scripts
1. **Backup Data**: Always create a backup before cleanup
2. **Environment Check**: Ensure you're in the correct environment
3. **Confirmation**: Scripts require explicit confirmation
4. **Documentation**: Document what data will be lost

### Backup Before Cleanup
```bash
# Create backup before cleanup
cd ../migration
node backup-local-data.js
```

## Environment Variables

Required environment variables:
- `MONGODB_URI`: Database connection string

## Important Warnings

⚠️ **DANGER**: These scripts will permanently delete data
- Always backup before running
- Double-check environment variables
- Verify you're in the correct environment
- Test in development first

## Recovery

If data is accidentally deleted:
1. Check if you have recent backups
2. Restore from backup using migration scripts
3. Contact database administrator if needed

## Best Practices

1. **Development Only**: Use cleanup scripts only in development
2. **Scheduled Backups**: Maintain regular backup schedule
3. **Documentation**: Document all cleanup operations
4. **Testing**: Test cleanup scripts in isolated environment first
