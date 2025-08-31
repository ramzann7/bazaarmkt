// IP-based geolocation service as fallback when GPS is not available
class IPGeolocationService {
  constructor() {
    this.baseUrl = 'https://ipapi.co';
    this.fallbackUrl = 'https://ipapi.com/json';
  }

  // Get approximate location based on IP address
  async getLocationFromIP() {
    try {
      console.log('🌐 Getting location from IP address...');
      
      // Try primary service first
      const response = await fetch(`${this.baseUrl}/json/`);
      
      if (!response.ok) {
        throw new Error(`IP geolocation failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        const locationData = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          city: data.city || '',
          region: data.region || '',
          country: data.country_name || '',
          display_name: this.formatLocationName(data)
        };
        
        console.log('✅ IP geolocation successful:', locationData);
        return locationData;
      }
      
      throw new Error('Invalid location data from IP service');
    } catch (error) {
      console.error('❌ IP geolocation error:', error);
      
      // Try fallback service
      try {
        console.log('🔄 Trying fallback IP geolocation service...');
        const fallbackResponse = await fetch(this.fallbackUrl);
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData.latitude && fallbackData.longitude) {
            const locationData = {
              latitude: parseFloat(fallbackData.latitude),
              longitude: parseFloat(fallbackData.longitude),
              city: fallbackData.city || '',
              region: fallbackData.region || '',
              country: fallbackData.country_name || '',
              display_name: this.formatLocationName(fallbackData)
            };
            
            console.log('✅ Fallback IP geolocation successful:', locationData);
            return locationData;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback IP geolocation also failed:', fallbackError);
      }
      
      return null;
    }
  }

  // Format location name from IP geolocation data
  formatLocationName(data) {
    const parts = [];
    
    if (data.city) parts.push(data.city);
    if (data.region) parts.push(data.region);
    if (data.country_name) parts.push(data.country_name);
    
    return parts.join(', ') || 'Unknown location';
  }

  // Check if IP geolocation is available
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/json/`, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const ipGeolocationService = new IPGeolocationService();
export default ipGeolocationService;
