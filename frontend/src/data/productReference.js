// Product Reference Data for Artisans
// Updated category structure with priority order

export const PRODUCT_CATEGORIES = {
  // Handmade & Crafts - Priority 1
  handmade_crafts: {
    name: "Handmade & Crafts",
    icon: "🎨",
    description: "Unique handcrafted items and artistic creations",
    subcategories: {
      jewelry_accessories: {
        name: "Jewelry & Accessories",
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
          "Planters",
          "Sculptures",
          "Tiles",
          "Dinnerware",
          "Tea Sets",
          "Decorative Objects",
          "Kitchenware",
          "Garden Pots",
          "Art Pieces",
          "Functional Ceramics"
        ]
      },
      leather_goods: {
        name: "Leather Goods",
        icon: "👜",
        products: [
          "Handbags",
          "Wallets",
          "Belts",
          "Watch Straps",
          "Phone Cases",
          "Laptop Sleeves",
          "Backpacks",
          "Tote Bags",
          "Purses",
          "Keychains",
          "Leather Journals",
          "Gloves",
          "Boots",
          "Shoes",
          "Accessories"
        ]
      },
      textiles_fiber: {
        name: "Textiles & Fiber Arts",
        icon: "🧶",
        products: [
          "Handwoven Textiles",
          "Knitted Items",
          "Crocheted Goods",
          "Embroidered Pieces",
          "Quilts",
          "Blankets",
          "Scarves",
          "Shawls",
          "Pillows",
          "Table Linens",
          "Rugs",
          "Tapestries",
          "Clothing",
          "Bags",
          "Home Decor"
        ]
      },
      woodworking_furniture: {
        name: "Woodworking & Furniture",
        icon: "🪵",
        products: [
          "Handcrafted Furniture",
          "Cutting Boards",
          "Bowls",
          "Spoons",
          "Utensils",
          "Picture Frames",
          "Shelving",
          "Tables",
          "Chairs",
          "Storage Boxes",
          "Decorative Items",
          "Kitchen Tools",
          "Garden Items",
          "Toys",
          "Art Pieces"
        ]
      },
      paper_stationery: {
        name: "Paper & Stationery",
        icon: "📝",
        products: [
          "Handmade Paper",
          "Notebooks",
          "Journals",
          "Greeting Cards",
          "Invitations",
          "Bookmarks",
          "Art Prints",
          "Calendars",
          "Planners",
          "Gift Tags",
          "Wrapping Paper",
          "Scrapbooks",
          "Photo Albums",
          "Art Supplies",
          "Office Supplies"
        ]
      }
    }
  },

  // Art & Collectibles - Priority 2
  art_collectibles: {
    name: "Art & Collectibles",
    icon: "🎭",
    description: "Original artwork and collectible items",
    subcategories: {
      original_art: {
        name: "Original Art",
        icon: "🖼️",
        products: [
          "Paintings",
          "Drawings",
          "Sketches",
          "Mixed Media",
          "Digital Art",
          "Sculptures",
          "Installations",
          "Murals",
          "Portraits",
          "Landscapes",
          "Abstract Art",
          "Contemporary Art",
          "Traditional Art",
          "Modern Art",
          "Custom Commissions"
        ]
      },
      prints_reproductions: {
        name: "Prints & Reproductions",
        icon: "🖨️",
        products: [
          "Art Prints",
          "Giclee Prints",
          "Screen Prints",
          "Lithographs",
          "Posters",
          "Canvas Prints",
          "Framed Prints",
          "Digital Downloads",
          "Limited Editions",
          "Signed Prints",
          "Vintage Reproductions",
          "Photography Prints",
          "Illustration Prints",
          "Archival Prints",
          "Custom Prints"
        ]
      },
      collectibles: {
        name: "Collectibles",
        icon: "🏆",
        products: [
          "Vintage Items",
          "Antiques",
          "Rare Finds",
          "Limited Editions",
          "Signed Items",
          "Memorabilia",
          "Vintage Toys",
          "Collectible Figures",
          "Trading Cards",
          "Coins",
          "Stamps",
          "Books",
          "Vinyl Records",
          "Vintage Clothing",
          "Artifacts"
        ]
      },
      photography: {
        name: "Photography",
        icon: "📸",
        products: [
          "Portrait Photography",
          "Landscape Photography",
          "Event Photography",
          "Wedding Photography",
          "Commercial Photography",
          "Fine Art Photography",
          "Photo Prints",
          "Digital Downloads",
          "Photo Books",
          "Custom Sessions",
          "Stock Photography",
          "Aerial Photography",
          "Macro Photography",
          "Street Photography",
          "Nature Photography"
        ]
      }
    }
  },

  // Home & Garden - Priority 3
  home_garden: {
    name: "Home & Garden",
    icon: "🏠",
    description: "Beautiful items for your home and garden",
    subcategories: {
      home_decor: {
        name: "Home Decor",
        icon: "🕯️",
        products: [
          "Wall Art",
          "Decorative Objects",
          "Candles",
          "Vases",
          "Mirrors",
          "Clocks",
          "Lamps",
          "Rugs",
          "Throw Pillows",
          "Curtains",
          "Wall Hangings",
          "Sculptures",
          "Ornaments",
          "Seasonal Decor",
          "Artisan Crafts"
        ]
      },
      kitchen_dining: {
        name: "Kitchen & Dining",
        icon: "🍽️",
        products: [
          "Cutting Boards",
          "Kitchen Utensils",
          "Dinnerware",
          "Glassware",
          "Serveware",
          "Kitchen Towels",
          "Aprons",
          "Pot Holders",
          "Table Linens",
          "Placemats",
          "Napkins",
          "Kitchen Storage",
          "Cookware",
          "Bakeware",
          "Kitchen Gadgets"
        ]
      },
      outdoor_garden: {
        name: "Outdoor & Garden",
        icon: "🌱",
        products: [
          "Garden Planters",
          "Outdoor Decor",
          "Garden Tools",
          "Plant Markers",
          "Bird Feeders",
          "Garden Art",
          "Outdoor Furniture",
          "Garden Lighting",
          "Water Features",
          "Garden Signs",
          "Plant Stands",
          "Garden Ornaments",
          "Outdoor Cushions",
          "Garden Storage",
          "Seasonal Items"
        ]
      },
      bath_bedroom: {
        name: "Bath & Bedroom",
        icon: "🛁",
        products: [
          "Bath Towels",
          "Bath Mats",
          "Shower Curtains",
          "Bathroom Accessories",
          "Bedding",
          "Pillowcases",
          "Throw Blankets",
          "Bedroom Decor",
          "Storage Baskets",
          "Laundry Bags",
          "Bathroom Art",
          "Soap Dishes",
          "Toothbrush Holders",
          "Bathroom Rugs",
          "Bedroom Lighting"
        ]
      },
      plants_flowers: {
        name: "Plants & Flowers",
        icon: "🌸",
        products: [
          "Live Plants",
          "Plant Pots",
          "Plant Hangers",
          "Seed Packets",
          "Plant Care Kits",
          "Dried Flowers",
          "Pressed Flowers",
          "Herb Gardens",
          "Succulents",
          "Indoor Plants",
          "Outdoor Plants",
          "Plant Fertilizer",
          "Garden Seeds",
          "Plant Markers",
          "Plant Art"
        ]
      }
    }
  },

  // Food & Preserves - Priority 4
  food_preserves: {
    name: "Food & Preserves",
    icon: "🍯",
    description: "Delicious homemade food and preserves",
    subcategories: {
      baked_goods_sweets: {
        name: "Baked Goods & Sweets",
        icon: "🧁",
        products: [
          "Artisan Bread",
          "Sourdough Bread",
          "Pastries",
          "Cookies",
          "Cakes",
          "Cupcakes",
          "Muffins",
          "Pies",
          "Tarts",
          "Brownies",
          "Donuts",
          "Bagels",
          "Pretzels",
          "Scones",
          "Cheesecake"
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

  // Beauty & Wellness - Priority 5
  beauty_wellness: {
    name: "Beauty & Wellness",
    icon: "🧴",
    description: "Natural beauty and wellness products",
    subcategories: {
      skincare_body: {
        name: "Skincare & Body Care",
        icon: "🧼",
        products: [
          "Soap",
          "Body Lotion",
          "Body Butter",
          "Scrubs",
          "Face Cream",
          "Serums",
          "Toners",
          "Masks",
          "Bath Bombs",
          "Shower Gel",
          "Body Oil",
          "Hand Cream",
          "Foot Cream",
          "Lip Balm",
          "Natural Cosmetics"
        ]
      },
      haircare: {
        name: "Haircare",
        icon: "💇",
        products: [
          "Shampoo",
          "Conditioner",
          "Hair Oil",
          "Hair Masks",
          "Hair Serums",
          "Dry Shampoo",
          "Hair Styling Products",
          "Natural Hair Dye",
          "Hair Accessories",
          "Combs",
          "Brushes",
          "Hair Clips",
          "Headbands",
          "Hair Ties",
          "Hair Care Kits"
        ]
      },
      aromatherapy_fragrances: {
        name: "Aromatherapy & Fragrances",
        icon: "🕯️",
        products: [
          "Essential Oils",
          "Candles",
          "Incense",
          "Room Sprays",
          "Perfumes",
          "Body Sprays",
          "Diffusers",
          "Aromatherapy Kits",
          "Scented Sachets",
          "Potpourri",
          "Herbal Blends",
          "Natural Fragrances",
          "Scented Candles",
          "Aromatherapy Jewelry",
          "Relaxation Products"
        ]
      },
      herbal_products: {
        name: "Herbal Products",
        icon: "🌿",
        products: [
          "Herbal Teas",
          "Tinctures",
          "Herbal Supplements",
          "Herbal Salves",
          "Herbal Balms",
          "Herbal Tinctures",
          "Medicinal Herbs",
          "Herbal Powders",
          "Herbal Capsules",
          "Herbal Extracts",
          "Herbal Oils",
          "Herbal Bath Products",
          "Herbal Skincare",
          "Herbal Remedies",
          "Wellness Kits"
        ]
      }
    }
  },

  // Children & Pets - Priority 6
  children_pets: {
    name: "Children & Pets",
    icon: "🧸",
    description: "Special items for children and pets",
    subcategories: {
      toys_games: {
        name: "Toys & Games",
        icon: "🎲",
        products: [
          "Handmade Toys",
          "Wooden Toys",
          "Educational Toys",
          "Puzzles",
          "Board Games",
          "Card Games",
          "Stuffed Animals",
          "Dolls",
          "Action Figures",
          "Building Blocks",
          "Art Supplies",
          "Musical Instruments",
          "Outdoor Toys",
          "Learning Toys",
          "Custom Toys"
        ]
      },
      baby_nursery: {
        name: "Baby & Nursery",
        icon: "👶",
        products: [
          "Baby Blankets",
          "Bibs",
          "Burp Cloths",
          "Baby Clothes",
          "Nursery Decor",
          "Mobiles",
          "Baby Books",
          "Teething Toys",
          "Baby Carriers",
          "Diaper Bags",
          "Baby Quilts",
          "Nursery Art",
          "Baby Accessories",
          "Safety Items",
          "Baby Care Products"
        ]
      },
      pet_accessories: {
        name: "Pet Accessories & Care",
        icon: "🐕",
        products: [
          "Pet Toys",
          "Pet Beds",
          "Pet Collars",
          "Pet Leashes",
          "Pet Bowls",
          "Pet Treats",
          "Pet Grooming",
          "Pet Clothing",
          "Pet Carriers",
          "Pet ID Tags",
          "Pet Training",
          "Pet Health",
          "Pet Food",
          "Pet Accessories",
          "Custom Pet Items"
        ]
      }
    }
  }
};

// Helper functions to get categories and subcategories
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
        subcategories.push({
          id: subcategoryKey,
          name: category.subcategories[subcategoryKey].name,
          icon: category.subcategories[subcategoryKey].icon,
          categoryKey: categoryKey
        });
      });
    }
  });
  return subcategories;
};

