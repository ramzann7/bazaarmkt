import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  UserGroupIcon,
  StarIcon,
  HeartIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Community() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const navigate = useNavigate();

  // Sample community events data
  const [events] = useState([
    {
      id: 1,
      title: "Spring Farmers Market Opening",
      description: "Join us for the grand opening of our spring farmers market! Meet local artisans, sample fresh produce, and enjoy live music. Perfect for families and food enthusiasts.",
      date: "2024-03-15",
      time: "10:00 AM - 4:00 PM",
      location: "Downtown Plaza",
      address: "123 Main Street, Springfield, IL",
      category: "market",
      organizer: "Springfield Farmers Market Association",
      organizerImage: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop",
      attendees: 150,
      maxAttendees: 200,
      price: "Free",
      images: [
        "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop"
      ],
      featured: true,
      tags: ["Family-friendly", "Live Music", "Food Sampling"]
    },
    {
      id: 2,
      title: "Artisan Bread Making Workshop",
      description: "Learn the art of sourdough bread making from master baker Marie Dubois. This hands-on workshop covers everything from starter maintenance to shaping and baking.",
      date: "2024-03-20",
      time: "2:00 PM - 6:00 PM",
      location: "Rosewood Artisan Bakery",
      address: "890 Baker Street, Springfield, IL",
      category: "workshop",
      organizer: "Marie Dubois",
      organizerImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      attendees: 12,
      maxAttendees: 15,
      price: "$75",
      images: [
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&h=300&fit=crop"
      ],
      featured: true,
      tags: ["Hands-on", "Take-home Bread", "Expert Instruction"]
    },
    {
      id: 3,
      title: "Cheese Tasting & Pairing Event",
      description: "Discover the world of artisanal cheese with expert cheese maker Claire Tremblay. Sample aged cheddars, fresh mozzarella, and learn perfect wine pairings.",
      date: "2024-03-25",
      time: "7:00 PM - 9:00 PM",
      location: "La Fromagerie du Village",
      address: "147 Cheese Court, Springfield, IL",
      category: "tasting",
      organizer: "Claire Tremblay",
      organizerImage: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop",
      attendees: 25,
      maxAttendees: 30,
      price: "$45",
      images: [
        "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop"
      ],
      featured: false,
      tags: ["Wine Pairing", "Expert Guide", "Premium Experience"]
    },
    {
      id: 4,
      title: "Honey Harvest Festival",
      description: "Experience the sweet world of beekeeping! Watch live honey extraction, learn about bee conservation, and taste different honey varieties from local hives.",
      date: "2024-04-05",
      time: "11:00 AM - 5:00 PM",
      location: "Sweet Honey Haven",
      address: "567 Bee Lane, Springfield, IL",
      category: "festival",
      organizer: "Sophie Tremblay",
      organizerImage: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop",
      attendees: 80,
      maxAttendees: 100,
      price: "$15",
      images: [
        "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop"
      ],
      featured: false,
      tags: ["Educational", "Family-friendly", "Live Demonstrations"]
    },
    {
      id: 5,
      title: "Organic Farm Tour & Lunch",
      description: "Tour Green Valley Farm and learn about sustainable farming practices. Enjoy a farm-to-table lunch featuring fresh, organic ingredients grown on-site.",
      date: "2024-04-10",
      time: "10:00 AM - 2:00 PM",
      location: "Green Valley Farm",
      address: "1234 Farm Road, Springfield, IL",
      category: "tour",
      organizer: "Green Valley Farm",
      organizerImage: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
      attendees: 18,
      maxAttendees: 25,
      price: "$35",
      images: [
        "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop"
      ],
      featured: false,
      tags: ["Educational", "Farm-to-Table", "Outdoor Activity"]
    },
    {
      id: 6,
      title: "Chocolate Making Masterclass",
      description: "Create your own artisanal chocolates with master chocolatier Isabelle Moreau. Learn tempering techniques and create beautiful truffles to take home.",
      date: "2024-04-15",
      time: "1:00 PM - 5:00 PM",
      location: "Chocolate Dreams",
      address: "369 Chocolate Street, Springfield, IL",
      category: "workshop",
      organizer: "Isabelle Moreau",
      organizerImage: "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=300&fit=crop",
      attendees: 8,
      maxAttendees: 12,
      price: "$95",
      images: [
        "https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=300&fit=crop"
      ],
      featured: false,
      tags: ["Hands-on", "Take-home Chocolates", "Premium Experience"]
    },
    {
      id: 7,
      title: "Wine Tasting at Vineyard Valley",
      description: "Experience the finest local wines with guided tastings and vineyard tours. Learn about the winemaking process and enjoy stunning vineyard views.",
      date: "2024-04-20",
      time: "3:00 PM - 7:00 PM",
      location: "Vineyard Valley",
      address: "321 Grape Road, Springfield, IL",
      category: "tasting",
      organizer: "Vineyard Valley",
      organizerImage: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop",
      attendees: 35,
      maxAttendees: 40,
      price: "$55",
      images: [
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop"
      ],
      featured: false,
      tags: ["Vineyard Tour", "Expert Guide", "Scenic Views"]
    },
    {
      id: 8,
      title: "Herb Garden Workshop",
      description: "Learn to grow and use fresh herbs with expert gardener Marc Dubois. Plant your own herb garden and learn culinary and medicinal uses.",
      date: "2024-04-25",
      time: "9:00 AM - 12:00 PM",
      location: "Herb Garden Delights",
      address: "456 Herb Way, Springfield, IL",
      category: "workshop",
      organizer: "Marc Dubois",
      organizerImage: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
      attendees: 15,
      maxAttendees: 20,
      price: "$40",
      images: [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop"
      ],
      featured: false,
      tags: ["Hands-on", "Take-home Plants", "Educational"]
    }
  ]);

  const categories = [
    { id: 'all', name: 'All Events', icon: '🎉' },
    { id: 'market', name: 'Farmers Markets', icon: '🛒' },
    { id: 'workshop', name: 'Workshops', icon: '🔨' },
    { id: 'tasting', name: 'Tastings', icon: '🍷' },
    { id: 'festival', name: 'Festivals', icon: '🎪' },
    { id: 'tour', name: 'Farm Tours', icon: '🚜' }
  ];

  const filteredEvents = events.filter(event => 
    selectedCategory === 'all' || event.category === selectedCategory
  );

  const featuredEvents = events.filter(event => event.featured);
  const upcomingEvents = filteredEvents.filter(event => new Date(event.date) > new Date());

  const toggleFavorite = (eventId) => {
    setFavoriteEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
    toast.success(favoriteEvents.includes(eventId) ? 'Removed from favorites' : 'Added to favorites');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDaysUntil = (dateString) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderEventCard = (event) => {
    const daysUntil = getDaysUntil(event.date);
    const isFavorite = favoriteEvents.includes(event.id);
    const isFull = event.attendees >= event.maxAttendees;

    return (
      <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 group">
        <div className="relative">
          {/* Event Image */}
          <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-t-xl overflow-hidden">
            <img
              src={event.images[0]}
              alt={event.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Favorite Button */}
            <button
              onClick={() => toggleFavorite(event.id)}
              className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors duration-300"
            >
              {isFavorite ? (
                <HeartIconSolid className="w-5 h-5 text-rose-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Featured Badge */}
            {event.featured && (
              <div className="absolute top-3 left-3 bg-amber-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                Featured
              </div>
            )}

            {/* Photo count indicator if multiple photos */}
            {event.images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                +{event.images.length - 1} more
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          {/* Event Title and Price */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-600 transition-colors duration-300">
              {event.title}
            </h3>
            <span className="text-lg font-bold text-amber-600">
              {event.price}
            </span>
          </div>

          {/* Event Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {event.description}
          </p>

          {/* Event Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-gray-500 text-sm">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <span>{formatDate(event.date)}</span>
              {daysUntil > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  ({daysUntil} days away)
                </span>
              )}
            </div>
            
            <div className="flex items-center text-gray-500 text-sm">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span>{event.time}</span>
            </div>
            
            <div className="flex items-center text-gray-500 text-sm">
              <MapPinIcon className="w-4 h-4 mr-2" />
              <span>{event.location}</span>
            </div>
          </div>

          {/* Organizer */}
          <div className="flex items-center mb-4">
            <img
              src={event.organizerImage}
              alt={event.organizer}
              className="w-8 h-8 rounded-full object-cover mr-3"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{event.organizer}</p>
              <p className="text-xs text-gray-500">Organizer</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {event.tags.map((tag, index) => (
              <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Attendance and Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-500 text-sm">
              <UserGroupIcon className="w-4 h-4 mr-1" />
              <span>{event.attendees}/{event.maxAttendees} attending</span>
            </div>
            
            <button
              onClick={() => navigate(`/event/${event.id}`)}
              disabled={isFull}
              className={`bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isFull ? 'Event Full' : 'Learn More'}
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Community Dashboard Header */}
      <div className="bg-white shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community Events</h1>
              <p className="text-gray-600 mt-1">
                Connect with local artisans and discover upcoming events
              </p>
            </div>
            
            {/* Community Stats */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{events.length}</div>
                <div className="text-sm text-gray-600">Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{events.reduce((sum, event) => sum + event.attendees, 0)}</div>
                <div className="text-sm text-gray-600">Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{events.filter(e => e.featured).length}</div>
                <div className="text-sm text-gray-600">Featured</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Events Dashboard */}
        {featuredEvents.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <SparklesIcon className="w-8 h-8 text-amber-600 mr-3" />
                <h2 className="text-3xl font-bold text-gray-900">Featured Events</h2>
              </div>
              <div className="text-sm text-gray-600">
                {featuredEvents.length} featured events
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map(renderEventCard)}
            </div>
          </div>
        )}

        {/* Horizontal Scrollable Category Filter */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="relative">
            {/* Horizontal Scrollable Container */}
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`group flex-shrink-0 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 min-w-[140px] ${
                    selectedCategory === category.id
                      ? 'ring-2 ring-amber-500 bg-amber-50'
                      : 'hover:border-amber-200'
                  }`}
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform text-center">{category.icon}</div>
                  <h3 className="font-medium text-gray-900 group-hover:text-amber-600 transition-colors text-sm text-center">
                    {category.name}
                  </h3>
                </button>
              ))}
            </div>
            
            {/* Gradient Overlay for Scroll Indication */}
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-amber-50 to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* All Events Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCategory === 'all' ? 'All Events' : `${categories.find(c => c.id === selectedCategory)?.name}`}
            </h2>
            <div className="text-sm text-gray-600">
              {upcomingEvents.length} upcoming events
            </div>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map(renderEventCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-6">
                Try selecting a different category or check back later for new events
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                View All Events
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
