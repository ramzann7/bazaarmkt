import React from 'react';
import { PRODUCT_CATEGORIES, getFeaturedCategories } from '../data/productReference';

export default function SimpleTest() {
  console.log('SimpleTest: PRODUCT_CATEGORIES', PRODUCT_CATEGORIES);
  console.log('SimpleTest: getFeaturedCategories', getFeaturedCategories);
  
  const featured = getFeaturedCategories();
  console.log('SimpleTest: featured categories', featured);
  
  return (
    <div className="p-8">
      <h1>Simple Test</h1>
      <p>PRODUCT_CATEGORIES loaded: {PRODUCT_CATEGORIES ? 'Yes' : 'No'}</p>
      <p>getFeaturedCategories loaded: {getFeaturedCategories ? 'Yes' : 'No'}</p>
      <p>Featured categories: {featured.join(', ')}</p>
      <p>Categories count: {Object.keys(PRODUCT_CATEGORIES).length}</p>
    </div>
  );
}
