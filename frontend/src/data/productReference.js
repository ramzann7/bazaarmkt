// Comprehensive Product Reference Data for Artisans
// This file contains all possible product categories, subcategories, and product types
// that artisans can offer across various domains

export const PRODUCT_CATEGORIES = {
  // Food & Beverages
  food_beverages: {
    name: "Food & Beverages",
    icon: "🍽️",
    description: "Fresh, homemade, and artisanal food products",
    subcategories: {
      baked_goods: {
        name: "Baked Goods",
        icon: "🥖",
        products: [
          "Artisan Bread",
          "Sourdough Bread",
          "Croissants",
          "Pastries",
          "Cakes",
          "Cookies",
          "Muffins",
          "Pies",
          "Tarts",
          "Donuts",
          "Bagels",
          "Pretzels",
          "Biscuits",
          "Scones",
          "Brownies",
          "Cupcakes",
          "Cheesecake",
          "Tiramisu",
          "Éclairs",
          "Danish Pastries"
        ]
      },
      dairy_products: {
        name: "Dairy Products",
        icon: "🥛",
        products: [
          "Artisan Cheese",
          "Fresh Milk",
          "Yogurt",
          "Butter",
          "Cream",
          "Ice Cream",
          "Kefir",
          "Cottage Cheese",
          "Ricotta",
          "Mozzarella",
          "Cheddar",
          "Gouda",
          "Brie",
          "Feta",
          "Parmesan"
        ]
      },
      preserves_jams: {
        name: "Preserves & Jams",
        icon: "🍯",
        products: [
          "Homemade Jam",
          "Fruit Preserves",
          "Marmalade",
          "Jelly",
          "Chutney",
          "Pickles",
          "Relish",
          "Salsa",
          "Hot Sauce",
          "Mustard",
          "Ketchup",
          "Barbecue Sauce",
          "Pesto",
          "Tapenade",
          "Olive Oil"
        ]
      },
      beverages: {
        name: "Beverages",
        icon: "☕",
        products: [
          "Artisan Coffee",
          "Tea Blends",
          "Fresh Juice",
          "Smoothies",
          "Kombucha",
          "Cider",
          "Wine",
          "Beer",
          "Mead",
          "Lemonade",
          "Hot Chocolate",
          "Herbal Tea",
          "Cold Brew",
          "Espresso",
          "Cappuccino"
        ]
      },
      fresh_produce: {
        name: "Fresh Produce",
        icon: "🥬",
        products: [
          "Organic Vegetables",
          "Fresh Fruits",
          "Herbs",
          "Microgreens",
          "Mushrooms",
          "Sprouts",
          "Baby Greens",
          "Root Vegetables",
          "Leafy Greens",
          "Tomatoes",
          "Peppers",
          "Cucumbers",
          "Zucchini",
          "Eggplant",
          "Berries"
        ]
      },
      meat_seafood: {
        name: "Meat & Seafood",
        icon: "🥩",
        products: [
          "Grass-fed Beef",
          "Free-range Chicken",
          "Pasture-raised Pork",
          "Lamb",
          "Fresh Fish",
          "Shrimp",
          "Scallops",
          "Oysters",
          "Mussels",
          "Crab",
          "Lobster",
          "Sausages",
          "Bacon",
          "Ham",
          "Deli Meats"
        ]
      },
      snacks_treats: {
        name: "Snacks & Treats",
        icon: "🍿",
        products: [
          "Popcorn",
          "Nuts",
          "Dried Fruits",
          "Trail Mix",
          "Granola",
          "Energy Bars",
          "Crackers",
          "Chips",
          "Pretzels",
          "Candy",
          "Chocolate",
          "Fudge",
          "Toffee",
          "Caramel",
          "Marshmallows"
        ]
      }
    }
  },

  // Handmade Crafts
  handmade_crafts: {
    name: "Handmade Crafts",
    icon: "🎨",
    description: "Unique handcrafted items and artistic creations",
    subcategories: {
      jewelry: {
        name: "Jewelry",
        icon: "💍",
        products: [
          "Handmade Necklaces",
          "Earrings",
          "Bracelets",
          "Rings",
          "Anklets",
          "Brooches",
          "Pendants",
          "Chokers",
          "Statement Necklaces",
          "Wire Wrapped Jewelry",
          "Beaded Jewelry",
          "Metal Jewelry",
          "Leather Jewelry",
          "Resin Jewelry",
          "Clay Jewelry"
        ]
      },
      pottery_ceramics: {
        name: "Pottery & Ceramics",
        icon: "🏺",
        products: [
          "Hand-thrown Pottery",
          "Ceramic Mugs",
          "Bowls",
          "Plates",
          "Vases",
          "Plant Pots",
          "Tea Sets",
          "Serving Dishes",
          "Decorative Items",
          "Sculptures",
          "Tiles",
          "Wall Art",
          "Garden Decor",
          "Kitchen Items",
          "Storage Containers"
        ]
      },
      textiles_fiber: {
        name: "Textiles & Fiber Arts",
        icon: "🧶",
        products: [
          "Hand-knitted Items",
          "Crocheted Items",
          "Woven Textiles",
          "Hand-dyed Fabric",
          "Quilts",
          "Blankets",
          "Scarves",
          "Hats",
          "Gloves",
          "Socks",
          "Bags",
          "Pillows",
          "Rugs",
          "Wall Hangings",
          "Table Linens"
        ]
      },
      woodworking: {
        name: "Woodworking",
        icon: "🪵",
        products: [
          "Handcrafted Furniture",
          "Cutting Boards",
          "Serving Trays",
          "Wooden Bowls",
          "Picture Frames",
          "Jewelry Boxes",
          "Storage Boxes",
          "Wall Shelves",
          "Stools",
          "Tables",
          "Chairs",
          "Bed Frames",
          "Kitchen Utensils",
          "Garden Items",
          "Decorative Items"
        ]
      },
      glass_art: {
        name: "Glass Art",
        icon: "🪟",
        products: [
          "Blown Glass",
          "Stained Glass",
          "Fused Glass",
          "Glass Beads",
          "Vases",
          "Bowl",
          "Ornaments",
          "Wind Chimes",
          "Suncatchers",
          "Jewelry",
          "Drinking Glasses",
          "Candle Holders",
          "Wall Art",
          "Garden Decor",
          "Paperweights"
        ]
      },
      paper_crafts: {
        name: "Paper Crafts",
        icon: "📄",
        products: [
          "Handmade Cards",
          "Scrapbooks",
          "Origami",
          "Paper Flowers",
          "Bookmarks",
          "Gift Tags",
          "Wrapping Paper",
          "Notebooks",
          "Journals",
          "Photo Albums",
          "Paper Lanterns",
          "Mobiles",
          "Wall Art",
          "Party Decorations",
          "Invitations"
        ]
      }
    }
  },

  // Clothing & Accessories
  clothing_accessories: {
    name: "Clothing & Accessories",
    icon: "👕",
    description: "Handmade clothing, accessories, and fashion items",
    subcategories: {
      clothing: {
        name: "Clothing",
        icon: "👗",
        products: [
          "Handmade Dresses",
          "Tops",
          "Skirts",
          "Pants",
          "Jackets",
          "Coats",
          "Sweaters",
          "Hoodies",
          "T-shirts",
          "Blouses",
          "Shirts",
          "Shorts",
          "Jumpsuits",
          "Rompers",
          "Loungewear"
        ]
      },
      accessories: {
        name: "Accessories",
        icon: "👜",
        products: [
          "Handbags",
          "Purses",
          "Wallets",
          "Belts",
          "Scarves",
          "Hats",
          "Gloves",
          "Sunglasses",
          "Hair Accessories",
          "Ties",
          "Bow Ties",
          "Socks",
          "Leggings",
          "Tights",
          "Bandanas"
        ]
      },
      shoes_footwear: {
        name: "Shoes & Footwear",
        icon: "👟",
        products: [
          "Handmade Shoes",
          "Sandals",
          "Boots",
          "Slippers",
          "Moccasins",
          "Espadrilles",
          "Clogs",
          "Flip Flops",
          "House Shoes",
          "Dance Shoes",
          "Work Boots",
          "Hiking Boots",
          "Dress Shoes",
          "Casual Shoes",
          "Children's Shoes"
        ]
      },
      baby_kids: {
        name: "Baby & Kids",
        icon: "👶",
        products: [
          "Baby Clothes",
          "Children's Clothing",
          "Baby Blankets",
          "Diaper Bags",
          "Bibs",
          "Hats",
          "Socks",
          "Shoes",
          "Toys",
          "Stuffed Animals",
          "Bibs",
          "Burp Cloths",
          "Swaddles",
          "Onesies",
          "Dresses"
        ]
      }
    }
  },

  // Home & Garden
  home_garden: {
    name: "Home & Garden",
    icon: "🏠",
    description: "Home decor, garden items, and household products",
    subcategories: {
      home_decor: {
        name: "Home Decor",
        icon: "🖼️",
        products: [
          "Wall Art",
          "Paintings",
          "Photography",
          "Mirrors",
          "Clocks",
          "Candles",
          "Candle Holders",
          "Vases",
          "Flower Arrangements",
          "Throw Pillows",
          "Blankets",
          "Rugs",
          "Curtains",
          "Lamps",
          "Planters"
        ]
      },
      kitchen_dining: {
        name: "Kitchen & Dining",
        icon: "🍽️",
        products: [
          "Kitchen Utensils",
          "Cutting Boards",
          "Serving Dishes",
          "Tableware",
          "Napkins",
          "Placemats",
          "Coasters",
          "Kitchen Towels",
          "Aprons",
          "Oven Mitts",
          "Pot Holders",
          "Storage Containers",
          "Spice Racks",
          "Wine Racks",
          "Bread Boxes"
        ]
      },
      garden_outdoor: {
        name: "Garden & Outdoor",
        icon: "🌱",
        products: [
          "Garden Tools",
          "Plant Pots",
          "Garden Decor",
          "Bird Feeders",
          "Wind Chimes",
          "Garden Signs",
          "Plant Markers",
          "Garden Stakes",
          "Outdoor Furniture",
          "Garden Art",
          "Watering Cans",
          "Plant Stands",
          "Garden Benches",
          "Trellises",
          "Garden Ornaments"
        ]
      },
      bath_bedroom: {
        name: "Bath & Bedroom",
        icon: "🛏️",
        products: [
          "Towels",
          "Bath Mats",
          "Shower Curtains",
          "Soap Dishes",
          "Toothbrush Holders",
          "Bedding",
          "Pillowcases",
          "Duvet Covers",
          "Bed Skirts",
          "Throw Blankets",
          "Bedside Tables",
          "Lamps",
          "Curtains",
          "Rugs",
          "Storage Solutions"
        ]
      }
    }
  },

  // Beauty & Wellness
  beauty_wellness: {
    name: "Beauty & Wellness",
    icon: "💄",
    description: "Natural beauty products and wellness items",
    subcategories: {
      skincare: {
        name: "Skincare",
        icon: "🧴",
        products: [
          "Natural Soaps",
          "Face Creams",
          "Body Lotions",
          "Facial Masks",
          "Toners",
          "Serums",
          "Exfoliants",
          "Cleansers",
          "Moisturizers",
          "Sunscreen",
          "Lip Balms",
          "Eye Creams",
          "Body Scrubs",
          "Bath Salts",
          "Essential Oils"
        ]
      },
      haircare: {
        name: "Haircare",
        icon: "💇‍♀️",
        products: [
          "Shampoo",
          "Conditioner",
          "Hair Masks",
          "Hair Oils",
          "Hair Serums",
          "Styling Products",
          "Hair Accessories",
          "Combs",
          "Brushes",
          "Hair Ties",
          "Headbands",
          "Hair Clips",
          "Hair Pins",
          "Hair Bands",
          "Hair Wraps"
        ]
      },
      aromatherapy: {
        name: "Aromatherapy",
        icon: "🕯️",
        products: [
          "Essential Oils",
          "Candles",
          "Incense",
          "Diffusers",
          "Room Sprays",
          "Perfumes",
          "Body Sprays",
          "Scented Sachets",
          "Aromatherapy Kits",
          "Massage Oils",
          "Bath Products",
          "Herbal Teas",
          "Meditation Items",
          "Relaxation Products",
          "Wellness Kits"
        ]
      },
      wellness: {
        name: "Wellness",
        icon: "🧘‍♀️",
        products: [
          "Yoga Mats",
          "Meditation Cushions",
          "Massage Tools",
          "Heating Pads",
          "Ice Packs",
          "Compression Socks",
          "Eye Masks",
          "Sleep Masks",
          "Pillows",
          "Weighted Blankets",
          "Fitness Equipment",
          "Recovery Tools",
          "Stress Relief Items",
          "Mindfulness Products",
          "Health Supplements"
        ]
      }
    }
  },

  // Toys & Games
  toys_games: {
    name: "Toys & Games",
    icon: "🧸",
    description: "Handmade toys, games, and educational items",
    subcategories: {
      wooden_toys: {
        name: "Wooden Toys",
        icon: "🪵",
        products: [
          "Building Blocks",
          "Puzzles",
          "Dollhouses",
          "Toy Cars",
          "Trains",
          "Animals",
          "Dolls",
          "Rattles",
          "Teethers",
          "Stacking Toys",
          "Shape Sorters",
          "Pull Toys",
          "Push Toys",
          "Musical Instruments",
          "Educational Toys"
        ]
      },
      stuffed_animals: {
        name: "Stuffed Animals",
        icon: "🧸",
        products: [
          "Teddy Bears",
          "Plush Animals",
          "Dolls",
          "Puppets",
          "Stuffed Toys",
          "Character Toys",
          "Baby Toys",
          "Security Blankets",
          "Loveys",
          "Stuffed Characters",
          "Animal Friends",
          "Fantasy Creatures",
          "Wildlife Toys",
          "Farm Animals",
          "Sea Creatures"
        ]
      },
      educational: {
        name: "Educational",
        icon: "📚",
        products: [
          "Learning Toys",
          "Puzzles",
          "Memory Games",
          "Matching Games",
          "Counting Toys",
          "Alphabet Toys",
          "Science Kits",
          "Art Supplies",
          "Craft Kits",
          "Building Sets",
          "Educational Books",
          "Flashcards",
          "Learning Mats",
          "Activity Books",
          "STEM Toys"
        ]
      },
      games: {
        name: "Games",
        icon: "🎲",
        products: [
          "Board Games",
          "Card Games",
          "Puzzle Games",
          "Strategy Games",
          "Word Games",
          "Math Games",
          "Memory Games",
          "Matching Games",
          "Dice Games",
          "Tile Games",
          "Party Games",
          "Family Games",
          "Educational Games",
          "Travel Games",
          "Outdoor Games"
        ]
      }
    }
  },

  // Pet Supplies
  pet_supplies: {
    name: "Pet Supplies",
    icon: "🐕",
    description: "Handmade pet accessories and supplies",
    subcategories: {
      pet_accessories: {
        name: "Pet Accessories",
        icon: "🦮",
        products: [
          "Pet Collars",
          "Leashes",
          "Harnesses",
          "Pet Beds",
          "Pet Toys",
          "Pet Bowls",
          "Pet Clothing",
          "Pet Bandanas",
          "Pet Hats",
          "Pet Sweaters",
          "Pet Coats",
          "Pet Boots",
          "Pet Scarves",
          "Pet Bags",
          "Pet Carriers"
        ]
      },
      pet_care: {
        name: "Pet Care",
        icon: "🐾",
        products: [
          "Pet Grooming Tools",
          "Pet Brushes",
          "Pet Shampoo",
          "Pet Treats",
          "Pet Food",
          "Pet Supplements",
          "Pet Vitamins",
          "Pet Medications",
          "Pet First Aid",
          "Pet Dental Care",
          "Pet Ear Care",
          "Pet Eye Care",
          "Pet Skin Care",
          "Pet Flea Control",
          "Pet Training Aids"
        ]
      },
      pet_home: {
        name: "Pet Home",
        icon: "🏠",
        products: [
          "Pet Houses",
          "Pet Crates",
          "Pet Gates",
          "Pet Ramps",
          "Pet Stairs",
          "Pet Feeders",
          "Pet Waterers",
          "Pet Litter Boxes",
          "Pet Scratching Posts",
          "Pet Perches",
          "Pet Hammocks",
          "Pet Tunnels",
          "Pet Playpens",
          "Pet Kennels",
          "Pet Enclosures"
        ]
      }
    }
  },

  // Seasonal & Holiday
  seasonal_holiday: {
    name: "Seasonal & Holiday",
    icon: "🎄",
    description: "Seasonal decorations and holiday-specific items",
    subcategories: {
      christmas: {
        name: "Christmas",
        icon: "🎄",
        products: [
          "Christmas Ornaments",
          "Christmas Trees",
          "Christmas Wreaths",
          "Christmas Lights",
          "Christmas Stockings",
          "Christmas Cards",
          "Christmas Gifts",
          "Christmas Decorations",
          "Christmas Candles",
          "Christmas Candies",
          "Christmas Cookies",
          "Christmas Sweaters",
          "Christmas Hats",
          "Christmas Socks",
          "Christmas Mugs"
        ]
      },
      halloween: {
        name: "Halloween",
        icon: "🎃",
        products: [
          "Halloween Costumes",
          "Halloween Decorations",
          "Halloween Candies",
          "Halloween Treats",
          "Halloween Candles",
          "Halloween Masks",
          "Halloween Props",
          "Halloween Wreaths",
          "Halloween Signs",
          "Halloween Bags",
          "Halloween Jewelry",
          "Halloween Clothing",
          "Halloween Accessories",
          "Halloween Crafts",
          "Halloween Games"
        ]
      },
      easter: {
        name: "Easter",
        icon: "🐰",
        products: [
          "Easter Eggs",
          "Easter Baskets",
          "Easter Candies",
          "Easter Decorations",
          "Easter Wreaths",
          "Easter Cards",
          "Easter Gifts",
          "Easter Crafts",
          "Easter Jewelry",
          "Easter Clothing",
          "Easter Accessories",
          "Easter Toys",
          "Easter Games",
          "Easter Treats",
          "Easter Bunnies"
        ]
      },
      valentines: {
        name: "Valentine's Day",
        icon: "💝",
        products: [
          "Valentine's Cards",
          "Valentine's Candies",
          "Valentine's Gifts",
          "Valentine's Jewelry",
          "Valentine's Flowers",
          "Valentine's Chocolates",
          "Valentine's Decorations",
          "Valentine's Candles",
          "Valentine's Clothing",
          "Valentine's Accessories",
          "Valentine's Crafts",
          "Valentine's Treats",
          "Valentine's Games",
          "Valentine's Baskets",
          "Valentine's Mugs"
        ]
      }
    }
  },

  // Art & Collectibles
  art_collectibles: {
    name: "Art & Collectibles",
    icon: "🎭",
    description: "Original artwork, prints, and collectible items",
    subcategories: {
      original_art: {
        name: "Original Art",
        icon: "🖼️",
        products: [
          "Paintings",
          "Drawings",
          "Sketches",
          "Watercolors",
          "Oil Paintings",
          "Acrylic Paintings",
          "Mixed Media",
          "Collages",
          "Sculptures",
          "Ceramic Art",
          "Glass Art",
          "Metal Art",
          "Wood Art",
          "Textile Art",
          "Digital Art"
        ]
      },
      prints_reproductions: {
        name: "Prints & Reproductions",
        icon: "🖨️",
        products: [
          "Art Prints",
          "Photography Prints",
          "Limited Editions",
          "Giclee Prints",
          "Screen Prints",
          "Lithographs",
          "Etchings",
          "Engravings",
          "Woodcuts",
          "Linocuts",
          "Monotypes",
          "Digital Prints",
          "Canvas Prints",
          "Framed Prints",
          "Posters"
        ]
      },
      collectibles: {
        name: "Collectibles",
        icon: "🏆",
        products: [
          "Limited Edition Items",
          "Signed Items",
          "Vintage Items",
          "Antique Items",
          "Rare Items",
          "Collector's Items",
          "Memorabilia",
          "Trading Cards",
          "Coins",
          "Stamps",
          "Dolls",
          "Action Figures",
          "Model Cars",
          "Trains",
          "Sports Memorabilia"
        ]
      },
      photography: {
        name: "Photography",
        icon: "📸",
        products: [
          "Photography Prints",
          "Photo Albums",
          "Photo Frames",
          "Photo Books",
          "Photo Cards",
          "Photo Calendars",
          "Photo Mugs",
          "Photo T-shirts",
          "Photo Bags",
          "Photo Jewelry",
          "Photo Ornaments",
          "Photo Magnets",
          "Photo Keychains",
          "Photo Coasters",
          "Photo Wall Art"
        ]
      }
    }
  }
};

