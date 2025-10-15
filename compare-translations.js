#!/usr/bin/env node

/**
 * Compare English and French translation files to find missing translations
 */

const fs = require('fs');
const path = require('path');

function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], currentKey));
      } else {
        keys.push(currentKey);
      }
    }
  }
  
  return keys;
}

function compareTranslations() {
  const enPath = path.join(__dirname, 'frontend/src/locales/en.json');
  const frPath = path.join(__dirname, 'frontend/src/locales/fr-CA.json');
  
  console.log('🔍 Comparing translation files...\n');
  
  const enTranslations = loadJSON(enPath);
  const frTranslations = loadJSON(frPath);
  
  if (!enTranslations || !frTranslations) {
    console.error('❌ Failed to load translation files');
    return;
  }
  
  const enKeys = getAllKeys(enTranslations);
  const frKeys = getAllKeys(frTranslations);
  
  console.log(`📊 Translation Statistics:`);
  console.log(`   English keys: ${enKeys.length}`);
  console.log(`   French keys: ${frKeys.length}`);
  
  // Find missing French translations
  const missingInFrench = enKeys.filter(key => !frKeys.includes(key));
  
  // Find extra French translations (not in English)
  const extraInFrench = frKeys.filter(key => !enKeys.includes(key));
  
  console.log(`\n🚨 Missing French Translations (${missingInFrench.length}):`);
  if (missingInFrench.length === 0) {
    console.log('   ✅ All English keys have French translations!');
  } else {
    missingInFrench.forEach(key => {
      console.log(`   - ${key}`);
    });
  }
  
  console.log(`\n⚠️  Extra French Keys (${extraInFrench.length}):`);
  if (extraInFrench.length === 0) {
    console.log('   ✅ No extra French keys found!');
  } else {
    extraInFrench.forEach(key => {
      console.log(`   - ${key}`);
    });
  }
  
  const completionRate = ((frKeys.length - extraInFrench.length) / enKeys.length * 100).toFixed(1);
  console.log(`\n📈 Translation Completion Rate: ${completionRate}%`);
  
  if (missingInFrench.length === 0 && extraInFrench.length === 0) {
    console.log('\n🎉 Translation files are perfectly synchronized!');
  }
  
  return {
    missingInFrench,
    extraInFrench,
    completionRate
  };
}

// Run the comparison
if (require.main === module) {
  compareTranslations();
}

module.exports = { compareTranslations, getAllKeys };
