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
        (artisan.description && artisan.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        artisan.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(artisan => artisan.type === selectedType);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'verified') {
        filtered = filtered.filter(artisan => artisan.isVerified === true);
      } else if (selectedStatus === 'unverified') {
        filtered = filtered.filter(artisan => artisan.isVerified === false);
      } else {
        filtered = filtered.filter(artisan => 
          (artisan.isActive ? 'active' : 'inactive') === selectedStatus
        );
      }
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
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
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

        {/* Artisans Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artisan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredArtisans.map((artisan) => (
                  <tr key={artisan._id} className="hover:bg-gray-50">
                    {/* Artisan Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {artisan.photos && artisan.photos.length > 0 ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={artisan.photos[0]}
                              alt={artisan.artisanName}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-lg">🏪</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium text-gray-900">
                              {artisan.artisanName}
                            </div>
                            {artisan.isVerified && (
                              <div className="flex items-center bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs font-medium">
                                <CheckIcon className="w-3 h-3 mr-1" />
                                Verified
                              </div>
                            )}
                            {!artisan.isActive && (
                              <div className="flex items-center bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-xs font-medium">
                                <XMarkIcon className="w-3 h-3 mr-1" />
                                Inactive
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {artisan.description || 'No description'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Owner Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {artisan.user?.firstName} {artisan.user?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {artisan.user?.email || artisan.email || 'No email'}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(artisan.type)}`}>
                        {artisan.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {artisan.address?.city || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {artisan.address?.state || 'N/A'}
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span className="text-sm font-medium text-gray-900">
                          {artisan.rating?.average ? artisan.rating.average.toFixed(1) : '0.0'}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({artisan.rating?.count || 0})
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusChange(artisan._id, artisan.isActive ? 'inactive' : 'active')}
                        className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full hover:opacity-80 transition-all duration-200 cursor-pointer ${getStatusBadge(artisan.isActive ? 'active' : 'inactive')}`}
                        title={`Click to ${artisan.isActive ? 'deactivate' : 'activate'} this artisan`}
                      >
                        {artisan.isActive ? (
                          <>
                            <CheckIcon className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XMarkIcon className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Verification */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleVerificationToggle(artisan._id, artisan.isVerified)}
                        className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full hover:opacity-80 transition-all duration-200 cursor-pointer ${getVerificationBadge(artisan.isVerified)}`}
                        title={`Click to ${artisan.isVerified ? 'unverify' : 'verify'} this artisan`}
                      >
                        {artisan.isVerified ? (
                          <>
                            <CheckIcon className="w-3 h-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <XMarkIcon className="w-3 h-3 mr-1" />
                            Unverified
                          </>
                        )}
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(artisan.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewArtisan(artisan)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-6 text-sm text-gray-600">
          Showing {filteredArtisans.length} of {artisans.length} artisans
        </div>
      </div>

      {/* Artisan Modal */}
      {showArtisanModal && selectedArtisan && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Artisan Details</h3>
                <button
                  onClick={() => {
                    setShowArtisanModal(false);
                    setSelectedArtisan(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="text-sm text-gray-900">{selectedArtisan.artisanName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900">{selectedArtisan.description || 'No description provided'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Owner</label>
                    <p className="text-sm text-gray-900">
                      {selectedArtisan.user?.firstName} {selectedArtisan.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedArtisan.user?.email || selectedArtisan.email || 'No email'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(selectedArtisan.type)}`}>
                      {selectedArtisan.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="text-sm text-gray-900">
                      {selectedArtisan.address?.street && `${selectedArtisan.address.street}, `}
                      {selectedArtisan.address?.city && `${selectedArtisan.address.city}, `}
                      {selectedArtisan.address?.state} {selectedArtisan.address?.zipCode}
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Information</label>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-900 flex items-center">
                        <PhoneIcon className="w-4 h-4 mr-2" />
                        {selectedArtisan.contactInfo?.phone || selectedArtisan.phone || 'No phone'}
                      </p>
                      <p className="text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="w-4 h-4 mr-2" />
                        {selectedArtisan.contactInfo?.email || selectedArtisan.email || 'No email'}
                      </p>
                      {selectedArtisan.contactInfo?.website && (
                        <p className="text-sm text-gray-900 flex items-center">
                          <GlobeAltIcon className="w-4 h-4 mr-2" />
                          <a href={selectedArtisan.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {selectedArtisan.contactInfo.website}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status & Verification</label>
                    <div className="flex space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedArtisan.isActive ? 'active' : 'inactive')}`}>
                        {selectedArtisan.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVerificationBadge(selectedArtisan.isVerified)}`}>
                        {selectedArtisan.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rating & Reviews</label>
                    <div className="flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedArtisan.rating?.average ? selectedArtisan.rating.average.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({selectedArtisan.rating?.count || 0} reviews)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created Date</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedArtisan.createdAt)}</p>
                  </div>
                  
                  {selectedArtisan.specialties && selectedArtisan.specialties.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specialties</label>
                      <div className="flex flex-wrap gap-1">
                        {selectedArtisan.specialties.map((specialty, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
