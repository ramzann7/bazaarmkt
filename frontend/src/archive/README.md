# Archive Directory

This directory contains components and services that are not currently being used in the application but are kept for reference or potential future use.

## Components Archive

### Backup Files
- `ArtisanDetails.jsx.backup` - Backup version of ArtisanDetails component
- `Cart.jsx.backup` - Backup version of Cart component  
- `ProducerProfile.jsx.backup` - Backup version of ProducerProfile component

### Broken Files
- `ArtisanDetails.jsx.broken` - Broken version of ArtisanDetails component that needs fixing

### Test Files
- `ImagePreviewTest.jsx` - Test component for image preview functionality

### Unused Components
- `MapView.jsx` - Map view component (not currently integrated)
- `ProducerProfile.jsx` - Producer profile component (replaced by ArtisanProfile)
- `ArtisanProfile.jsx` - Large artisan profile component (replaced by ArtisanDetails)
- `restaurants.jsx` - Restaurants listing component (not currently used)
- `BuyerProfile.jsx` - Buyer profile component (functionality moved to Profile)
- `CartSidebar.jsx` - Cart sidebar component (functionality integrated into Cart)

## Services Archive

### Unused Services
- `enhancedSearchService.js` - Enhanced search functionality (not currently integrated)
- `onboardingService.js` - User onboarding service (not currently used)

## Notes

- These files are kept for reference and potential future development
- Before using any archived component, ensure it's compatible with the current codebase
- Some components may need updates to work with current dependencies and patterns
- Consider removing these files entirely if they're no longer needed for future development

## Restoration

To restore a component:
1. Move it back to the appropriate directory (`components/` or `services/`)
2. Update imports and dependencies as needed
3. Test thoroughly before deploying
