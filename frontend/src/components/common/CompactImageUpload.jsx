import React from 'react';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

/**
 * Compact Image Upload Component
 * 
 * A mobile-friendly image upload component with preview,
 * drag & drop support, and collapsible tips.
 * 
 * @param {string} preview - Image preview URL
 * @param {Function} onUpload - Callback when file is selected
 * @param {Function} onRemove - Callback when image is removed
 * @param {string} label - Label for the image (default: "Image")
 * @param {number} maxSizeMB - Maximum file size in MB (default: 5)
 * @param {Array} acceptedFormats - Accepted image formats (default: ['jpg', 'jpeg', 'png', 'webp'])
 */
export default function CompactImageUpload({ 
  preview, 
  onUpload, 
  onRemove, 
  label = "Image",
  maxSizeMB = 5,
  acceptedFormats = ['jpg', 'jpeg', 'png', 'webp']
}) {
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onUpload({ target: { files: [file] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-3">
      {preview ? (
        /* Preview State - Compact */
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <img 
            src={preview} 
            alt={`${label} Preview`}
            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-300 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Business Image</p>
            <p className="text-xs text-gray-500 mt-1">Image uploaded successfully</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Remove image"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Upload State */
        <label 
          className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <PhotoIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm sm:text-base font-medium text-gray-700">
            Upload {label}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tap to browse or drag and drop
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </label>
      )}
      
      {/* Collapsible Image Tips */}
      <details className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg">
        <summary className="cursor-pointer font-medium p-3 hover:bg-blue-100 rounded-lg transition-colors">
          📸 Image tips
        </summary>
        <div className="px-3 pb-3">
          <ul className="mt-2 space-y-1.5 ml-4 list-disc">
            <li>Minimum 400x400 pixels recommended</li>
            <li>Maximum file size: {maxSizeMB}MB</li>
            <li>Accepted formats: {acceptedFormats.join(', ').toUpperCase()}</li>
            <li>Use good lighting and clear focus</li>
            <li>Square or landscape images work best</li>
          </ul>
        </div>
      </details>

      {!preview && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="text-xs text-amber-800">
            <strong>Image Recommended:</strong> Adding a business image helps customers recognize your brand and builds trust.
          </div>
        </div>
      )}
    </div>
  );
}

