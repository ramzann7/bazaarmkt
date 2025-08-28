import React from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

const ImagePreviewTest = () => {
  const testImage = "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80";

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-8">Image Preview Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Test 1: Basic Image Preview */}
        <div className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-lg bg-gray-100">
            <img
              src={testImage}
              alt="Test Image"
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 ease-in-out flex items-center justify-center z-20">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out transform scale-75 group-hover:scale-100">
                <div className="bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
                  <EyeIcon className="w-8 h-8 text-gray-800" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-medium text-gray-900">Test Image Preview</h3>
            <p className="text-sm text-gray-500">Hover to see preview effect</p>
          </div>
        </div>

        {/* Test 2: Different Background */}
        <div className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-lg bg-gray-100">
            <img
              src={testImage}
              alt="Test Image"
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 ease-in-out flex items-center justify-center z-20">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
                <EyeIcon className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-medium text-gray-900">Blue Overlay Test</h3>
            <p className="text-sm text-gray-500">Different overlay color</p>
          </div>
        </div>

        {/* Test 3: Simple White Icon */}
        <div className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-lg bg-gray-100">
            <img
              src={testImage}
              alt="Test Image"
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 ease-in-out flex items-center justify-center z-20">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out">
                <EyeIcon className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-medium text-gray-900">Simple White Icon</h3>
            <p className="text-sm text-gray-500">Basic white icon on dark overlay</p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-white rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Instructions:</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li>Hover over each image to see the preview effect</li>
          <li>The first image should show a white icon in a rounded background</li>
          <li>The second image should show a blue overlay with white icon</li>
          <li>The third image should show a simple white icon on dark overlay</li>
          <li>All should have smooth transitions and scale effects</li>
        </ul>
      </div>
    </div>
  );
};

export default ImagePreviewTest;
