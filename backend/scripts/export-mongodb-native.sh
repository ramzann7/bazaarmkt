#!/bin/bash

###############################################################################
# MongoDB Dump Script for Production Migration
# Uses native mongodump command for efficient backup
#
# Usage: ./export-mongodb-native.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
EXPORT_DIR="backend/exports/mongodump-$TIMESTAMP"
ENV_FILE=".env"

echo -e "${BLUE}🚀 MongoDB Native Export Script${NC}"
echo -e "${BLUE}================================${NC}\n"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}📁 Loading environment variables from $ENV_FILE${NC}"
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Error: $ENV_FILE not found${NC}"
    exit 1
fi

# Check if mongodump is installed
if ! command -v mongodump &> /dev/null; then
    echo -e "${RED}❌ Error: mongodump not found${NC}"
    echo -e "${YELLOW}Install MongoDB Database Tools:${NC}"
    echo "   macOS: brew install mongodb/brew/mongodb-database-tools"
    echo "   Ubuntu: sudo apt-get install mongodb-database-tools"
    echo "   Windows: Download from https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Parse MongoDB URI
if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}❌ Error: MONGODB_URI not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ MongoDB URI found${NC}"
echo -e "${BLUE}📊 Export directory: $EXPORT_DIR${NC}\n"

# Create export directory
mkdir -p "$EXPORT_DIR"

# Export database using mongodump
echo -e "${BLUE}📦 Starting MongoDB dump...${NC}"

if mongodump --uri="$MONGODB_URI" --out="$EXPORT_DIR" --gzip; then
    echo -e "\n${GREEN}✅ MongoDB dump completed successfully!${NC}"
else
    echo -e "\n${RED}❌ MongoDB dump failed${NC}"
    exit 1
fi

