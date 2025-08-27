const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-finder');

// Import the Artisan model
const Artisan = require('./src/models/artisan');
const User = require('./src/models/user');

// Sample artisans data with photos
const sampleArtisans = [
  {
    artisanName: "Green Valley Farm",
    type: "farm",
    description: "Family-owned organic farm specializing in fresh vegetables, fruits, and herbs. We grow everything with sustainable practices and love for the land.",
    address: {
      street: "1234 Farm Road",
      city: "Springfield",
      state: "IL",
      zipCode: "62701"
    },
    contactInfo: {
      phone: "(217) 555-0123",
      email: "info@greenvalleyfarm.com"
    },
    artisanHours: {
      monday: { open: "8:00", close: "18:00", closed: false },
      tuesday: { open: "8:00", close: "18:00", closed: false },
      wednesday: { open: "8:00", close: "18:00", closed: false },
      thursday: { open: "8:00", close: "18:00", closed: false },
      friday: { open: "8:00", close: "18:00", closed: false },
      saturday: { open: "8:00", close: "18:00", closed: false },
      sunday: { open: "9:00", close: "16:00", closed: false }
    },
    rating: { average: 4.8, count: 45 },
    photos: [
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Sweet Honey Haven",
    type: "honey_producer",
    description: "Pure, raw honey from our own beehives. We harvest honey seasonally and offer different varieties including wildflower, clover, and orange blossom.",
    address: {
      street: "567 Bee Lane",
      city: "Springfield",
      state: "IL",
      zipCode: "62702"
    },
    contactInfo: {
      phone: "(217) 555-0456",
      email: "hello@sweethoneyhaven.com"
    },
    artisanHours: {
      monday: { open: "9:00", close: "17:00", closed: false },
      tuesday: { open: "9:00", close: "17:00", closed: false },
      wednesday: { open: "9:00", close: "17:00", closed: false },
      thursday: { open: "9:00", close: "17:00", closed: false },
      friday: { open: "9:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "15:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    rating: { average: 4.9, count: 32 },
    photos: [
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Artisan Bread Co.",
    type: "bakery",
    description: "Handcrafted sourdough breads, pastries, and artisanal baked goods made with locally sourced ingredients and traditional techniques.",
    address: {
      street: "890 Baker Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62703"
    },
    contactInfo: {
      phone: "(217) 555-0789",
      email: "orders@artisanbreadco.com"
    },
    artisanHours: {
      monday: { open: "", close: "", closed: true },
      tuesday: { open: "6:00", close: "14:00", closed: false },
      wednesday: { open: "6:00", close: "14:00", closed: false },
      thursday: { open: "6:00", close: "14:00", closed: false },
      friday: { open: "6:00", close: "14:00", closed: false },
      saturday: { open: "6:00", close: "14:00", closed: false },
      sunday: { open: "7:00", close: "13:00", closed: false }
    },
    rating: { average: 4.7, count: 67 },
    photos: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Maple Creek Dairy",
    type: "dairy",
    description: "Small-scale dairy farm producing fresh milk, cheese, yogurt, and butter from grass-fed cows. All products are made on-site.",
    address: {
      street: "234 Dairy Drive",
      city: "Springfield",
      state: "IL",
      zipCode: "62704"
    },
    contactInfo: {
      phone: "(217) 555-0321",
      email: "milk@maplecreekdairy.com"
    },
    artisanHours: {
      monday: { open: "7:00", close: "18:00", closed: false },
      tuesday: { open: "7:00", close: "18:00", closed: false },
      wednesday: { open: "7:00", close: "18:00", closed: false },
      thursday: { open: "7:00", close: "18:00", closed: false },
      friday: { open: "7:00", close: "18:00", closed: false },
      saturday: { open: "7:00", close: "18:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    rating: { average: 4.6, count: 28 },
    photos: [
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Herb Garden Delights",
    type: "herb_garden",
    description: "Specialized herb garden growing fresh and dried herbs, medicinal plants, and herbal teas. We offer organic and pesticide-free herbs.",
    address: {
      street: "456 Herb Way",
      city: "Springfield",
      state: "IL",
      zipCode: "62705"
    },
    contactInfo: {
      phone: "(217) 555-0654",
      email: "herbs@herbgardendelights.com"
    },
    artisanHours: {
      monday: { open: "8:00", close: "19:00", closed: false },
      tuesday: { open: "8:00", close: "19:00", closed: false },
      wednesday: { open: "8:00", close: "19:00", closed: false },
      thursday: { open: "8:00", close: "19:00", closed: false },
      friday: { open: "8:00", close: "19:00", closed: false },
      saturday: { open: "8:00", close: "19:00", closed: false },
      sunday: { open: "8:00", close: "19:00", closed: false }
    },
    rating: { average: 4.5, count: 19 },
    photos: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Mushroom Magic Farm",
    type: "mushroom_farm",
    description: "Specialized mushroom farm growing gourmet varieties including shiitake, oyster, and portobello mushrooms in controlled environments.",
    address: {
      street: "789 Fungi Lane",
      city: "Springfield",
      state: "IL",
      zipCode: "62706"
    },
    contactInfo: {
      phone: "(217) 555-0987",
      email: "mushrooms@mushroommagic.com"
    },
    artisanHours: {
      monday: { open: "8:00", close: "17:00", closed: false },
      tuesday: { open: "8:00", close: "17:00", closed: false },
      wednesday: { open: "8:00", close: "17:00", closed: false },
      thursday: { open: "8:00", close: "17:00", closed: false },
      friday: { open: "8:00", close: "17:00", closed: false },
      saturday: { open: "9:00", close: "15:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    rating: { average: 4.4, count: 23 },
    photos: [
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Vineyard Valley",
    type: "vineyard",
    description: "Family-owned vineyard producing premium wines from locally grown grapes. We offer wine tastings and vineyard tours.",
    address: {
      street: "321 Grape Road",
      city: "Springfield",
      state: "IL",
      zipCode: "62707"
    },
    contactInfo: {
      phone: "(217) 555-0123",
      email: "wine@vineyardvalley.com"
    },
    artisanHours: {
      monday: { open: "", close: "", closed: true },
      tuesday: { open: "", close: "", closed: true },
      wednesday: { open: "", close: "", closed: true },
      thursday: { open: "11:00", close: "19:00", closed: false },
      friday: { open: "11:00", close: "19:00", closed: false },
      saturday: { open: "11:00", close: "19:00", closed: false },
      sunday: { open: "11:00", close: "19:00", closed: false }
    },
    rating: { average: 4.8, count: 89 },
    photos: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Fresh Catch Seafood",
    type: "fish_market",
    description: "Local fish market offering fresh, sustainably caught seafood from nearby waters. We source directly from local fishermen.",
    address: {
      street: "654 Fish Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62708"
    },
    contactInfo: {
      phone: "(217) 555-0456",
      email: "fish@freshcatch.com"
    },
    artisanHours: {
      monday: { open: "7:00", close: "18:00", closed: false },
      tuesday: { open: "7:00", close: "18:00", closed: false },
      wednesday: { open: "7:00", close: "18:00", closed: false },
      thursday: { open: "7:00", close: "18:00", closed: false },
      friday: { open: "7:00", close: "18:00", closed: false },
      saturday: { open: "7:00", close: "18:00", closed: false },
      sunday: { open: "8:00", close: "16:00", closed: false }
    },
    rating: { average: 4.3, count: 41 },
    photos: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Organic Orchard",
    type: "orchard",
    description: "Certified organic orchard growing apples, pears, peaches, and berries. We offer pick-your-own experiences and fresh fruit sales.",
    address: {
      street: "987 Fruit Tree Lane",
      city: "Springfield",
      state: "IL",
      zipCode: "62709"
    },
    contactInfo: {
      phone: "(217) 555-0789",
      email: "fruit@organicorchard.com"
    },
    artisanHours: {
      monday: { open: "8:00", close: "18:00", closed: false },
      tuesday: { open: "8:00", close: "18:00", closed: false },
      wednesday: { open: "8:00", close: "18:00", closed: false },
      thursday: { open: "8:00", close: "18:00", closed: false },
      friday: { open: "8:00", close: "18:00", closed: false },
      saturday: { open: "8:00", close: "18:00", closed: false },
      sunday: { open: "8:00", close: "18:00", closed: false }
    },
    rating: { average: 4.7, count: 56 },
    photos: [
      "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Artisan Cheese Maker",
    type: "cheese_maker",
    description: "Handcrafted artisanal cheeses made with traditional methods and locally sourced milk. We offer aged and fresh varieties.",
    address: {
      street: "147 Cheese Court",
      city: "Springfield",
      state: "IL",
      zipCode: "62710"
    },
    contactInfo: {
      phone: "(217) 555-0321",
      email: "cheese@artisancheese.com"
    },
    artisanHours: {
      monday: { open: "9:00", close: "17:00", closed: false },
      tuesday: { open: "9:00", close: "17:00", closed: false },
      wednesday: { open: "9:00", close: "17:00", closed: false },
      thursday: { open: "9:00", close: "17:00", closed: false },
      friday: { open: "9:00", close: "17:00", closed: false },
      saturday: { open: "9:00", close: "17:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    rating: { average: 4.9, count: 34 },
    photos: [
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Coffee Roaster's Corner",
    type: "coffee_roaster",
    description: "Small-batch coffee roaster offering freshly roasted beans and specialty coffee blends. We source beans from sustainable farms.",
    address: {
      street: "258 Coffee Avenue",
      city: "Springfield",
      state: "IL",
      zipCode: "62711"
    },
    contactInfo: {
      phone: "(217) 555-0654",
      email: "coffee@roasterscorner.com"
    },
    artisanHours: {
      monday: { open: "7:00", close: "18:00", closed: false },
      tuesday: { open: "7:00", close: "18:00", closed: false },
      wednesday: { open: "7:00", close: "18:00", closed: false },
      thursday: { open: "7:00", close: "18:00", closed: false },
      friday: { open: "7:00", close: "18:00", closed: false },
      saturday: { open: "8:00", close: "16:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    rating: { average: 4.6, count: 78 },
    photos: [
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=300&fit=crop"
    ],
    isActive: true
  },
  {
    artisanName: "Chocolate Dreams",
    type: "chocolate_maker",
    description: "Handcrafted chocolates and confections made with premium ingredients. We offer truffles, bars, and custom orders.",
    address: {
      street: "369 Chocolate Street",
      city: "Springfield",
      state: "IL",
      zipCode: "62712"
    },
    contactInfo: {
      phone: "(217) 555-0987",
      email: "sweet@chocolatedreams.com"
    },
    artisanHours: {
      monday: { open: "10:00", close: "19:00", closed: false },
      tuesday: { open: "10:00", close: "19:00", closed: false },
      wednesday: { open: "10:00", close: "19:00", closed: false },
      thursday: { open: "10:00", close: "19:00", closed: false },
      friday: { open: "10:00", close: "19:00", closed: false },
      saturday: { open: "10:00", close: "19:00", closed: false },
      sunday: { open: "12:00", close: "17:00", closed: false }
    },
    rating: { average: 4.8, count: 92 },
    photos: [
      "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=300&fit=crop"
    ],
    isActive: true
  }
];

async function createSampleArtisans() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-finder');
    console.log('Connected to MongoDB');

    // Find or create a test user for the artisans
    let testUser = await User.findOne({ email: 'test@artisan.com' });
    if (!testUser) {
      testUser = new User({
        firstName: 'Test',
        lastName: 'Artisan',
        email: 'test@artisan.com',
        password: 'password123',
        role: 'artisan'
      });
      await testUser.save();
      console.log('Created test user for artisans');
    }

    // Clear existing sample artisans
    console.log('Clearing existing sample artisans...');
    await Artisan.deleteMany({ artisanName: { $in: sampleArtisans.map(a => a.artisanName) } });

    // Create new sample artisans with the test user
    console.log('Creating sample artisans...');
    const artisansWithUser = sampleArtisans.map(artisan => ({
      ...artisan,
      user: testUser._id
    }));
    
    const createdArtisans = await Artisan.insertMany(artisansWithUser);
    
    console.log(`✅ Successfully created ${createdArtisans.length} sample artisans:`);
    createdArtisans.forEach(artisan => {
      console.log(`  - ${artisan.artisanName} (${artisan.type}) - ${artisan.photos.length} photos`);
    });

    console.log('\n🎉 Sample artisans are ready! You can now test the Find Artisans feature with photos.');
    
  } catch (error) {
    console.error('Error creating sample artisans:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSampleArtisans();
