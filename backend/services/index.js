/**
 * Services Index
 * Aggregates all service modules
 */

const { getDB } = require('../config').database;

// Initialize services with database connection
const initServices = async () => {
  const db = await getDB();
  
  return {
    CommunityService: require('./CommunityService'),
    GeocodingService: require('./GeocodingService'),
    SpotlightService: require('./SpotlightService'),
    WalletService: require('./WalletService'),
    InventoryService: require('./InventoryService'),
    AuthService: require('./AuthService'),
    BaseService: require('./BaseService'),
    PlatformSettingsService: require('./platformSettingsService')
  };
};

// Service factory function
const createService = (ServiceClass) => {
  return async () => {
    const db = await getDB();
    return new ServiceClass(db);
  };
};

// Export service factories
module.exports = {
  initServices,
  createService,
  
  // Service factories
  createCommunityService: createService(require('./CommunityService')),
  createGeocodingService: createService(require('./GeocodingService')),
  createSpotlightService: createService(require('./SpotlightService')),
  createWalletService: createService(require('./WalletService')),
  createInventoryService: createService(require('./InventoryService')),
  createAuthService: createService(require('./AuthService')),
  createPlatformSettingsService: createService(require('./platformSettingsService'))
};