# Get database name from URI
DB_NAME=$(echo "$MONGODB_URI" | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
    DB_NAME="bazaar"
fi

echo -e "\n${BLUE}📊 Export Summary:${NC}"
echo -e "   Database: $DB_NAME"
echo -e "   Location: $EXPORT_DIR"
echo -e "   Format: BSON (compressed with gzip)"

# Count collections
COLLECTION_COUNT=$(find "$EXPORT_DIR/$DB_NAME" -name "*.bson.gz" 2>/dev/null | wc -l || echo "0")
echo -e "   Collections: $COLLECTION_COUNT"

# Create metadata file
cat > "$EXPORT_DIR/export-metadata.txt" << EOF
MongoDB Export Metadata
=======================
Export Date: $(date)
Export Type: mongodump (native)
Source Database: $DB_NAME
Compression: gzip
Collections Exported: $COLLECTION_COUNT

Export Command:
mongodump --uri="***" --out="$EXPORT_DIR" --gzip

Import Command (for production):
mongorestore --uri="PRODUCTION_MONGODB_URI" --gzip "$EXPORT_DIR/$DB_NAME"

Notes:
- All collections exported in BSON format
- Files are gzip compressed for efficiency
- Indexes are preserved
- Use mongorestore to import
EOF

# Create import script
cat > "$EXPORT_DIR/import-to-production.sh" << 'EOF'
#!/bin/bash

###############################################################################
# MongoDB Restore Script for Production
# Imports the exported database to production
#
# Usage: 
#   export PROD_MONGODB_URI="your-production-uri"
#   ./import-to-production.sh
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 MongoDB Production Import Script${NC}"
echo -e "${BLUE}====================================${NC}\n"

# Check for production URI
if [ -z "$PROD_MONGODB_URI" ]; then
    echo -e "${RED}❌ Error: PROD_MONGODB_URI environment variable not set${NC}"
    echo -e "${YELLOW}Set it with:${NC}"
    echo "   export PROD_MONGODB_URI=\"mongodb+srv://user:pass@cluster.mongodb.net/bazaar\""
    exit 1
fi

# Check if mongorestore is installed
if ! command -v mongorestore &> /dev/null; then
    echo -e "${RED}❌ Error: mongorestore not found${NC}"
    echo -e "${YELLOW}Install MongoDB Database Tools first${NC}"
    exit 1
fi

# Safety confirmation
echo -e "${YELLOW}⚠️  WARNING: This will import data to PRODUCTION${NC}"
echo -e "${YELLOW}Production URI: ${PROD_MONGODB_URI//:*@/:***@}${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Import cancelled${NC}"
    exit 0
fi

# Find the database directory
DB_DIR=$(find . -maxdepth 1 -type d ! -name "." ! -name ".." -print -quit)

if [ -z "$DB_DIR" ]; then
    echo -e "${RED}❌ Error: No database directory found${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Starting MongoDB restore...${NC}"
echo -e "   Source: $DB_DIR"
echo ""

# Run mongorestore
if mongorestore --uri="$PROD_MONGODB_URI" --gzip "$DB_DIR"; then
    echo -e "\n${GREEN}✅ MongoDB restore completed successfully!${NC}"
    echo -e "\n${YELLOW}⚠️  POST-IMPORT CHECKLIST:${NC}"
    echo "   1. ✓ Verify all collections imported"
    echo "   2. ✓ Test application functionality"
    echo "   3. ✓ Update environment variables"
    echo "   4. ✓ Configure production Stripe keys"
    echo "   5. ✓ Set up MongoDB indexes (if needed)"
    echo "   6. ✓ Enable monitoring and alerts"
else
    echo -e "\n${RED}❌ MongoDB restore failed${NC}"
    exit 1
fi
EOF

chmod +x "$EXPORT_DIR/import-to-production.sh"

# Create README
cat > "$EXPORT_DIR/README.md" << EOF
# MongoDB Native Export - $TIMESTAMP

## Export Information

- **Export Date**: $(date)
- **Database**: $DB_NAME
- **Export Tool**: mongodump (MongoDB native)
- **Compression**: gzip
- **Collections**: $COLLECTION_COUNT

## Files

\`\`\`
$EXPORT_DIR/
├── $DB_NAME/                    # Database directory
│   ├── *.bson.gz               # Collection data (BSON + gzip)
│   └── *.metadata.json.gz      # Collection metadata
├── import-to-production.sh     # Import script
├── export-metadata.txt         # Export details
└── README.md                   # This file
\`\`\`

## Import to Production

### Method 1: Using the import script (Recommended)

\`\`\`bash
# Set production MongoDB URI
export PROD_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/bazaar"

# Run import script
cd $EXPORT_DIR
./import-to-production.sh
\`\`\`

### Method 2: Manual mongorestore

\`\`\`bash
mongorestore \\
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/bazaar" \\
  --gzip \\
  $EXPORT_DIR/$DB_NAME
\`\`\`

### Method 3: Selective collection import

\`\`\`bash
# Import specific collections only
mongorestore \\
  --uri="your-production-uri" \\
  --gzip \\
  --nsInclude="$DB_NAME.users" \\
  --nsInclude="$DB_NAME.products" \\
  $EXPORT_DIR/$DB_NAME
\`\`\`

## Advanced Options

### Drop existing collections before import
\`\`\`bash
mongorestore --uri="..." --drop --gzip $EXPORT_DIR/$DB_NAME
\`\`\`

### Import to different database name
\`\`\`bash
mongorestore --uri="..." --nsFrom="$DB_NAME.*" --nsTo="production.*" --gzip $EXPORT_DIR/$DB_NAME
\`\`\`

### Exclude specific collections
\`\`\`bash
mongorestore \\
  --uri="..." \\
  --gzip \\
  --nsExclude="$DB_NAME.sessions" \\
  --nsExclude="$DB_NAME.logs" \\
  $EXPORT_DIR/$DB_NAME
\`\`\`

## Verification Steps

After import, verify the data:

\`\`\`bash
# Connect to production MongoDB
mongosh "your-production-uri"

# Check collection counts
use $DB_NAME
db.getCollectionNames().forEach(c => {
  print(c + ": " + db[c].countDocuments())
})

# Verify specific data
db.users.countDocuments()
db.products.countDocuments()
db.orders.countDocuments()
\`\`\`

## Troubleshooting

### Authentication Error
- Verify production MongoDB URI is correct
- Check user has write permissions
- Verify IP whitelist includes server IP

### Duplicate Key Error
- Collections already exist with data
- Use \`--drop\` flag to replace existing data
- Or import to a new database first

### Out of Memory
- Import collections one at a time
- Use \`--numInsertionWorkersPerCollection=1\` for slower but more stable import

## Rollback

If you need to rollback:

1. Keep the old data backup before import
2. Use \`--drop\` flag to replace with old data
3. Or drop all collections and re-import

## Support

For issues:
1. Check MongoDB Atlas logs
2. Verify network connectivity
3. Check application logs after import

---
Generated by BazaarMKT MongoDB Export Tool
EOF

# Create comprehensive checklist
cat > "$EXPORT_DIR/PRODUCTION_CHECKLIST.md" << EOF
# Production Migration Checklist

## Pre-Migration

- [ ] **Backup existing production data** (if any)
- [ ] **Test import on staging environment first**
- [ ] **Notify users of maintenance window**
- [ ] **Document current production state**

## Migration Steps

- [ ] **Transfer export files to production server**
  \`\`\`bash
  scp -r $EXPORT_DIR user@prod-server:/path/
  \`\`\`

- [ ] **Set production MongoDB URI**
  \`\`\`bash
  export PROD_MONGODB_URI="your-production-uri"
  \`\`\`

- [ ] **Run import script**
  \`\`\`bash
  ./import-to-production.sh
  \`\`\`

- [ ] **Verify collection counts match**

## Post-Migration

### 1. Database Configuration

- [ ] **Create/verify indexes**
  \`\`\`bash
  node backend/scripts/create-indexes.js
  \`\`\`

- [ ] **Set up MongoDB monitoring**
  - Enable Atlas monitoring
  - Set up alerts for slow queries
  - Configure backup schedules

### 2. Application Configuration

- [ ] **Update environment variables**
  - DATABASE_URL
  - JWT_SECRET (use new production secret!)
  - STRIPE_SECRET_KEY (production keys)
  - STRIPE_PUBLISHABLE_KEY
  - API_URL
  - FRONTEND_URL

- [ ] **Configure Stripe webhooks**
  - Payment intent succeeded
  - Payment intent failed
  - Account updated
  - Use production webhook URL

### 3. Security

- [ ] **Reset all user passwords** (force password reset on first login)
- [ ] **Generate new JWT secrets**
- [ ] **Update API keys and secrets**
- [ ] **Configure CORS for production domain**
- [ ] **Enable rate limiting**
- [ ] **Set up SSL/TLS certificates**

### 4. Testing

- [ ] **Test user authentication**
- [ ] **Test product browsing**
- [ ] **Test order placement (test mode first!)**
- [ ] **Test payment processing**
- [ ] **Test artisan payout flows**
- [ ] **Test admin dashboard**
- [ ] **Test email notifications**
- [ ] **Test mobile responsiveness**

### 5. Monitoring & Logging

- [ ] **Set up application logging**
  - Configure log retention
  - Set up error tracking (Sentry, etc.)
  - Monitor API response times

- [ ] **Set up uptime monitoring**
  - Configure health checks
  - Set up status page
  - Configure alerting

### 6. Performance

- [ ] **Enable database connection pooling**
- [ ] **Configure Redis for caching** (if applicable)
- [ ] **Enable CDN for static assets**
- [ ] **Optimize image delivery**

## Rollback Plan

If issues arise:

1. **Keep backup accessible** for 30 days minimum
2. **Document rollback steps**:
   - Stop application
   - Drop production collections
   - Restore from backup
   - Restart application
   - Notify users

## Final Verification

- [ ] **All critical functions working**
- [ ] **No console errors**
- [ ] **Database queries performing well**
- [ ] **Monitoring dashboards active**
- [ ] **Backup schedules configured**
- [ ] **Team notified of completion**

---
Completion Date: __________
Completed By: __________
Notes: __________
EOF

echo -e "\n${GREEN}✅ Export package created successfully!${NC}"
echo -e "\n${BLUE}📦 Export Contents:${NC}"
echo -e "   • Database dump: $EXPORT_DIR/$DB_NAME/"
echo -e "   • Import script: $EXPORT_DIR/import-to-production.sh"
echo -e "   • README: $EXPORT_DIR/README.md"
echo -e "   • Metadata: $EXPORT_DIR/export-metadata.txt"
echo -e "   • Checklist: $EXPORT_DIR/PRODUCTION_CHECKLIST.md"

echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo -e "   1. Review the exported data in: $EXPORT_DIR"
echo -e "   2. Transfer to production: scp -r $EXPORT_DIR user@prod:/path/"
echo -e "   3. Follow the checklist: $EXPORT_DIR/PRODUCTION_CHECKLIST.md"
echo -e "   4. Run import: cd $EXPORT_DIR && ./import-to-production.sh"

echo -e "\n${GREEN}✨ Done!${NC}\n"

