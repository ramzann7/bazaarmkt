# 🚀 Database Quick Reference Guide

## 📋 Quick Commands

### **Connect to Database**
```bash
mongosh bazarmkt
```

### **View Collections**
```bash
show collections
```

### **Count Documents**
```bash
db.users.countDocuments()
db.products.countDocuments()
db.producers.countDocuments()
db.orders.countDocuments()
```

---

## 👥 Users Collection

### **Find All Users**
```javascript
db.users.find().pretty()
```

### **Find User by Email**
```javascript
db.users.findOne({email: "ramz@hotmail.com"})
```

### **Find Producers Only**
```javascript
db.users.find({role: "producer"}).pretty()
```

### **Find Buyers Only**
```javascript
db.users.find({role: "buyer"}).pretty()
```

### **Update User Profile**
```javascript
db.users.updateOne(
  {email: "ramz@hotmail.com"},
  {$set: {phone: "5148296989"}}
)
```

---

## 🏪 Products Collection

### **Find All Products**
```javascript
db.products.find().pretty()
```

### **Find Products by Seller**
```javascript
db.products.find({seller: ObjectId("68a733164b78eb31b9af9ef3")}).pretty()
```

### **Find Active Products**
```javascript
db.products.find({status: "active"}).pretty()
```

### **Find Products by Category**
```javascript
db.products.find({category: "Bakery"}).pretty()
```

### **Find Products with Stock**
```javascript
db.products.find({stock: {$gt: 0}}).pretty()
```

### **Find Organic Products**
```javascript
db.products.find({isOrganic: true}).pretty()
```

### **Update Product Stock**
```javascript
db.products.updateOne(
  {_id: ObjectId("68a927c7e869425702d2cec0")},
  {$set: {stock: 50}}
)
```

---

## 🏭 Producers Collection

### **Find All Producers**
```javascript
db.producers.find().pretty()
```

### **Find Producer by User ID**
```javascript
db.producers.findOne({user: ObjectId("68a733164b78eb31b9af9ef3")})
```

### **Find Active Producers**
```javascript
db.producers.find({isActive: true}).pretty()
```

### **Find Producers by Type**
```javascript
db.producers.find({type: "bakery"}).pretty()
```

---

## 📦 Orders Collection

### **Find All Orders**
```javascript
db.orders.find().pretty()
```

### **Find Orders by Buyer**
```javascript
db.orders.find({buyer: ObjectId("USER_ID")}).pretty()
```

### **Find Orders by Producer**
```javascript
db.orders.find({producer: ObjectId("PRODUCER_ID")}).pretty()
```

### **Find Orders by Status**
```javascript
db.orders.find({status: "pending"}).pretty()
```

---

## 🔍 Advanced Queries

### **Join Users with Products**
```javascript
db.products.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "seller",
      foreignField: "_id",
      as: "sellerInfo"
    }
  }
]).pretty()
```

### **Product Statistics**
```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      count: {$sum: 1},
      avgPrice: {$avg: "$price"},
      totalStock: {$sum: "$stock"}
    }
  }
])
```

### **Seller Performance**
```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$seller",
      productCount: {$sum: 1},
      totalStock: {$sum: "$stock"},
      avgPrice: {$avg: "$price"}
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "sellerInfo"
    }
  }
])
```

---

## 🗑️ Data Management

### **Delete User**
```javascript
db.users.deleteOne({email: "user@example.com"})
```

### **Delete Product**
```javascript
db.products.deleteOne({_id: ObjectId("PRODUCT_ID")})
```

### **Delete Producer**
```javascript
db.producers.deleteOne({user: ObjectId("USER_ID")})
```

### **Clear All Data**
```javascript
db.users.deleteMany({})
db.products.deleteMany({})
db.producers.deleteMany({})
db.orders.deleteMany({})
```

---

## 📊 Database Statistics

### **Database Size**
```javascript
db.stats()
```

### **Collection Sizes**
```javascript
db.users.stats()
db.products.stats()
db.producers.stats()
db.orders.stats()
```

### **Index Information**
```javascript
db.users.getIndexes()
db.products.getIndexes()
db.producers.getIndexes()
db.orders.getIndexes()
```

---

## 🔧 Troubleshooting

### **Check Database Connection**
```javascript
db.runCommand('ping')
```

### **Check Slow Queries**
```javascript
db.getProfilingStatus()
db.setProfilingLevel(1, 100)
```

### **View Recent Operations**
```javascript
db.system.profile.find().pretty()
```

---

## 📁 File Management

### **List Uploaded Files**
```bash
ls -la backend/public/uploads/products/
```

### **Check File Sizes**
```bash
du -sh backend/public/uploads/products/
```

### **Find Orphaned Files**
```bash
# Files in database
mongosh bazarmkt --eval "db.products.distinct('image')" > db_files.txt

# Files on disk
ls backend/public/uploads/products/ > disk_files.txt

# Compare (manual process)
diff db_files.txt disk_files.txt
```

---

## 🚀 Performance Tips

### **Use Indexes**
```javascript
// Create text index for search
db.products.createIndex({name: "text", description: "text"})

// Create compound index
db.products.createIndex({category: 1, status: 1, price: 1})
```

### **Limit Results**
```javascript
// Limit to 10 results
db.products.find().limit(10).pretty()

// Skip first 10 results
db.products.find().skip(10).limit(10).pretty()
```

### **Project Only Needed Fields**
```javascript
db.products.find({}, {name: 1, price: 1, category: 1}).pretty()
```

---

## 📝 Common Patterns

### **Pagination**
```javascript
const page = 1;
const limit = 10;
const skip = (page - 1) * limit;

db.products.find()
  .skip(skip)
  .limit(limit)
  .pretty()
```

### **Search with Multiple Criteria**
```javascript
db.products.find({
  $and: [
    {category: "Bakery"},
    {price: {$gte: 5, $lte: 20}},
    {stock: {$gt: 0}},
    {status: "active"}
  ]
}).pretty()
```

### **Update with Conditions**
```javascript
db.products.updateMany(
  {stock: {$lt: 10}},
  {$set: {status: "out_of_stock"}}
)
```

---

*Quick Reference - Version 1.0*
*Last Updated: January 23, 2025*
