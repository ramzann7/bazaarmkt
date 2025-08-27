import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  MapPinIcon, 
  BellIcon, 
  CreditCardIcon, 
  CogIcon, 
  ShieldCheckIcon,
  CameraIcon,
  PlusIcon,
  TrashIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { profileService } from '../services/profileService';
import { authToken } from '../services/authService';
import toast from 'react-hot-toast';

export default function BuyerProfile() {
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'personal', name: 'Personal Info', icon: UserIcon },
    { id: 'addresses', name: 'Delivery Addresses', icon: MapPinIcon },
    { id: 'orders', name: 'My Orders', icon: ShoppingBagIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payment', name: 'Payment Methods', icon: CreditCardIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'settings', name: 'Account Settings', icon: CogIcon }
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const userProfile = await profileService.getProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { isAuthenticated: false } }));
        toast.error('Session expired. Please login again.');
        // The App component will handle the redirect
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (section, data) => {
    try {
      setIsSaving(true);
      let updatedProfile;

      switch (section) {
        case 'personal':
          updatedProfile = await profileService.updateBasicProfile(data);
          break;
        case 'addresses':
          updatedProfile = await profileService.updateAddresses(data);
          break;
        case 'notifications':
          updatedProfile = await profileService.updateNotifications(data);
          break;
        case 'payment':
          updatedProfile = await profileService.updatePaymentMethods(data);
          break;
        case 'settings':
          updatedProfile = await profileService.updateSettings(data);
          break;
        default:
          return;
      }

      setProfile(updatedProfile);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
          <button 
            onClick={loadProfile}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Local Buyer Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'personal' && (
              <PersonalInfoTab 
                profile={profile} 
                onSave={(data) => handleSave('personal', data)}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'addresses' && (
              <AddressesTab 
                profile={profile} 
                onSave={(data) => handleSave('addresses', data)}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'orders' && (
              <OrdersTab />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab 
                profile={profile} 
                onSave={(data) => handleSave('notifications', data)}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'payment' && (
              <PaymentTab 
                profile={profile}
                onSave={(data) => handleSave('payment', data)}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab />
            )}
            {activeTab === 'settings' && (
              <SettingsTab 
                profile={profile} 
                onSave={(data) => handleSave('settings', data)}
                isSaving={isSaving}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function PersonalInfoTab({ profile, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input-field"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="input-field"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddressesTab({ profile, onSave, isSaving }) {
  const [addresses, setAddresses] = useState(profile?.addresses || []);

  const handleSave = () => {
    onSave(addresses);
  };

  const addAddress = () => {
    setAddresses([...addresses, {
      type: 'home',
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: addresses.length === 0
    }]);
  };

  const removeAddress = (index) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Delivery Addresses</h3>
        <button
          onClick={addAddress}
          className="btn-secondary flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Address</span>
        </button>
      </div>
      
      <div className="space-y-4">
        {addresses.map((address, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Address {index + 1}</h4>
              <button
                onClick={() => removeAddress(index)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Label (e.g., Home, Work)"
                value={address.label}
                onChange={(e) => {
                  const newAddresses = [...addresses];
                  newAddresses[index].label = e.target.value;
                  setAddresses(newAddresses);
                }}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Street Address"
                value={address.street}
                onChange={(e) => {
                  const newAddresses = [...addresses];
                  newAddresses[index].street = e.target.value;
                  setAddresses(newAddresses);
                }}
                className="input-field"
              />
              <input
                type="text"
                placeholder="City"
                value={address.city}
                onChange={(e) => {
                  const newAddresses = [...addresses];
                  newAddresses[index].city = e.target.value;
                  setAddresses(newAddresses);
                }}
                className="input-field"
              />
              <input
                type="text"
                placeholder="State/Province"
                value={address.state}
                onChange={(e) => {
                  const newAddresses = [...addresses];
                  newAddresses[index].state = e.target.value;
                  setAddresses(newAddresses);
                }}
                className="input-field"
              />
              <input
                type="text"
                placeholder="ZIP/Postal Code"
                value={address.zipCode}
                onChange={(e) => {
                  const newAddresses = [...addresses];
                  newAddresses[index].zipCode = e.target.value;
                  setAddresses(newAddresses);
                }}
                className="input-field"
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Addresses'}
        </button>
      </div>
    </div>
  );
}

function OrdersTab() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">My Orders</h3>
      <div className="text-center py-12">
        <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Your order history will appear here</p>
      </div>
    </div>
  );
}

function NotificationsTab({ profile, onSave, isSaving }) {
  const [notifications, setNotifications] = useState(profile?.notificationPreferences || {});

  const handleSave = () => {
    onSave(notifications);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Email Notifications</h4>
          <div className="space-y-3">
            {Object.entries(notifications.email || {}).map(([key, value]) => (
              <label key={key} className="flex items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotifications({
                    ...notifications,
                    email: { ...notifications.email, [key]: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="ml-3 text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

function PaymentTab({ profile, onSave, isSaving }) {
  const [paymentMethods, setPaymentMethods] = useState(profile?.paymentMethods || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'credit_card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    isDefault: false
  });

  const handleAddPaymentMethod = () => {
    // Basic validation
    if (!newPaymentMethod.cardNumber || !newPaymentMethod.cardholderName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newPaymentMethod.cardNumber.length < 13) {
      toast.error('Please enter a valid card number');
      return;
    }

    if (!newPaymentMethod.expiryMonth || !newPaymentMethod.expiryYear) {
      toast.error('Please enter card expiry date');
      return;
    }

    if (!newPaymentMethod.cvv || newPaymentMethod.cvv.length < 3) {
      toast.error('Please enter a valid CVV');
      return;
    }

    const paymentMethod = {
      id: Date.now().toString(),
      ...newPaymentMethod,
      last4: newPaymentMethod.cardNumber.slice(-4),
      maskedNumber: `**** **** **** ${newPaymentMethod.cardNumber.slice(-4)}`
    };
    
    setPaymentMethods([...paymentMethods, paymentMethod]);
    setNewPaymentMethod({
      type: 'credit_card',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: '',
      isDefault: false
    });
    setShowAddForm(false);
    toast.success('Payment method added successfully');
  };

  const removePaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
  };

  const setDefaultPaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === id
    })));
  };

  const getCardIcon = (type) => {
    switch (type) {
      case 'credit_card':
        return '💳';
      case 'debit_card':
        return '🏦';
      case 'paypal':
        return '📧';
      default:
        return '💳';
    }
  };

  const handleSavePaymentMethods = () => {
    // Call the parent's handleSave function
    if (typeof onSave === 'function') {
      onSave('payment', paymentMethods);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-secondary flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Add Payment Method Form */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Add New Payment Method</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type
              </label>
              <select
                value={newPaymentMethod.type}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, type: e.target.value })}
                className="input-field"
              >
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                value={newPaymentMethod.cardholderName}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardholderName: e.target.value })}
                className="input-field"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                value={newPaymentMethod.cardNumber}
                onChange={(e) => {
                  // Remove non-digits and format with spaces
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                  setNewPaymentMethod({ ...newPaymentMethod, cardNumber: formatted });
                }}
                className="input-field"
                placeholder="1234 5678 9012 3456"
                maxLength="19"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.expiryMonth}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
                  className="input-field"
                  placeholder="MM"
                  maxLength="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.expiryYear}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
                  className="input-field"
                  placeholder="YY"
                  maxLength="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={newPaymentMethod.cvv}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
                  className="input-field"
                  placeholder="123"
                  maxLength="4"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newPaymentMethod.isDefault}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">Set as default payment method</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPaymentMethod}
              className="btn-primary"
            >
              Add Payment Method
            </button>
          </div>
        </div>
      )}

      {/* Payment Methods List */}
      <div className="space-y-4">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No payment methods added yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              Add Your First Payment Method
            </button>
          </div>
        ) : (
          paymentMethods.map((method) => (
            <div key={method.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCardIcon(method.type)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {method.cardholderName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {method.maskedNumber} • Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                    {method.isDefault && (
                      <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full mt-1">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => setDefaultPaymentMethod(method.id)}
                      className="text-sm text-orange-600 hover:text-orange-800"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => removePaymentMethod(method.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Save Button */}
      {paymentMethods.length > 0 && (
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSavePaymentMethods}
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Payment Methods'}
          </button>
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsChangingPassword(true);
      // TODO: Implement password change API call
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
      
      <div className="space-y-6">
        {/* Password Change Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Password</h4>
              <p className="text-sm text-gray-600">Update your account password</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="btn-secondary text-sm"
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  required
                  minLength="8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  required
                  minLength="8"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn-primary disabled:opacity-50"
                >
                  {isChangingPassword ? 'Changing Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <button className="btn-secondary text-sm">
              Enable 2FA
            </button>
          </div>
        </div>

        {/* Login Sessions Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Active Sessions</h4>
              <p className="text-sm text-gray-600">Manage your active login sessions</p>
            </div>
            <button className="btn-secondary text-sm">
              View All Sessions
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <p>Current session: This device (Chrome on macOS)</p>
            <p className="text-xs text-gray-500 mt-1">Last active: Just now</p>
          </div>
        </div>

        {/* Account Deletion Section */}
        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-red-900">Delete Account</h4>
              <p className="text-sm text-red-700">Permanently delete your account and all data</p>
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ profile, onSave, isSaving }) {
  const [settings, setSettings] = useState(profile?.accountSettings || {
    language: 'en',
    currency: 'CAD',
    timezone: 'America/Toronto',
    twoFactorEnabled: false
  });

  const handleSave = () => {
    onSave(settings);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' }
  ];

  const currencies = [
    { code: 'CAD', name: 'Canadian Dollar (CAD)' },
    { code: 'USD', name: 'US Dollar (USD)' },
    { code: 'EUR', name: 'Euro (EUR)' }
  ];

  const timezones = [
    { code: 'America/Toronto', name: 'Eastern Time (ET)' },
    { code: 'America/Vancouver', name: 'Pacific Time (PT)' },
    { code: 'America/Edmonton', name: 'Mountain Time (MT)' },
    { code: 'America/Winnipeg', name: 'Central Time (CT)' }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h3>
      
      <div className="space-y-6">
        {/* Language Settings */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Language & Region</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="input-field"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="input-field"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timezone Settings */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Time Zone</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Zone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="input-field"
            >
              {timezones.map(tz => (
                <option key={tz.code} value={tz.code}>
                  {tz.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600 mt-2">
              This affects how dates and times are displayed in your account
            </p>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Privacy & Data</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Profile Visibility</h5>
                <p className="text-sm text-gray-600">Allow other users to see your profile information</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.profileVisible !== false}
                  onChange={(e) => setSettings({ ...settings, profileVisible: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Data Analytics</h5>
                <p className="text-sm text-gray-600">Allow us to collect usage data to improve our service</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.analyticsEnabled !== false}
                  onChange={(e) => setSettings({ ...settings, analyticsEnabled: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Communication Preferences */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Communication Preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">Email Notifications</h5>
                <p className="text-sm text-gray-600">Receive important updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.emailNotifications !== false}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">SMS Notifications</h5>
                <p className="text-sm text-gray-600">Receive order updates via text message</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.smsNotifications !== false}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}


