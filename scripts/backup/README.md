# Backup Directory

This directory contains backup data and scripts for data backup operations.

## Contents

### Backup Data Files
- **users.json**: Backup of users collection
- **products.json**: Backup of products collection  
- **producers.json**: Backup of producers collection
- **orders.json**: Backup of orders collection (if exists)

### Backup Scripts
- **backup-local-data.js**: Located in `../migration/` directory
- **import-to-atlas.js**: Located in `../migration/` directory

## Backup Process

### Creating Backups
```bash
cd ../migration
node backup-local-data.js
```

### Restoring Backups
```bash
cd ../migration
node import-to-atlas.js
```

## File Formats

### JSON Structure
All backup files contain:
- Array of documents
- Preserved ObjectId references
- Complete document structure
- Timestamps and metadata

### Example Structure
```json
[
  {
    "_id": "68a72cf14b78eb31b9af9e45",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "role": "producer",
    "createdAt": "2025-08-21T14:54:14.519Z",
    "updatedAt": "2025-08-21T14:54:14.601Z"
  }
]
```

## Backup Management

### Automatic Backups
- Backups are created before major operations
- Timestamped backup files
- Version control for backup files

### Manual Backups
- Create backups before data changes
- Store backups in version control
- Document backup contents

## Data Integrity

### Verification
- Verify backup file integrity
- Check file sizes and timestamps
- Validate JSON structure

### Testing
- Test restore process in development
- Verify data consistency after restore
- Check relationships between collections

## Security

### Backup Security
- Store backups securely
- Limit access to backup files
- Encrypt sensitive backup data

### Access Control
- Restrict backup directory access
- Use secure file permissions
- Monitor backup access

## Recovery Procedures

### Full Restore
1. Stop application servers
2. Clear target database
3. Run import script
4. Verify data integrity
5. Restart application

### Partial Restore
1. Identify specific collections
2. Backup current data
3. Import specific backup files
4. Verify relationships

## Best Practices

1. **Regular Backups**: Schedule automatic backups
2. **Multiple Locations**: Store backups in multiple locations
3. **Version Control**: Track backup versions
4. **Testing**: Regularly test restore procedures
5. **Documentation**: Document backup and restore procedures