// Helper functions for working with product reference data
export const getCategoryIcon = (categoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  return category ? category.icon : "📦";
};

export const getCategoryName = (categoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  return category ? category.name : "Other";
};

export const getSubcategoryIcon = (categoryKey, subcategoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  if (!category || !category.subcategories) return "📦";
  
  const subcategory = category.subcategories[subcategoryKey];
  return subcategory ? subcategory.icon : "📦";
};

export const getSubcategoryName = (categoryKey, subcategoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  if (!category || !category.subcategories) return "Other";
  
  const subcategory = category.subcategories[subcategoryKey];
  return subcategory ? subcategory.name : "Other";
};

export const getProductsBySubcategory = (categoryKey, subcategoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  if (!category || !category.subcategories) return [];
  
  const subcategory = category.subcategories[subcategoryKey];
  return subcategory ? subcategory.products : [];
};

export const getAllCategories = () => {
  return Object.keys(PRODUCT_CATEGORIES).map(key => ({
    key,
    name: PRODUCT_CATEGORIES[key].name,
    icon: PRODUCT_CATEGORIES[key].icon,
    description: PRODUCT_CATEGORIES[key].description
  }));
};

export const getAllSubcategories = () => {
  const subcategories = [];
  
  Object.keys(PRODUCT_CATEGORIES).forEach(categoryKey => {
    const category = PRODUCT_CATEGORIES[categoryKey];
    if (category.subcategories) {
      Object.keys(category.subcategories).forEach(subcategoryKey => {
        const subcategory = category.subcategories[subcategoryKey];
        subcategories.push({
          categoryKey,
          categoryName: category.name,
          categoryIcon: category.icon,
          subcategoryKey,
          subcategoryName: subcategory.name,
          subcategoryIcon: subcategory.icon,
          products: subcategory.products
        });
      });
    }
  });
  
  return subcategories;
};

