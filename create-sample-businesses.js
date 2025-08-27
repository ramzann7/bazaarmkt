const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-finder');

// Business Schema (simplified for this script)
const businessSchema = new mongoose.Schema({
  businessName: String,
  type: String,
  category: String,
  description: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  phone: String,
  email: String,
  businessHours: String,
  rating: {
    average: Number,
    count: Number
  },
  photos: [{
    url: String,
    isPrimary: Boolean
  }],
  isActive: Boolean,
  user: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const Business = mongoose.model('Business', businessSchema);

// Sample businesses data
const sampleBusinesses = [
  {
    businessName: "Green Valley Farm",
    type: "farm",
    category: "fresh_produce",
    description: "Family-owned organic farm specializing in fresh vegetables, fruits, and herbs. We grow everything with sustainable practices and love for the land.",
    address: {
      street: "1234 Farm Road",
      city: "Springfield",
      state: "IL",
      zipCode: "62701"
    },
    phone: "(217) 555-0123",
    email: "info@greenvalleyfarm.com",
    businessHours: "Mon-Sat: 8AM-6PM, Sun: 9AM-4PM",
    rating: { average: 4.8, count: 45 },
    photos: [
      { url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Sweet Honey Haven",
    type: "honey_producer",
    category: "honey",
    description: "Pure, raw honey from our own beehives. We harvest honey seasonally and offer different varieties including wildflower, clover, and orange blossom.",
    address: {
      street: "567 Bee Lane",
      city: "Springfield",
      state: "IL",
      zipCode: "62702"
    },
    phone: "(217) 555-0456",
    email: "hello@sweethoneyhaven.com",
    businessHours: "Mon-Fri: 9AM-5PM, Sat: 10AM-3PM",
    rating: { average: 4.9, count: 32 },
    photos: [
      { url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Artisan Bread Co.",
    type: "bakery",
    category: "bakery",
    description: "Handcrafted sourdough breads, pastries, and artisanal baked goods made with locally sourced ingredients and traditional techniques.",
    address: {
      street: "890 Baker Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62703"
    },
    phone: "(217) 555-0789",
    email: "orders@artisanbreadco.com",
    businessHours: "Tue-Sat: 6AM-2PM, Sun: 7AM-1PM",
    rating: { average: 4.7, count: 67 },
    photos: [
      { url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Maple Creek Dairy",
    type: "dairy",
    category: "dairy",
    description: "Small-scale dairy farm producing fresh milk, cheese, yogurt, and butter from grass-fed cows. All products are made on-site.",
    address: {
      street: "234 Dairy Drive",
      city: "Springfield",
      state: "IL",
      zipCode: "62704"
    },
    phone: "(217) 555-0321",
    email: "milk@maplecreekdairy.com",
    businessHours: "Mon-Sat: 7AM-6PM",
    rating: { average: 4.6, count: 28 },
    photos: [
      { url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Herb Garden Delights",
    type: "herb_garden",
    category: "herbs",
    description: "Specialized herb garden growing fresh and dried herbs, medicinal plants, and herbal teas. We offer organic and pesticide-free herbs.",
    address: {
      street: "456 Herb Way",
      city: "Springfield",
      state: "IL",
      zipCode: "62705"
    },
    phone: "(217) 555-0654",
    email: "herbs@herbgardendelights.com",
    businessHours: "Mon-Sun: 8AM-7PM",
    rating: { average: 4.5, count: 19 },
    photos: [
      { url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Mushroom Magic Farm",
    type: "mushroom_farm",
    category: "mushrooms",
    description: "Specialized mushroom farm growing gourmet varieties including shiitake, oyster, and portobello mushrooms in controlled environments.",
    address: {
      street: "789 Fungi Lane",
      city: "Springfield",
      state: "IL",
      zipCode: "62706"
    },
    phone: "(217) 555-0987",
    email: "mushrooms@mushroommagic.com",
    businessHours: "Mon-Fri: 8AM-5PM, Sat: 9AM-3PM",
    rating: { average: 4.4, count: 23 },
    photos: [
      { url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Vineyard Valley",
    type: "vineyard",
    category: "beverages",
    description: "Family-owned vineyard producing premium wines from locally grown grapes. We offer wine tastings and vineyard tours.",
    address: {
      street: "321 Grape Road",
      city: "Springfield",
      state: "IL",
      zipCode: "62707"
    },
    phone: "(217) 555-0123",
    email: "wine@vineyardvalley.com",
    businessHours: "Thu-Sun: 11AM-7PM",
    rating: { average: 4.8, count: 89 },
    photos: [
      { url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Fresh Catch Seafood",
    type: "fish_market",
    category: "seafood",
    description: "Local fish market offering fresh, sustainably caught seafood from nearby waters. We source directly from local fishermen.",
    address: {
      street: "654 Fish Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62708"
    },
    phone: "(217) 555-0456",
    email: "fish@freshcatch.com",
    businessHours: "Mon-Sat: 7AM-6PM, Sun: 8AM-4PM",
    rating: { average: 4.3, count: 41 },
    photos: [
      { url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Organic Orchard",
    type: "orchard",
    category: "fruits",
    description: "Certified organic orchard growing apples, pears, peaches, and berries. We offer pick-your-own experiences and fresh fruit sales.",
    address: {
      street: "987 Fruit Tree Lane",
      city: "Springfield",
      state: "IL",
      zipCode: "62709"
    },
    phone: "(217) 555-0789",
    email: "fruit@organicorchard.com",
    businessHours: "Mon-Sun: 8AM-6PM (seasonal)",
    rating: { average: 4.7, count: 56 },
    photos: [
      { url: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Artisan Cheese Maker",
    type: "cheese_maker",
    category: "artisan_products",
    description: "Handcrafted artisanal cheeses made with traditional methods and locally sourced milk. We offer aged and fresh varieties.",
    address: {
      street: "147 Cheese Court",
      city: "Springfield",
      state: "IL",
      zipCode: "62710"
    },
    phone: "(217) 555-0321",
    email: "cheese@artisancheese.com",
    businessHours: "Mon-Sat: 9AM-5PM",
    rating: { average: 4.9, count: 34 },
    photos: [
      { url: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Coffee Roaster's Corner",
    type: "coffee_roaster",
    category: "beverages",
    description: "Small-batch coffee roaster offering freshly roasted beans and specialty coffee blends. We source beans from sustainable farms.",
    address: {
      street: "258 Coffee Avenue",
      city: "Springfield",
      state: "IL",
      zipCode: "62711"
    },
    phone: "(217) 555-0654",
    email: "coffee@roasterscorner.com",
    businessHours: "Mon-Fri: 7AM-6PM, Sat: 8AM-4PM",
    rating: { average: 4.6, count: 78 },
    photos: [
      { url: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  },
  {
    businessName: "Chocolate Dreams",
    type: "chocolate_maker",
    category: "artisan_products",
    description: "Handcrafted chocolates and confections made with premium ingredients. We offer truffles, bars, and custom orders.",
    address: {
      street: "369 Chocolate Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62712"
    },
    phone: "(217) 555-0987",
    email: "sweet@chocolatedreams.com",
    businessHours: "Mon-Sat: 10AM-7PM, Sun: 12PM-5PM",
    rating: { average: 4.8, count: 92 },
    photos: [
      { url: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400", isPrimary: true }
    ],
    isActive: true,
    user: new mongoose.Types.ObjectId()
  }
];

async function createSampleBusinesses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-finder');
    console.log('Connected to MongoDB');

    // Clear existing sample businesses
    console.log('Clearing existing sample businesses...');
    await Business.deleteMany({ businessName: { $in: sampleBusinesses.map(b => b.businessName) } });

    // Create new sample businesses
    console.log('Creating sample businesses...');
    const createdBusinesses = await Business.insertMany(sampleBusinesses);
    
    console.log(`✅ Successfully created ${createdBusinesses.length} sample businesses:`);
    createdBusinesses.forEach(business => {
      console.log(`  - ${business.businessName} (${business.type})`);
    });

    console.log('\n🎉 Sample businesses are ready! You can now test the Find Businesses feature.');
    
  } catch (error) {
    console.error('Error creating sample businesses:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSampleBusinesses();
