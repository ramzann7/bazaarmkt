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
    const shareText = `${shareTitle} - ${shareDescription}`;

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(shareText)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodedUrl}&hashtags=ArtisanShop,LocalArtisans,Handmade`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(shareDescription + '\n\nVisit: ' + shareUrl)}`,
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
      // Instagram doesn't support direct URL sharing, so we'll copy the link for users to paste
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('Link copied! Paste in Instagram bio or DMs.', { duration: 4000 });
      });
      return;
    }

    if (platform === 'email') {
      // Email links don't need a popup window
      window.location.href = url;
      return;
    }

    // Open sharing window for other platforms
    const width = 600;
    const height = 500;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      'share',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    setShowShareModal(false);
    toast.success(`Opening ${platform} to share!`);
  };

  const shareButtons = [
    {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      platform: 'facebook',
      description: 'Share on your timeline with rich preview'
    },
    {
      name: 'Instagram',
      icon: '📷',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      platform: 'instagram',
      description: 'Copy link to share in bio or DMs'
    },
    {
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600',
      platform: 'twitter',
      description: 'Tweet with hashtags & link'
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      platform: 'whatsapp',
      description: 'Send to contacts or groups'
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'bg-gray-600 hover:bg-gray-700',
      platform: 'email',
      description: 'Send via your email client'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {shareButtons.map((button) => (
                  <button
                    key={button.platform}
                    onClick={() => handleShare(button.platform, shareUrls[button.platform])}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 ${button.color}`}
                    title={button.description}
                  >
                    <span className="text-3xl mb-2">{button.icon}</span>
                    <span className="text-sm font-semibold">{button.name}</span>
                    <span className="text-[10px] mt-1 opacity-90 text-center">{button.description}</span>
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