export const searchProducts = (searchTerm) => {
  const results = [];
  const term = searchTerm.toLowerCase();
  
  Object.keys(PRODUCT_CATEGORIES).forEach(categoryKey => {
    const category = PRODUCT_CATEGORIES[categoryKey];
    if (category.subcategories) {
      Object.keys(category.subcategories).forEach(subcategoryKey => {
        const subcategory = category.subcategories[subcategoryKey];
        const matchingProducts = subcategory.products.filter(product =>
          product.toLowerCase().includes(term) ||
          subcategory.name.toLowerCase().includes(term) ||
          category.name.toLowerCase().includes(term)
        );
        
        if (matchingProducts.length > 0) {
          results.push({
            categoryKey,
            categoryName: category.name,
            categoryIcon: category.icon,
            subcategoryKey,
            subcategoryName: subcategory.name,
            subcategoryIcon: subcategory.icon,
            matchingProducts
          });
        }
      });
    }
  });
  
  return results;
};

export const getPopularProducts = () => {
  // Return a curated list of popular product types
  return [
    "Artisan Bread",
    "Handmade Jewelry",
    "Hand-knitted Scarves",
    "Homemade Jam",
    "Handcrafted Furniture",
    "Natural Soaps",
    "Handmade Candles",
    "Artisan Cheese",
    "Handmade Pottery",
    "Fresh Baked Goods",
    "Handmade Cards",
    "Natural Skincare",
    "Handcrafted Wood Items",
    "Homemade Preserves",
    "Handmade Clothing"
  ];
};

export const getFeaturedCategories = () => {
  // Return categories that are commonly featured
  return [
    "food_beverages",
    "handmade_crafts",
    "clothing_accessories",
    "home_garden",
    "beauty_wellness"
  ];
};
