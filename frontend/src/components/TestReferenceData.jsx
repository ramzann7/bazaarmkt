import React, { useEffect, useState } from 'react';
import { 
  PRODUCT_CATEGORIES, 
  getAllCategories, 
  getAllSubcategories, 
  getFeaturedCategories,
  getPopularProducts 
} from '../data/productReference';

export default function TestReferenceData() {
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    const runTests = () => {
      const results = {};
      
      try {
        // Test 1: Check if PRODUCT_CATEGORIES is loaded
        results.categoriesLoaded = !!PRODUCT_CATEGORIES;
        results.categoriesCount = Object.keys(PRODUCT_CATEGORIES).length;
        
        // Test 2: Test getAllCategories
        const categories = getAllCategories();
        results.getAllCategories = categories.length > 0;
        results.categoriesData = categories.slice(0, 3); // First 3 categories
        
        // Test 3: Test getAllSubcategories
        const subcategories = getAllSubcategories();
        results.getAllSubcategories = subcategories.length > 0;
        results.subcategoriesData = subcategories.slice(0, 3); // First 3 subcategories
        
        // Test 4: Test getFeaturedCategories
        const featured = getFeaturedCategories();
        results.getFeaturedCategories = featured.length > 0;
        results.featuredData = featured;
        
        // Test 5: Test getPopularProducts
        const popular = getPopularProducts();
        results.getPopularProducts = popular.length > 0;
        results.popularData = popular.slice(0, 5); // First 5 products
        
        console.log('Reference data test results:', results);
        setTestResults(results);
        
      } catch (error) {
        console.error('Error testing reference data:', error);
        results.error = error.message;
        setTestResults(results);
      }
    };

    runTests();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reference Data Test Results</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          
          {testResults.error ? (
            <div className="text-red-600">
              <strong>Error:</strong> {testResults.error}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <strong>Categories Loaded:</strong> {testResults.categoriesLoaded ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Categories Count:</strong> {testResults.categoriesCount || 0}
              </div>
              <div>
                <strong>getAllCategories Working:</strong> {testResults.getAllCategories ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>getAllSubcategories Working:</strong> {testResults.getAllSubcategories ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>getFeaturedCategories Working:</strong> {testResults.getFeaturedCategories ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>getPopularProducts Working:</strong> {testResults.getPopularProducts ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          )}
        </div>

        {testResults.categoriesData && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Sample Categories</h2>
            <div className="space-y-2">
              {testResults.categoriesData.map((cat, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-gray-500">({cat.key})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.subcategoriesData && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Sample Subcategories</h2>
            <div className="space-y-2">
              {testResults.subcategoriesData.map((sub, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-xl">{sub.subcategoryIcon}</span>
                  <span>{sub.subcategoryName}</span>
                  <span className="text-gray-500">({sub.categoryName})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.featuredData && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Featured Categories</h2>
            <div className="space-y-2">
              {testResults.featuredData.map((key, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-2xl">{PRODUCT_CATEGORIES[key]?.icon}</span>
                  <span>{PRODUCT_CATEGORIES[key]?.name}</span>
                  <span className="text-gray-500">({key})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.popularData && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Popular Products</h2>
            <div className="space-y-2">
              {testResults.popularData.map((product, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span>•</span>
                  <span>{product}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
