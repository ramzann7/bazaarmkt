// Simplified Product Reference Data for Testing
export const PRODUCT_CATEGORIES = {
  food_beverages: {
    name: "Food & Beverages",
    icon: "🍽️",
    description: "Fresh, homemade, and artisanal food products",
    subcategories: {
      baked_goods: {
        name: "Baked Goods",
        icon: "🥖",
        products: ["Artisan Bread", "Sourdough Bread", "Croissants", "Pastries", "Cakes"]
      },
      dairy_products: {
        name: "Dairy Products",
        icon: "🥛",
        products: ["Artisan Cheese", "Fresh Milk", "Yogurt", "Butter", "Cream"]
      }
    }
  },
  handmade_crafts: {
    name: "Handmade Crafts",
    icon: "🎨",
    description: "Unique handcrafted items and artistic creations",
    subcategories: {
      jewelry: {
        name: "Jewelry",
        icon: "💍",
        products: ["Handmade Necklaces", "Earrings", "Bracelets", "Rings", "Anklets"]
      },
      pottery_ceramics: {
        name: "Pottery & Ceramics",
        icon: "🏺",
        products: ["Hand-thrown Pottery", "Ceramic Mugs", "Bowls", "Plates", "Vases"]
      }
    }
  },
  clothing_accessories: {
    name: "Clothing & Accessories",
    icon: "👕",
    description: "Handmade clothing, accessories, and fashion items",
    subcategories: {
      clothing: {
        name: "Clothing",
        icon: "👗",
        products: ["Handmade Dresses", "Tops", "Skirts", "Pants", "Jackets"]
      },
      accessories: {
        name: "Accessories",
        icon: "👜",
        products: ["Handbags", "Purses", "Wallets", "Belts", "Scarves"]
      }
    }
  }
};

// Helper functions
export const getCategoryIcon = (categoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  return category ? category.icon : "📦";
};

export const getCategoryName = (categoryKey) => {
  const category = PRODUCT_CATEGORIES[categoryKey];
  return category ? category.name : "Other";
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

export const getFeaturedCategories = () => {
  return [
    "food_beverages",
    "handmade_crafts",
    "clothing_accessories"
  ];
};

export const getPopularProducts = () => {
  return [
    "Artisan Bread",
    "Handmade Jewelry",
    "Hand-knitted Scarves",
    "Homemade Jam",
    "Handcrafted Furniture"
  ];
};
