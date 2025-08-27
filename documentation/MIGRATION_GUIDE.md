# MongoDB Atlas Migration Guide

## 🎯 Overview
This guide will help you migrate your local MongoDB data to MongoDB Atlas while maintaining the same data structure.

## 📊 Current Data Summary
- **Users**: 3 documents
- **Products**: 5 documents  
- **Producers**: 1 document
- **Orders**: 0 documents

## 🔧 Step 1: MongoDB Atlas Setup

### 1.1 Access MongoDB Atlas
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign in with your MongoDB account
3. Navigate to your cluster: `Cluster0`

### 1.2 Configure Network Access
1. In the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Choose one of these options:
   - **"Allow Access from Anywhere"** (for development) - Click **"0.0.0.0/0"**
   - **"Add Current IP Address"** (more secure)
4. Click **"Confirm"**

### 1.3 Verify Database User
1. In the left sidebar, click **"Database Access"**
2. Ensure you have a database user with the credentials:
   - **Username**: `Cluster25123`
   - **Password**: `zNlr0wjo045T5BbV`
3. If not, create a new user with **"Read and write to any database"** permissions

### 1.4 Get Connection String
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Add the database name: `/bazarmkt?retryWrites=true&w=majority`

## 🔄 Step 2: Automated Migration (Recommended)

### Option A: Using the Migration Script
```bash
# Run the migration script
node migrate-to-atlas.js
```

### Option B: Using MongoDB Compass
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to your local MongoDB: `mongodb://localhost:27017/bazarmkt`
3. Export each collection to JSON
4. Connect to Atlas using your connection string
5. Import the JSON files

### Option C: Using Command Line Tools
```bash
# Export from local MongoDB
mongodump --db bazarmkt --out ./dump

# Import to Atlas (after setting up connection)
mongorestore --uri="mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/bazarmkt" ./dump/bazarmkt
```

## 📁 Step 3: Manual Import (If Automated Fails)

### 3.1 Using Backup Files
The backup files are located in the `backup/` directory:
- `users.json` - 3 user documents
- `products.json` - 5 product documents  
- `producers.json` - 1 producer document

### 3.2 Import via MongoDB Atlas UI
1. Go to your Atlas cluster
2. Click **"Browse Collections"**
3. Create the `bazarmkt` database
4. For each collection:
   - Click **"Create Collection"**
   - Name it: `users`, `products`, `producers`
   - Click **"Add Data"** → **"Insert Document"**
   - Copy-paste the JSON content from the backup files

### 3.3 Import via MongoDB Compass
1. Connect to Atlas
2. Navigate to the `bazarmkt` database
3. For each collection:
   - Click **"Add Data"** → **"Import File"**
   - Select the corresponding JSON file
   - Choose **"JSON"** format
   - Click **"Import"**

## ⚙️ Step 4: Update Application Configuration

### 4.1 Update Environment Variables
Edit `backend/.env`:
```env
# Replace the local MongoDB URI with Atlas URI
MONGODB_URI=mongodb+srv://Cluster25123:zNlr0wjo045T5BbV@cluster0.cp9qdcy.mongodb.net/bazarmkt?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4000
NODE_ENV=development
```

### 4.2 Test the Connection
```bash
# Restart your backend server
cd backend && npm start
```

## ✅ Step 5: Verification

### 5.1 Check Data in Atlas
1. Go to your Atlas cluster
2. Click **"Browse Collections"**
3. Navigate to `bazarmkt` database
4. Verify all collections exist with the correct data:
   - `users` collection: 3 documents
   - `products` collection: 5 documents
   - `producers` collection: 1 document

### 5.2 Test Application
1. Start your frontend: `cd frontend && npm run dev`
2. Test the search functionality
3. Verify that business names are displayed correctly
4. Test user authentication and profile features

## 🔒 Step 6: Security Considerations

### 6.1 Environment Variables
- Never commit `.env` files to version control
- Use different credentials for development and production
- Rotate passwords regularly

### 6.2 Network Security
- Consider restricting IP access to your application servers
- Use VPC peering for production environments
- Enable MongoDB Atlas security features

## 🚨 Troubleshooting

### Connection Issues
- **"Authentication failed"**: Check username/password and IP whitelist
- **"Connection timeout"**: Verify network access settings
- **"Invalid connection string"**: Ensure proper URI format

### Data Issues
- **Missing collections**: Verify import process
- **Data corruption**: Check JSON format in backup files
- **Permission errors**: Ensure database user has proper permissions

## 📞 Support
If you encounter issues:
1. Check MongoDB Atlas documentation
2. Review the error logs in your application
3. Verify network connectivity and firewall settings
4. Contact MongoDB Atlas support if needed

## 🎉 Success Checklist
- [ ] Network access configured
- [ ] Database user created with proper permissions
- [ ] Data migrated successfully
- [ ] Application configuration updated
- [ ] All functionality tested
- [ ] Security measures implemented
