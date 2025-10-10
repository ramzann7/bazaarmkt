import React, { useState } from 'react';
import PageHeader from '../common/PageHeader';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * HeaderComparisonDemo
 * 
 * This component shows the OLD way vs NEW way of creating page headers
 * Use this to visually compare and test mobile responsiveness
 * 
 * To use:
 * 1. Add to your router: <Route path="/test-headers" element={<HeaderComparisonDemo />} />
 * 2. Navigate to /test-headers
 * 3. Resize browser window to see responsive behavior
 */
export default function HeaderComparisonDemo() {
  const [showOld, setShowOld] = useState(true);
  const [showNew, setShowNew] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Controls */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Page Header Comparison Tool</h2>
          <p className="text-gray-600 mb-4">
            Compare the OLD vs NEW header implementations. Resize your browser window or use Chrome DevTools device emulation to test mobile responsiveness.
          </p>
          
          <div className="flex space-x-4 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showOld}
                onChange={(e) => setShowOld(e.target.checked)}
                className="rounded"
              />
              <span>Show OLD Header</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showNew}
                onChange={(e) => setShowNew(e.target.checked)}
                className="rounded"
              />
              <span>Show NEW Header</span>
            </label>
          </div>

          {/* Screen size indicator */}
          <div className="text-sm text-gray-500">
            <span className="font-medium">Current breakpoint: </span>
            <span className="sm:hidden">Mobile (< 640px)</span>
            <span className="hidden sm:inline md:hidden">Tablet (640-768px)</span>
            <span className="hidden md:inline lg:hidden">Desktop (768-1024px)</span>
            <span className="hidden lg:inline">Large Desktop (> 1024px)</span>
          </div>
        </div>

        {/* OLD Header Example */}
        {showOld && (
          <div className="mb-8">
            <div className="mb-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
              ❌ OLD WAY - Not Mobile Optimized
            </div>
            
            <div className="border-2 border-red-300 rounded-lg overflow-hidden">
              {/* This is how headers currently look */}
              <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        Product Management
                      </h1>
                      <p className="text-gray-600 mt-1">
                        Manage products, set featured items, and control listings
                      </p>
                    </div>
                    <button className="text-gray-600 hover:text-gray-900">
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Show problems on mobile */}
              <div className="bg-red-50 p-4 text-sm">
                <p className="font-medium text-red-900 mb-2">Problems on Mobile:</p>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  <li>Title is 48px (text-3xl) - too large for mobile screens</li>
                  <li>Back button can get cut off or overlap</li>
                  <li>Fixed padding doesn't adapt well</li>
                  <li>Horizontal layout breaks on narrow screens</li>
                  <li>No touch target optimization</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* NEW Header Example */}
        {showNew && (
          <div className="mb-8">
            <div className="mb-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              ✅ NEW WAY - Mobile Optimized
            </div>
            
            <div className="border-2 border-green-300 rounded-lg overflow-hidden">
              <PageHeader
                title="Product Management"
                subtitle="Manage products, set featured items, and control listings"
                backTo="/dashboard"
                backLabel="Back to Dashboard"
                actions={
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Add Product
                  </button>
                }
              />

              {/* Show benefits */}
              <div className="bg-green-50 p-4 text-sm">
                <p className="font-medium text-green-900 mb-2">Benefits:</p>
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  <li>Responsive text: 20px (mobile) → 24px (tablet) → 30px (desktop)</li>
                  <li>Back button stacks properly on mobile</li>
                  <li>Adaptive padding: 12px (mobile) → 24px (desktop)</li>
                  <li>Vertical layout on mobile, horizontal on desktop</li>
                  <li>44px minimum touch targets</li>
                  <li>No CSS conflicts with rest of app</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* More Examples */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">More Examples</h2>

          {/* Example 1: Simple Header */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Simple Header (Title Only)</h3>
            <PageHeader title="Dashboard" />
          </div>

          {/* Example 2: With Subtitle */}
          <div>
            <h3 className="text-lg font-semibold mb-3">With Subtitle</h3>
            <PageHeader
              title="My Orders"
              subtitle="View and manage your order history"
            />
          </div>

          {/* Example 3: With Back Button */}
          <div>
            <h3 className="text-lg font-semibold mb-3">With Back Button</h3>
            <PageHeader
              title="Profile Settings"
              subtitle="Update your personal information"
              backTo="/"
              backLabel="Back"
            />
          </div>

          {/* Example 4: With Actions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">With Multiple Actions</h3>
            <PageHeader
              title="Artisan Shop"
              subtitle="Manage your products and inventory"
              backTo="/dashboard"
              actions={
                <div className="flex flex-col sm:flex-row gap-2">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                    Preview
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              }
            />
          </div>

          {/* Example 5: Long Title */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Long Title Test</h3>
            <PageHeader
              title="Administrative Product Inventory Management and Analytics Dashboard"
              subtitle="This is a very long subtitle to test how the component handles text wrapping on mobile devices with limited screen space"
              backTo="/admin"
              backLabel="Back to Admin"
              actions={
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  Action
                </button>
              }
            />
          </div>

          {/* Example 6: No Border */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Without Border</h3>
            <PageHeader
              title="Transparent Header"
              subtitle="No border or shadow"
              border={false}
            />
          </div>

          {/* Example 7: Gray Background */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Gray Background</h3>
            <PageHeader
              title="Alternative Style"
              subtitle="Gray background variant"
              background="gray"
            />
          </div>
        </div>

        {/* Testing Guide */}
        <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">📱 Testing Instructions</h2>
          
          <div className="space-y-4 text-blue-900">
            <div>
              <h3 className="font-semibold mb-2">Chrome DevTools Testing:</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Press F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)</li>
                <li>Click the device toolbar icon or press Cmd+Shift+M</li>
                <li>Select different devices: iPhone SE, iPhone 12, iPad, etc.</li>
                <li>Test both portrait and landscape orientations</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Manual Window Resize:</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Make your browser window narrower (drag from the right edge)</li>
                <li>Watch how headers adapt at different widths</li>
                <li>Look for: text wrapping, button positions, spacing changes</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Key Breakpoints to Test:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>320px</strong> - Smallest mobile (iPhone SE)</li>
                <li><strong>375px</strong> - Common mobile (iPhone X/11/12)</li>
                <li><strong>640px</strong> - Small tablet / large phone</li>
                <li><strong>768px</strong> - Tablet (iPad portrait)</li>
                <li><strong>1024px</strong> - Desktop</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What to Check:</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>✅ Text is readable at all sizes</li>
                <li>✅ No horizontal scrolling</li>
                <li>✅ Buttons are easily tappable (44px minimum)</li>
                <li>✅ Content doesn't overlap</li>
                <li>✅ Spacing looks natural</li>
                <li>✅ Back button is always accessible</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="mt-8 bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-purple-900 mb-4">🚀 Implementation Guide</h2>
          
          <div className="space-y-4 text-purple-900">
            <p className="font-medium">To implement in your pages:</p>
            
            <div className="bg-white rounded-lg p-4 font-mono text-sm">
              <div className="text-gray-500 mb-2">// 1. Import the component</div>
              <div className="text-purple-600">import PageHeader from './common/PageHeader';</div>
              
              <div className="text-gray-500 mt-4 mb-2">// 2. Replace your old header code with:</div>
              <div className="text-green-600">
                &lt;PageHeader<br/>
                &nbsp;&nbsp;title="Your Page Title"<br/>
                &nbsp;&nbsp;subtitle="Optional description"<br/>
                &nbsp;&nbsp;backTo="/previous-page"<br/>
                &nbsp;&nbsp;backLabel="Back"<br/>
                &nbsp;&nbsp;actions=&#123;&lt;button&gt;Action&lt;/button&gt;&#125;<br/>
                /&gt;
              </div>
            </div>

            <p className="text-sm">
              <strong>Pro tip:</strong> Start with a non-critical page like AdminProductManagement to test, then roll out to other pages once confirmed working.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