// Helper function to get category name by key
export const getCategoryName = (categoryKey) => {
  if (!categoryKey || categoryKey === 'all') return 'All Products';
  const category = PRODUCT_CATEGORIES[categoryKey];
  return category ? category.name : categoryKey;
};

// Helper function to get subcategory name by key
export const getSubcategoryName = (subcategoryKey, categoryKey) => {
  if (!subcategoryKey || !categoryKey) return subcategoryKey;
  const category = PRODUCT_CATEGORIES[categoryKey];
  if (!category || !category.subcategories) return subcategoryKey;
  const subcategory = category.subcategories[subcategoryKey];
  return subcategory ? subcategory.name : subcategoryKey;
};

// Popular product names for search suggestions
export const getFeaturedCategories = () => {
  return [
    { key: 'handmade_crafts', name: 'Handmade Crafts', icon: '🎨' },
    { key: 'food_preserves', name: 'Food & Preserves', icon: '🍯' },
    { key: 'home_garden', name: 'Home & Garden', icon: '🏠' }
  ];
};

export const getPopularProducts = () => [
  "Handmade Jewelry",
  "Artisan Bread",
  "Ceramic Mugs",
  "Leather Bags",
  "Handwoven Textiles",
  "Wooden Bowls",
  "Handmade Soap",
  "Art Prints",
  "Garden Planters",
  "Homemade Jam"
];