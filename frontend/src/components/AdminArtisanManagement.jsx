import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon, 
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { authToken, getProfile } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';

export default function AdminArtisanManagement() {
  const [artisans, setArtisans] = useState([]);
  const [filteredArtisans, setFilteredArtisans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedArtisan, setSelectedArtisan] = useState(null);
  const [showArtisanModal, setShowArtisanModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (artisans.length > 0) {
      applyFiltersAndSort();
    }
  }, [artisans, searchQuery, selectedType, selectedStatus, sortBy, sortOrder]);

  const checkAdminAccess = async () => {
    try {
      const token = authToken.getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const profile = await getProfile();
      if (profile.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      loadArtisans();
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error('Authentication error');
      navigate('/login');
    }
  };

  const loadArtisans = async () => {
    try {
      setIsLoading(true);
      const artisansData = await adminService.getArtisans();
      setArtisans(artisansData);
    } catch (error) {
      console.error('Error loading artisans:', error);
      toast.error('Failed to load artisans');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...artisans];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(artisan =>
        artisan.artisanName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.user?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.user?.lastName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(artisan => artisan.type === selectedType);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(artisan => 
        (artisan.isActive ? 'active' : 'inactive') === selectedStatus
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredArtisans(filtered);
  };

  const handleStatusChange = async (artisanId, newStatus) => {
    try {
      const isActive = newStatus === 'active';
      await adminService.updateArtisanStatus(artisanId, isActive);
      setArtisans(prev => prev.map(artisan => 
        artisan._id === artisanId 
          ? { ...artisan, isActive }
          : artisan
      ));
      toast.success(`Artisan ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating artisan status:', error);
      toast.error('Failed to update artisan status');
    }
  };

  const handleVerificationToggle = async (artisanId, currentVerified) => {
    try {
      const newVerifiedStatus = !currentVerified;
      await adminService.updateArtisanVerification(artisanId, newVerifiedStatus);
      setArtisans(prev => prev.map(artisan => 
        artisan._id === artisanId 
          ? { ...artisan, isVerified: newVerifiedStatus }
          : artisan
      ));
      toast.success(`Artisan ${newVerifiedStatus ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast.error('Failed to update verification status');
    }
  };

  const handleViewArtisan = (artisan) => {
    setSelectedArtisan(artisan);
    setShowArtisanModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeBadge = (type) => {
    const badges = {
      bakery: 'bg-orange-100 text-orange-800',
      farm: 'bg-green-100 text-green-800',
      dairy: 'bg-blue-100 text-blue-800',
      coffee: 'bg-brown-100 text-brown-800'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getVerificationBadge = (isVerified) => {
    return isVerified 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const types = ['bakery', 'farm', 'dairy', 'coffee', 'chocolate', 'cheese'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading artisans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Artisan Management</h1>
              <p className="text-gray-600 mt-1">
                View all artisans and their business information
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search artisans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="createdAt">Created Date</option>
              <option value="artisanName">Name</option>
              <option value="rating">Rating</option>
              <option value="productCount">Products</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? (
                <ArrowUpIcon className="w-5 h-5" />
              ) : (
                <ArrowDownIcon className="w-5 h-5" />
              )}
              <span className="ml-2">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
            </button>
          </div>
        </div>

        {/* Artisans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtisans.map((artisan) => (
            <div key={artisan._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Artisan Image */}
              <div className="relative h-48 bg-gray-100">
                {artisan.photos && artisan.photos.length > 0 ? (
                  <img
                    src={artisan.photos[0]}
                    alt={artisan.artisanName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl">🏪</span>
                  </div>
                )}
                
                {/* Verification Badge */}
                {artisan.isVerified && (
                  <div className="absolute top-2 left-2">
                    <CheckIcon className="w-5 h-5 text-blue-500" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(artisan.isActive ? 'active' : 'inactive')}`}>
                    {artisan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Artisan Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {artisan.artisanName}
                </h3>
                
                <p className="text-sm text-gray-600 mb-2">
                  by {artisan.user?.firstName} {artisan.user?.lastName}
                </p>
                
                <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                  {artisan.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeBadge(artisan.type)}`}>
                    {artisan.type}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">{artisan.rating?.average || 0}</span>
                    <span className="text-xs text-gray-500">({artisan.rating?.count || 0})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    Products: N/A
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(artisan.createdAt)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <MapPinIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {artisan.address?.city}, {artisan.address?.state}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleViewArtisan(artisan)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    View Details
                  </button>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerificationToggle(artisan._id, artisan.isVerified)}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getVerificationBadge(artisan.isVerified)} hover:opacity-80`}
                    >
                      {artisan.isVerified ? 'Verified' : 'Unverified'}
                    </button>
                    
                    <select
                      value={artisan.isActive ? 'active' : 'inactive'}
                      onChange={(e) => handleStatusChange(artisan._id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(artisan.isActive ? 'active' : 'inactive')} border-0 focus:ring-2 focus:ring-purple-500`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Results Summary */}
        <div className="mt-6 text-sm text-gray-600">
          Showing {filteredArtisans.length} of {artisans.length} artisans
        </div>
      </div>

      {/* Artisan Modal */}
      {showArtisanModal && selectedArtisan && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Artisan Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <p className="text-sm text-gray-900">{selectedArtisan.artisanName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{selectedArtisan.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner</label>
                  <p className="text-sm text-gray-900">
                    {selectedArtisan.user?.firstName} {selectedArtisan.user?.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeBadge(selectedArtisan.type)}`}>
                    {selectedArtisan.type}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-sm text-gray-900">
                    {selectedArtisan.address?.street}<br />
                    {selectedArtisan.address?.city}, {selectedArtisan.address?.state} {selectedArtisan.address?.zipCode}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact</label>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900 flex items-center">
                      <PhoneIcon className="w-4 h-4 mr-2" />
                      {selectedArtisan.contactInfo?.phone || selectedArtisan.phone}
                    </p>
                    <p className="text-sm text-gray-900 flex items-center">
                      <EnvelopeIcon className="w-4 h-4 mr-2" />
                      {selectedArtisan.contactInfo?.email || selectedArtisan.email}
                    </p>
                    {selectedArtisan.contactInfo?.website && (
                      <p className="text-sm text-gray-900 flex items-center">
                        <GlobeAltIcon className="w-4 h-4 mr-2" />
                        {selectedArtisan.contactInfo.website}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(selectedArtisan.isActive ? 'active' : 'inactive')}`}>
                    {selectedArtisan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Verification</label>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getVerificationBadge(selectedArtisan.isVerified)}`}>
                    {selectedArtisan.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stats</label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Products:</span> N/A
                    </div>
                    <div>
                      <span className="text-gray-600">Rating:</span> {selectedArtisan.rating?.average || 0} ({selectedArtisan.rating?.count || 0} reviews)
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedArtisan.createdAt)}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowArtisanModal(false);
                    setSelectedArtisan(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
