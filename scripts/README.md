# Scripts Directory

This directory contains all utility scripts organized by category for The Bazaar application.

## Directory Structure

```
scripts/
├── migration/     # MongoDB Atlas migration scripts
├── testing/       # API and frontend testing scripts
├── debug/         # Database debugging and troubleshooting scripts
├── backup/        # Data backup scripts and files
├── cleanup/       # Database cleanup and maintenance scripts
└── manual-commit.sh  # Manual commit script (requires user approval)
```

## Git Workflow

### Manual Commits Only
- **manual-commit.sh**: Interactive commit script that requires user review and approval
- All commits must be reviewed and tested by the user before being pushed
- Auto-commit scripts have been deprecated and moved to `.deprecated` files

### Usage
```bash
# Review and commit changes with user approval
./scripts/manual-commit.sh
```

## Usage

Each subdirectory contains a README file with specific instructions for the scripts in that category.

## Quick Reference

### Migration Scripts
- **migrate-to-atlas.js**: Main migration script to move data from local MongoDB to Atlas
- **import-to-atlas.js**: Import backup data to MongoDB Atlas
- **backup-local-data.js**: Create backup of local MongoDB data

### Testing Scripts
- **test-search.html**: Test search functionality in browser
- **test-search-api.js**: Test search API endpoints
- **test-search-frontend.html**: Test frontend search integration

### Debug Scripts
- **debug-population.js**: Debug Mongoose population issues
- **test-population.js**: Test database population functionality
- **check-users.js**: Verify user data in database

### Cleanup Scripts
- **clear-db.js**: Clear database collections

## Important Notes

- Always backup your data before running migration or cleanup scripts
- Test scripts in a development environment first
- Some scripts require specific environment variables to be set
- Check individual script README files for detailed usage instructions
