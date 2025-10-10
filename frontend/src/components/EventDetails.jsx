import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getImageUrl, handleImageError } from '../utils/imageUtils.js';
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  UserGroupIcon,
  HeartIcon,
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Sample event data (in a real app, this would come from an API)
  const sampleEvents = [
    {
      id: 1,
      title: "Spring Farmers Market Opening",
      description: "Join us for the grand opening of our spring farmers market! Meet local artisans, sample fresh produce, and enjoy live music. Perfect for families and food enthusiasts. This event celebrates the beginning of the growing season and brings together our vibrant community of local producers and consumers.",
      longDescription: "The Spring Farmers Market Opening is our biggest event of the year, marking the start of the growing season. This year, we're excited to feature over 50 local vendors including farmers, bakers, cheese makers, and artisans. The event will include live music performances, cooking demonstrations, and activities for children. Come early to get the best selection of fresh, seasonal produce and artisanal products.",
      date: "2024-03-15",
      time: "10:00 AM - 4:00 PM",
      location: "Downtown Plaza",
      address: "123 Main Street, Springfield, IL",
      category: "market",
      organizer: "Springfield Farmers Market Association",
      organizerImage: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop",
      organizerPhone: "(217) 555-0123",
      organizerEmail: "info@springfieldfarmersmarket.com",
      attendees: 150,
      maxAttendees: 200,
      price: "Free",
      images: [
        "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=400&h=300&fit=crop"
      ],
      featured: true,
      tags: ["Family-friendly", "Live Music", "Food Sampling"],
      highlights: [
        "Over 50 local vendors",
        "Live music performances",
        "Cooking demonstrations",
        "Children's activities",
        "Fresh seasonal produce",
        "Artisanal products"
      ]
    },
    {
      id: 2,
      title: "Artisan Bread Making Workshop",
      description: "Learn the art of sourdough bread making from master baker Marie Dubois. This hands-on workshop covers everything from starter maintenance to shaping and baking.",
      longDescription: "This comprehensive workshop is perfect for both beginners and experienced bakers. You'll learn the fundamentals of sourdough bread making, including how to create and maintain a sourdough starter, proper dough handling techniques, shaping methods, and baking strategies. Each participant will take home their own sourdough starter and a freshly baked loaf of bread. All materials and ingredients are provided.",
      date: "2024-03-20",
      time: "2:00 PM - 6:00 PM",
      location: "Rosewood Artisan Bakery",
      address: "890 Baker Street, Springfield, IL",
      category: "workshop",
      organizer: "Marie Dubois",
      organizerImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
      organizerPhone: "(217) 555-0789",
      organizerEmail: "marie@rosewoodbakery.com",
      attendees: 12,
      maxAttendees: 15,
      price: "$75",
      images: [
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&h=300&fit=crop"
      ],
      featured: true,
      tags: ["Hands-on", "Take-home Bread", "Expert Instruction"],
      highlights: [
        "Learn sourdough starter creation",
        "Hands-on dough handling",
        "Professional shaping techniques",
        "Take home your own starter",
        "Freshly baked bread included",
        "All materials provided"
      ]
    }
  ];

  useEffect(() => {
    // Find the event by ID
    const foundEvent = sampleEvents.find(e => e.id === parseInt(id));
    if (foundEvent) {
      setEvent(foundEvent);
    } else {
      toast.error('Event not found');
      navigate('/community');
    }
  }, [id, navigate]);

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
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

  // Use imported getImageUrl from imageUtils.js

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  const daysUntil = getDaysUntil(event.date);
  const isFull = event.attendees >= event.maxAttendees;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/community')}
            className="flex items-center text-gray-600 hover:text-primary transition-colors duration-300"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Community
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Images */}
            <div className="relative mb-8">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-2xl overflow-hidden">
                <img
                  src={getImageUrl(event.images[currentImageIndex], { width: 800, height: 384, quality: 85 })}
                  alt={event.title}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center" style={{ display: 'none' }}>
                  <span className="text-lg">📅</span>
                </div>
                
                {/* Favorite Button */}
                <button
                  onClick={toggleFavorite}
                  className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors duration-300"
                >
                  {isFavorite ? (
                    <HeartIconSolid className="w-6 h-6 text-rose-500" />
                  ) : (
                    <HeartIcon className="w-6 h-6 text-gray-600" />
                  )}
                </button>

                {/* Featured Badge */}
                {event.featured && (
                  <div className="absolute top-4 left-4 bg-primary-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                    Featured Event
                  </div>
                )}
              </div>

              {/* Image Navigation */}
              {event.images.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {event.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                        index === currentImageIndex ? 'bg-primary' : 'bg-stone-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Event Title and Price */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-stone-900 mb-2">{event.title}</h1>
                <p className="text-gray-600">{event.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{event.price}</div>
                <div className="text-sm text-stone-500">per person</div>
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-stone-900 mb-4">Event Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <div className="font-medium">{formatDate(event.date)}</div>
                    {daysUntil > 0 && (
                      <div className="text-sm text-primary">({daysUntil} days away)</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="w-5 h-5 mr-3 text-primary" />
                  <div className="font-medium">{event.time}</div>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <MapPinIcon className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <div className="font-medium">{event.location}</div>
                    <div className="text-sm">{event.address}</div>
                  </div>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <UserGroupIcon className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <div className="font-medium">{event.attendees}/{event.maxAttendees} attending</div>
                    <div className="text-sm">{isFull ? 'Event is full' : 'Spots available'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Long Description */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-stone-900 mb-4">About This Event</h2>
              <p className="text-gray-600 leading-relaxed">{event.longDescription}</p>
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-stone-900 mb-4">What to Expect</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {event.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-center text-gray-600">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Organizer Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Organizer</h3>
              <div className="flex items-center mb-4">
                <img
                  src={event.organizerImage}
                  alt={event.organizer}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <p className="font-medium text-stone-900">{event.organizer}</p>
                  <p className="text-sm text-stone-500">{event.category}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  <span className="text-sm">{event.organizerPhone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  <span className="text-sm">{event.organizerEmail}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Event Tags</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <span key={index} className="badge-premium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <button
                disabled={isFull}
                className={`w-full btn-primary mb-3 ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isFull ? 'Event Full' : 'Register for Event'}
              </button>
              
              <button className="w-full btn-secondary">
                Contact Organizer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
