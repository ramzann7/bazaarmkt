import React, { useState } from 'react';
import {
  ShareIcon,
  XMarkIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SocialShare = ({ 
  artisan, 
  shareUrl, 
  shareTitle, 
  shareDescription,
  className = "" 
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate share URLs for different platforms
  const generateShareUrls = () => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    const encodedDescription = encodeURIComponent(shareDescription);
    const hashtags = encodeURIComponent('#ArtisanShop #LocalArtisans #Handmade #SupportLocal');

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=ArtisanShop,LocalArtisans,Handmade,SupportLocal`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDescription}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${shareUrl}`,
      sms: `sms:?body=${encodedTitle}%20${shareUrl}`,
      instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing, will open Instagram app
      copy: shareUrl
    };
  };

  const shareUrls = generateShareUrls();

  const handleShare = (platform, url) => {
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        toast.success('Shop link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        toast.error('Failed to copy link');
      });
      return;
    }

    if (platform === 'instagram') {
      // Instagram doesn't support direct URL sharing, so we'll copy the link and open Instagram
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('Link copied! Open Instagram to share.');
        window.open(url, '_blank');
      });
      return;
    }

    // Open sharing window
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      'share',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    toast.success(`Opening ${platform} to share!`);
  };

  const shareButtons = [
    {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      platform: 'facebook'
    },
    {
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600',
      platform: 'twitter'
    },
    {
      name: 'Instagram',
      icon: '📷',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      platform: 'instagram'
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      platform: 'linkedin'
    },
    {
      name: 'Pinterest',
      icon: '📌',
      color: 'bg-red-600 hover:bg-red-700',
      platform: 'pinterest'
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      platform: 'whatsapp'
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-blue-500 hover:bg-blue-600',
      platform: 'telegram'
    },
    {
      name: 'Reddit',
      icon: '🤖',
      color: 'bg-orange-600 hover:bg-orange-700',
      platform: 'reddit'
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'bg-gray-600 hover:bg-gray-700',
      platform: 'email'
    },
    {
      name: 'SMS',
      icon: '📱',
      color: 'bg-green-600 hover:bg-green-700',
      platform: 'sms'
    }
  ];

  return (
    <>
      {/* Share Button */}
      <button
        onClick={() => setShowShareModal(true)}
        className={`inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium ${className}`}
      >
        <ShareIcon className="w-5 h-5 mr-2" />
        Share Shop
      </button>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Share {artisan?.artisanName || artisan?.businessName || 'Artisan Shop'}</h3>
                <p className="text-sm text-gray-600 mt-1">Help spread the word about this amazing artisan!</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Shop Preview */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-primary-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🏪</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{shareTitle}</h4>
                  <p className="text-sm text-gray-600 mt-1">{shareDescription}</p>
                  <div className="flex items-center mt-2 text-xs text-gray-500">
                    <LinkIcon className="w-4 h-4 mr-1" />
                    <span className="truncate">{shareUrl}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex-1 mr-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Share this link:</label>
                  <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                    <LinkIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="flex-1 text-sm text-gray-600 truncate">{shareUrl}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleShare('copy', shareUrls.copy)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Media Buttons */}
            <div className="p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Share on social media:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {shareButtons.map((button) => (
                  <button
                    key={button.platform}
                    onClick={() => handleShare(button.platform, shareUrls[button.platform])}
                    className={`flex flex-col items-center p-4 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 ${button.color}`}
                    title={`Share on ${button.name}`}
                  >
                    <span className="text-2xl mb-2">{button.icon}</span>
                    <span className="text-xs">{button.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-blue-500 text-lg">💡</span>
                  </div>
                  <div className="ml-3">
                    <h5 className="text-sm font-medium text-blue-900">Pro tip:</h5>
                    <p className="text-sm text-blue-700 mt-1">
                      When sharing on Instagram, copy the link first, then create a story or post and paste the link in your bio or story.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SocialShare;
