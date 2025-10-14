# Mobile Optimization Requirements - BazaarMKT

## Executive Summary

This document outlines all mobile optimization requirements identified across the BazaarMKT platform. Each section details specific issues, proposed solutions, and implementation priorities.

**Date**: October 14, 2025  
**Status**: Requirements Phase  
**Priority**: HIGH

---

## Table of Contents

1. [Dashboard Component](#1-dashboard-component)
2. [Priority Queue Component](#2-priority-queue-component)
3. [Revenue & Earnings Section](#3-revenue--earnings-section)
4. [Profile - Business Overview](#4-profile---business-overview)
5. [Profile - Weekly Schedule](#5-profile---weekly-schedule)
6. [Home Page](#6-home-page)
7. [Orders Page](#7-orders-page)
8. [Add Product Modal](#8-add-product-modal)
9. [Order Cards](#9-order-cards)
10. [Implementation Priority Matrix](#10-implementation-priority-matrix)

---

## 1. Dashboard Component
**File**: `frontend/src/components/dashboard/DashboardFixed.jsx`

### Current Issues

#### Header Section
- **Problem**: Header title and buttons don't fit well on mobile screens (< 375px)
- **Impact**: Text wrapping, button overflow, poor UX
- **Screenshot Reference**: Title "Artisan Dashboard" at 3xl is too large on mobile

**Specific Issues:**
```jsx
// Current Code (Line 393)
<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
```
- `text-3xl` (30px) is too large for small screens
- Subtitle also too large: `text-base` (16px)
- Buttons lack minimum touch target size (44px)

#### User Profile Card
- **Problem**: Horizontal layout doesn't work on mobile
- **Impact**: Avatar, text, and buttons squeeze together
- **Current Layout**: Flex row with multiple elements

**Specific Issues:**
```jsx
// Lines 418-473
<div className="flex items-center space-x-4">
  <div className="w-16 h-16">...</div>
  <div className="flex-1">...</div>
  <div className="flex gap-3">...</div>
</div>
```
- 3 action buttons in a row are too cramped
- Spotlight status adds vertical height
- No stacking on mobile

#### Quick Actions Grid
- **Problem**: Cards too small on mobile, text cramped
- **Current**: 4 columns that become 1 on mobile
- **Issue**: Single column creates very long page

**Specific Issues:**
```jsx
// Line 675
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```
- Each card has too much padding (p-6) for mobile
- Icons and text don't balance well in mobile view

### Proposed Solutions

#### Header Optimization
```jsx
// Responsive font sizes
<h1 className="text-xl sm:text-2xl lg:text-3xl">Artisan Dashboard</h1>
<p className="text-xs sm:text-sm lg:text-base">Welcome back!</p>

// Touch-friendly buttons
<button className="min-h-[48px] px-3 py-2 text-sm">
```

**Changes:**
- Title: 20px → 24px → 30px (mobile → tablet → desktop)
- Subtitle: 12px → 14px → 16px
- All buttons: minimum 48px height
- Reduced gap between elements: gap-4 → gap-3

#### Profile Card Mobile Layout
```jsx
<div className="flex flex-col lg:flex-row gap-4">
  {/* Avatar and info stack on mobile */}
  <div className="flex items-center gap-4">
    <div className="w-16 h-16">...</div>
    <div className="flex-1">...</div>
  </div>
  
  {/* Buttons stack on mobile */}
  <div className="flex flex-col sm:flex-row gap-2 lg:ml-auto">
    <button className="w-full sm:w-auto">Edit Profile</button>
    <button className="w-full sm:w-auto">Manage Products</button>
  </div>
</div>
```

**Benefits:**
- Avatar + text together, buttons below on mobile
- Full-width buttons easier to tap
- Better use of vertical space

#### Quick Actions Responsive Grid
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <Link className="card p-4 sm:p-6">
    {/* Compact mobile padding */}
  </Link>
</div>
```

**Changes:**
- Mobile: 1 column with p-4 (16px) padding
- Tablet: 2 columns with p-6 (24px) padding
- Desktop: 2 columns with p-6 (24px) padding
- Remove 4-column layout (too cramped)

### Priority
🔴 **CRITICAL** - Dashboard is primary interface for artisans

---

## 2. Priority Queue Component
**File**: `frontend/src/components/dashboard/DashboardPriorityQueue.jsx`

### Current Issues

#### Header Section
- **Problem**: Header doesn't fit on narrow screens
- **Current Layout**: Icon + title + stats + button in one row
- **Issue**: Stats and button get squeezed

**Specific Issues:**
```jsx
// Lines 294-326
<div className="px-6 py-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <BellIcon className="w-6 h-6" />
      <div className="ml-3">
        <h3 className="text-xl">🚨 Priority Queue</h3>
        <div className="flex gap-3">
          <span>💼 {sales} Sales</span>
          <span>🛒 {purchases} Purchases</span>
        </div>
      </div>
    </div>
    <button>View All Orders</button>
  </div>
</div>
```

- `px-6` (24px) padding too much on mobile
- Stats display takes too much horizontal space
- "View All Orders" button wraps awkwardly

#### Status Tabs
- **Problem**: Horizontal scroll tabs overflow without indication
- **Current**: `flex gap-4 overflow-x-auto`
- **Issue**: No scroll indicators, difficult to discover more tabs

**Specific Issues:**
```jsx
// Lines 336-375
<div className="flex gap-4 overflow-x-auto pb-2">
  {Object.entries(PRIORITY_STATUSES).map(...)}
</div>
```

- No visual hint that scrolling is available
- Tabs can overlap with padding
- Small font size (text-sm) hard to read on mobile

#### Order Cards
- **Problem**: Horizontal scrolling cards are too wide for mobile
- **Current**: Fixed width cards in horizontal scroll
- **Issue**: Only shows 1 card at a time on small screens

**Specific Issues:**
```jsx
// Lines 378-406
<div className="p-6">
  <div className="flex gap-4 overflow-x-auto">
    <PriorityOrderCard ... />
  </div>
</div>
```

- `p-6` (24px) padding reduces card visible area
- Cards don't snap to position when scrolling
- No pagination dots to show progress

### Proposed Solutions

#### Compact Header
```jsx
<div className="px-3 sm:px-6 py-3 sm:py-4">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    {/* Icon + Title */}
    <div className="flex items-center gap-2">
      <div className="relative">
        <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="badge">{count}</span>
      </div>
      <h3 className="text-lg sm:text-xl font-bold">Priority Queue</h3>
    </div>
    
    {/* Stats - stacks on mobile */}
    <div className="flex items-center justify-between sm:justify-start gap-3 text-xs sm:text-sm">
      <span>💼 {sales} Sales</span>
      <span>🛒 {purchases} Purchases</span>
      <button className="ml-auto sm:ml-4 text-xs sm:text-sm">
        View All
      </button>
    </div>
  </div>
</div>
```

**Changes:**
- Padding: 24px → 12px on mobile
- Two-row layout on mobile
- Stats and button share second row

#### Enhanced Status Tabs
```jsx
<div className="relative">
  {/* Gradient indicators for scrollable content */}
  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-orange-50 to-transparent z-10 pointer-events-none" />
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-orange-50 to-transparent z-10 pointer-events-none" />
  
  <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 px-3 sm:px-6 snap-x">
    {tabs.map(tab => (
      <div className="snap-start flex-shrink-0 px-3 py-1.5 text-xs sm:text-sm">
        {tab.label}
      </div>
    ))}
  </div>
</div>
```

**Benefits:**
- Gradient hints show more content available
- Snap scrolling for better UX
- Reduced gap on mobile

#### Optimized Card Scroll
```jsx
<div className="p-3 sm:p-6">
  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-1 px-1">
    <div className="snap-center flex-shrink-0 w-[85vw] sm:w-80">
      <PriorityOrderCard ... />
    </div>
  </div>
  
  {/* Scroll indicator */}
  {priorityOrders.length > 1 && (
    <div className="flex justify-center gap-1 mt-2">
      {priorityOrders.map((_, idx) => (
        <div className="w-2 h-2 rounded-full bg-gray-300" />
      ))}
    </div>
  )}
</div>
```

**Changes:**
- Cards: 85% viewport width on mobile
- Snap scrolling for natural feel
- Dots indicator for navigation
- Reduced padding: 24px → 12px

### Priority
🟠 **HIGH** - Priority queue is critical for order management

---

## 3. Revenue & Earnings Section
**File**: `frontend/src/components/dashboard/DashboardFixed.jsx` (Lines 480-537)

### Current Issues

#### Section Header
- **Problem**: Header text and link don't fit well together
- **Current**: Full sentence "View detailed analytics" with arrow

**Specific Issues:**
```jsx
// Lines 482-492
<div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-semibold">Revenue & Earnings</h2>
  <Link className="inline-flex items-center text-sm">
    View detailed analytics →
  </Link>
</div>
```

- Link text wraps on small screens
- mb-6 (24px) too much space

#### Stat Cards (MobileDashboardStat)
- **Problem**: 4 stat cards show too much information per card
- **Current**: Each card shows icon, label, large value, subtitle
- **Issue**: Cards are tall and overwhelming on mobile

**Specific Issues:**
```jsx
// Lines 496-536
<MobileDashboardStatGroup>
  <MobileDashboardStat
    icon={CurrencyDollarIcon}
    label="Product Revenue"
    value={formatCurrency(artisanStats.productRevenue || 0)}
    changeLabel="From product sales"
    color="text-green-600"
    bgColor="bg-green-50"
  />
  {/* 3 more similar cards */}
</MobileDashboardStatGroup>
```

- 4 cards in grid = lots of scrolling on mobile
- Each card's value (currency) is verbose: "$1,234.56"
- Icon + label + value + subtitle = too dense
- Grid goes from 1 → 2 → 4 columns (jarring on tablet)

#### Information Density
- **Problem**: Too much detail for dashboard overview
- **Revenue breakdown**: Shows product, delivery, earnings, wallet
- **Better**: Show total revenue + one-tap to details

### Proposed Solutions

#### Compact Header
```jsx
<div className="flex items-center justify-between mb-4">
  <h2 className="text-lg sm:text-xl font-semibold">Revenue & Earnings</h2>
  <Link className="text-xs sm:text-sm text-accent flex items-center gap-1">
    Details
    <ArrowRightIcon className="w-3 h-3" />
  </Link>
</div>
```

**Changes:**
- Reduced margin: 24px → 16px
- Shorter link text: "Details" instead of "View detailed analytics"
- Smaller font on mobile: 16px → 20px

#### Condensed Stat Cards
```jsx
<MobileDashboardStatGroup>
  {/* Primary metric - larger */}
  <MobileDashboardStat
    icon={CurrencyDollarIcon}
    label="Total Revenue"
    value={formatCurrency(totalRevenue)}
    size="large"
    color="text-emerald-600"
  />
  
  {/* Secondary metrics - compact */}
  <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-3">
    <CompactStat label="Earnings" value={formatCurrency(earnings)} />
    <CompactStat label="Wallet" value={formatCurrency(wallet)} />
    <CompactStat label="Product" value={formatCurrency(product)} />
    <CompactStat label="Delivery" value={formatCurrency(delivery)} />
  </div>
</MobileDashboardStatGroup>
```

**Alternative: Collapsible Details**
```jsx
<div className="card p-4">
  {/* Summary view */}
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">Total Revenue</p>
      <p className="text-2xl font-bold">{formatCurrency(total)}</p>
    </div>
    <button onClick={() => setExpanded(!expanded)}>
      {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
    </button>
  </div>
  
  {/* Expanded breakdown */}
  {expanded && (
    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-gray-500">Products</p>
        <p className="text-sm font-semibold">{formatCurrency(product)}</p>
      </div>
      {/* ... more stats */}
    </div>
  )}
</div>
```

**Benefits:**
- Reduced vertical space by 50%
- One primary metric highlighted
- Secondary metrics compact
- Optional: Collapsible for more details

### Priority
🟡 **MEDIUM** - Important but not blocking workflow

---

## 4. Profile - Business Overview
**File**: `frontend/src/components/ArtisanTabs.jsx` (Lines 31-1087)

### Current Issues

#### Page Length
- **Problem**: Business Overview tab is extremely long on mobile
- **Sections**: Name, Type, Image, Description, Categories, Address, Contact, Social Media
- **Impact**: Users must scroll 3-4 screens to save

**Specific Issues:**
```jsx
// Gradient card sections
<div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
  {/* Artisan Name - 200px height */}
</div>

<div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
  {/* Business Type - 180px height */}
</div>

<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
  {/* Business Image Upload - 400px height */}
</div>
```

- Each section has:
  - Large padding (p-6 = 24px)
  - Gradient background (nice but adds visual weight)
  - Icon + title + description + form fields
  - Tips/warnings

- Total height: ~2500px on mobile!

#### Form Field Spacing
- **Problem**: Each input has excessive vertical spacing
- **Current**: Label + input + helper text + 2rem margin

**Specific Issues:**
```jsx
// Category selection
<div className="max-h-64 overflow-y-auto">
  {/* Scrollable area within page */}
</div>
```

- Nested scrolling (page scroll + category scroll) confusing
- Categories not grouped efficiently

#### Image Upload Section
- **Problem**: Takes 400px+ vertical space
- **Components**: Drag zone, preview, tips, warning
- **Issue**: Could be more compact

### Proposed Solutions

#### Accordion/Collapsible Sections
```jsx
<form className="space-y-3">
  {/* Essential sections always visible */}
  <FormSection
    title="✏️ Basic Information"
    alwaysExpanded={true}
  >
    <input name="artisanName" readOnly />
    <textarea name="description" />
  </FormSection>
  
  {/* Optional sections collapsible */}
  <Accordion
    sections={[
      {
        id: 'image',
        title: '🖼️ Business Image',
        icon: PhotoIcon,
        badge: hasImage ? '✓' : '!',
        content: <ImageUploadSection />
      },
      {
        id: 'contact',
        title: '📞 Contact Information',
        icon: PhoneIcon,
        badge: isComplete ? '✓' : null,
        content: <ContactSection />
      },
      {
        id: 'address',
        title: '📍 Business Address',
        content: <AddressSection />
      },
      {
        id: 'categories',
        title: '🏷️ Product Categories',
        content: <CategoriesSection />
      }
    ]}
  />
  
  {/* Sticky save button */}
  <div className="sticky bottom-0 bg-white p-4 border-t">
    <button type="submit" className="w-full">Save Changes</button>
  </div>
</form>
```

**Benefits:**
- Page length reduced by 60%
- Focus on one section at a time
- Progress indicators (badges)
- Sticky save button always accessible

#### Compact Form Layout
```jsx
{/* Before: Each field is separate card */}
<div className="bg-gradient-to-r from-amber-50 p-6">
  <label className="block text-lg font-bold mb-2">Field</label>
  <p className="text-sm mb-4">Description...</p>
  <input className="py-3 px-4" />
  <p className="text-xs mt-2">Helper text...</p>
</div>

{/* After: Grouped fields, less decoration */}
<div className="space-y-4">
  <div>
    <label className="text-sm font-medium">Field</label>
    <input className="mt-1 py-2 px-3" />
    {showHelp && <p className="text-xs mt-1">Helper</p>}
  </div>
</div>
```

**Changes:**
- Remove gradient backgrounds (keep simple white)
- Reduce padding: 24px → 16px
- Smaller labels: text-lg → text-sm
- Conditional helper text
- Group related fields

#### Optimized Image Upload
```jsx
<div className="space-y-3">
  {/* Compact upload area */}
  {imagePreview ? (
    <div className="relative w-32 h-32 mx-auto">
      <img src={imagePreview} className="rounded-lg" />
      <button className="absolute -top-2 -right-2 btn-sm">×</button>
    </div>
  ) : (
    <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer">
      <PhotoIcon className="w-8 h-8 mx-auto mb-2" />
      <span className="text-sm">Tap to upload</span>
      <input type="file" className="hidden" />
    </label>
  )}
  
  {/* Collapsible tips */}
  <details className="text-xs text-gray-600">
    <summary className="cursor-pointer">Image tips</summary>
    <ul className="mt-2 space-y-1">
      <li>• Min 400x400px</li>
      <li>• Under 5MB</li>
    </ul>
  </details>
</div>
```

**Reduction**: 400px → 180px height

### Priority
🔴 **CRITICAL** - Profile completion is key onboarding step

---

## 5. Profile - Weekly Schedule
**File**: `frontend/src/components/ArtisanTabs.jsx` (Lines 900-1087)

### Current Issues

#### Day Rows Don't Fit
- **Problem**: Each day shows: checkbox + day name + time inputs + button
- **Current**: All elements in one row
- **Mobile Width**: ~375px total, needs ~500px

**Specific Issues:**
```jsx
// Line ~950
<div className="flex items-center space-x-2">
  <input type="checkbox" /> {/* 40px */}
  <span className="w-24">Monday</span> {/* 96px */}
  <input type="time" className="flex-1" /> {/* 100px */}
  <span>to</span> {/* 20px */}
  <input type="time" className="flex-1" /> {/* 100px */}
  <button>+</button> {/* 40px */}
</div>
{/* Total: ~400px minimum, overflows on mobile */}
```

- Time inputs too narrow (flex-1 doesn't work well)
- "to" label gets squeezed
- Add button pushed off screen or wrapped

#### Multiple Time Slots
- **Problem**: When day has multiple slots, layout breaks further
- **Current**: Each slot is a new row with same layout
- **Issue**: Repetitive, takes too much space

**Example Mobile Issue:**
```
☑ Monday  [09:00] to [17:00] [+]
          [18:00] to [20:00] [×]
```
- Time inputs become tiny
- Alignment issues
- Delete button not visible

#### Time Input Usability
- **Problem**: Native time picker small and hard to use
- **iOS**: Drum picker requires precision
- **Android**: Better but still cramped

### Proposed Solutions

#### Stack Layout for Mobile
```jsx
<div className="space-y-4">
  {days.map(day => (
    <div className="border rounded-lg p-3" key={day}>
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="w-5 h-5" />
          <span className="font-medium">{day}</span>
        </label>
        <button className="text-sm text-blue-600">Add hours</button>
      </div>
      
      {/* Time slots - stack on mobile */}
      {isOpen && (
        <div className="space-y-2">
          {slots.map((slot, idx) => (
            <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-center">
              <input 
                type="time" 
                className="px-2 py-2 text-sm"
                value={slot.open}
              />
              <span className="text-xs text-gray-500">to</span>
              <input 
                type="time" 
                className="px-2 py-2 text-sm"
                value={slot.close}
              />
              {idx > 0 && (
                <button className="text-red-600 p-1">
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ))}
</div>
```

**Benefits:**
- Each day is its own card
- Time inputs stack properly with grid
- Clear visual hierarchy
- Touch-friendly spacing

#### Enhanced Time Picker (Optional)
```jsx
<TimePicker
  value={time}
  onChange={setTime}
  renderMobile={(open) => (
    <button onClick={open} className="w-full px-3 py-2 border rounded text-left">
      {time || 'Select time'}
    </button>
  )}
  renderDesktop={() => (
    <input type="time" className="w-full" />
  )}
/>

{/* Mobile modal */}
<Modal>
  <div className="grid grid-cols-2 gap-4">
    {/* Hour selector */}
    <div className="text-center">
      <button onClick={decrementHour}>▲</button>
      <div className="text-3xl font-bold">{hour}</div>
      <button onClick={incrementHour}>▼</button>
    </div>
    
    {/* Minute selector */}
    <div className="text-center">
      <button onClick={decrementMinute}>▲</button>
      <div className="text-3xl font-bold">{minute}</div>
      <button onClick={incrementMinute}>▼</button>
    </div>
  </div>
</Modal>
```

**Benefits:**
- Larger touch targets
- Easier to use than native picker
- Better visual feedback

#### Preset Options
```jsx
<div className="space-y-2">
  <p className="text-sm font-medium">Quick presets:</p>
  <div className="grid grid-cols-2 gap-2">
    <button onClick={() => setHours('09:00', '17:00')} className="text-xs">
      9 AM - 5 PM
    </button>
    <button onClick={() => setHours('10:00', '18:00')} className="text-xs">
      10 AM - 6 PM
    </button>
    <button onClick={() => setHours('08:00', '16:00')} className="text-xs">
      8 AM - 4 PM
    </button>
    <button onClick={() => setHours('11:00', '19:00')} className="text-xs">
      11 AM - 7 PM
    </button>
  </div>
</div>
```

### Priority
🟠 **HIGH** - Many artisans struggle with this form

---

## 6. Home Page
**File**: `frontend/src/components/home.jsx`

### Current Issues

#### Hero Section
- **Problem**: Hero image and text don't scale well on mobile
- **Current**: Large background image with overlay text
- **Issue**: Text too small or image not visible

**Specific Issues:**
```jsx
// Hero is likely using viewport height
<div className="h-screen bg-cover">
  <h1 className="text-5xl">Discover Local Artisans</h1>
</div>
```

- h-screen on mobile wastes space (full viewport = 667px)
- text-5xl (48px) too large, forces wrapping
- Background image may not load on slow connections

#### Search Bar
- **Problem**: Search bar in hero may be too small
- **Touch target**: Needs 48px minimum height
- **Keyboard**: Should use `inputMode="search"`

#### Product Grids
- **Problem**: Featured products grid may show too many columns
- **Current**: Responsive grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
- **Issue**: Need to verify spacing and image aspect ratios

**Common Grid Issues:**
- Gap too large or too small
- Product cards not square/consistent
- Images not using lazy loading
- Price text too small

#### Category Icons
- **Problem**: Category browse section may be cramped
- **Issue**: Icons + labels in grid

#### Spacing Overall
- **Problem**: Too much padding between sections
- **Current**: Each section likely has py-12 or py-16
- **Mobile**: Should be py-6 or py-8

### Proposed Solutions

#### Compact Hero
```jsx
<section className="relative h-[60vh] sm:h-[70vh] lg:h-screen bg-cover bg-center">
  {/* Optimized background image */}
  <img 
    src="/hero-mobile.jpg" 
    srcSet="/hero-mobile.jpg 640w, /hero-desktop.jpg 1920w"
    className="absolute inset-0 object-cover"
    loading="eager"
  />
  
  <div className="relative z-10 h-full flex items-center">
    <div className="container mx-auto px-4">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
        Discover Local Artisans
      </h1>
      <p className="text-lg sm:text-xl text-white/90 mb-6">
        Support your community
      </p>
      
      {/* Mobile-optimized search */}
      <div className="max-w-2xl">
        <input
          type="search"
          inputMode="search"
          className="w-full h-12 sm:h-14 px-4 text-base rounded-full"
          placeholder="Search products..."
        />
      </div>
    </div>
  </div>
</section>
```

**Changes:**
- Hero height: 60vh on mobile (vs 100vh)
- Title: 30px → 40px → 48px (responsive)
- Search bar: 48px minimum height
- Proper inputMode for mobile keyboards

#### Optimized Product Grids
```jsx
<section className="py-6 sm:py-8 lg:py-12">
  <div className="container mx-auto px-4">
    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6">
      Featured Products
    </h2>
    
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
      {products.map(product => (
        <ProductCard 
          key={product.id}
          product={product}
          imageAspect="square"
          compact={true}
        />
      ))}
    </div>
  </div>
</section>
```

**Changes:**
- Section padding: 48px → 24px on mobile
- Grid: 2 columns on mobile (better than 1)
- Gap: 12px on mobile (vs 24px desktop)
- Title size: 20px → 24px → 30px

#### Mobile-Friendly Categories
```jsx
<section className="py-6 sm:py-8">
  <div className="container mx-auto px-4">
    <h2 className="text-xl font-bold mb-4">Browse by Category</h2>
    
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {categories.map(cat => (
        <Link 
          to={`/search?category=${cat.id}`}
          className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 mb-2 flex items-center justify-center text-2xl sm:text-3xl">
            {cat.icon}
          </div>
          <span className="text-xs sm:text-sm text-center line-clamp-2">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  </div>
</section>
```

**Changes:**
- 3 columns on mobile (vs 4-6 on desktop)
- Smaller icons: 48px on mobile
- Text: text-xs (12px) on mobile
- Line clamp to prevent wrapping

### Priority
🟡 **MEDIUM** - Home page is entry point but existing mobile implementation decent

---

## 7. Orders Page
**File**: `frontend/src/components/Orders.jsx`

### Current Issues

#### Header Section
- **Problem**: Large header with icon takes too much space
- **Current**: 64px icon + title + description = ~200px height
- **Mobile**: Should be more compact

**Specific Issues:**
```jsx
// Lines 748-761
<div className="mb-8 text-center">
  <div className="inline-flex w-16 h-16 bg-gradient-to-br rounded-full mb-4">
    <ShoppingBagIcon className="w-8 h-8" />
  </div>
  <h1 className="text-4xl font-bold mb-3">Order Management</h1>
  <p className="text-lg max-w-2xl mx-auto">
    Manage your customer orders and track order fulfillment
  </p>
</div>
```

- Icon (64px) unnecessary on mobile
- Title (36px / text-4xl) too large
- Description paragraph too verbose

#### Stats Cards
- **Problem**: 2-column stats layout on mobile
- **Current**: grid-cols-1 md:grid-cols-2
- **Each Card**: ~120px height
- **Issue**: Cards show too much text/details

**Specific Issues:**
```jsx
// Lines 767-790
<div className="bg-white rounded-xl shadow-sm border p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium">Orders Needing Action</p>
      <p className="text-3xl font-bold">{stats.needsAction}</p>
      <p className="text-xs text-gray-500 mt-1">Pending & Confirmed</p>
    </div>
    <div className="w-16 h-16 bg-red-100 rounded-full">
      <span className="text-2xl">🚨</span>
    </div>
  </div>
</div>
```

- p-6 (24px) padding too large on mobile
- Three lines of text per card
- Large icon (64px) takes space
- Emoji rendering inconsistent

#### Filter Buttons
- **Problem**: Filter buttons likely overflow on mobile
- **Common Pattern**: Horizontal scroll of filter chips
- **Issue**: Too many status options for one row

**Expected Issues:**
```jsx
<div className="flex gap-2 overflow-x-auto">
  <button>All</button>
  <button>Pending</button>
  <button>Confirmed</button>
  <button>Preparing</button>
  <button>Ready for Pickup</button>
  {/* ...more */}
</div>
```

- 8-10 filter options don't fit
- No scroll indicators
- Active state not obvious when scrolled

#### Order List
- **Problem**: MobileOrderCard might still be too large
- **Current**: Each card ~180-200px height
- **Issue**: Only 3-4 orders visible per screen

### Proposed Solutions

#### Compact Header
```jsx
<div className="mb-4 sm:mb-6">
  {/* Hide icon on mobile */}
  <div className="hidden sm:flex w-16 h-16 bg-gradient-to-br rounded-full mx-auto mb-4">
    <ShoppingBagIcon className="w-8 h-8" />
  </div>
  
  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-2">
    {isArtisan ? 'Orders' : 'My Orders'}
  </h1>
  
  <p className="text-sm sm:text-base text-gray-600 text-center">
    {isArtisan ? 'Manage customer orders' : 'Track your orders'}
  </p>
</div>
```

**Changes:**
- Hide icon on mobile (saves 80px)
- Title: 24px → 30px → 36px
- Shorter description
- Reduced margin: 32px → 16px

#### Condensed Stats
```jsx
<div className="grid grid-cols-2 gap-3 mb-6">
  <StatCard
    label="Needs Action"
    value={stats.needsAction}
    color="red"
    compact={true}
  />
  <StatCard
    label="In Progress"
    value={stats.inProgress}
    color="orange"
    compact={true}
  />
</div>

{/* Compact stat card */}
const StatCard = ({ label, value, color, compact }) => (
  <div className="bg-white rounded-lg border p-3 sm:p-4">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs sm:text-sm font-medium text-gray-600">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
          {value}
        </p>
      </div>
      {!compact && (
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center ml-2">
          🚨
        </div>
      )}
    </div>
  </div>
);
```

**Changes:**
- Padding: 24px → 12px on mobile
- Remove emoji icon on mobile
- Remove subtitle (saves 20px)
- Smaller value font: text-2xl on mobile

#### Grouped Filters with Dropdown
```jsx
<div className="mb-4 flex flex-col sm:flex-row gap-2">
  {/* Primary filters always visible */}
  <div className="flex gap-2 flex-wrap">
    <FilterButton active={filter === 'all'}>
      All ({stats.total})
    </FilterButton>
    <FilterButton active={filter === 'active'}>
      Active ({stats.active})
    </FilterButton>
    <FilterButton active={filter === 'completed'}>
      Done ({stats.completed})
    </FilterButton>
  </div>
  
  {/* More filters in dropdown on mobile */}
  <div className="sm:ml-auto">
    <select className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm">
      <option value="">More filters...</option>
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="preparing">Preparing</option>
      <option value="ready">Ready</option>
      <option value="delivering">Delivering</option>
    </select>
  </div>
</div>
```

**Benefits:**
- Only 3 main filters visible (fits in one row)
- Detailed filters in dropdown
- Counts shown for primary filters
- Less horizontal scrolling

#### Compact Order Cards
```jsx
<MobileOrderCard
  order={order}
  variant="compact"
  showThumbnails={false}
/>

{/* Inside MobileOrderCard */}
{variant === 'compact' ? (
  <div className="p-3 border rounded-lg">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          #{order._id.slice(-6)}
        </p>
        <p className="text-xs text-gray-500">
          {formatDate(order.createdAt)}
        </p>
      </div>
      <OrderStatusBadge status={order.status} size="sm" />
    </div>
    
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-600">
        {order.items.length} item{order.items.length > 1 ? 's' : ''}
      </p>
      <p className="text-sm font-bold">
        {formatCurrency(order.totalAmount)}
      </p>
    </div>
  </div>
) : (
  /* Regular card with thumbnails */
)}
```

**Changes:**
- Compact variant: ~100px height (vs 200px)
- No product thumbnails in list view
- Only essential info: order #, date, status, total
- Tap to see full details

### Priority
🟠 **HIGH** - Orders are core workflow for artisans

---

## 8. Add Product Modal
**File**: `frontend/src/components/ArtisanProductManagement.jsx` (Lines 936-2168)

### Current Issues

#### Modal Height
- **Problem**: Modal content is 2000+ lines, requires excessive scrolling
- **Current**: max-h-[95vh] overflow-y-auto
- **Issue**: Scrolling within scrolling, hard to navigate

**Specific Issues:**
```jsx
// Line 937
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
    {/* 2000+ lines of form */}
  </div>
</div>
```

- Form sections not grouped/collapsible
- All fields shown at once
- Modal body scroll bar tiny on mobile
- Can't see sticky save button at bottom

#### Form Sections
- **Problem**: ~15 different input sections all expanded
- **Sections**: Name, Description, Price, Unit, Category, Type, Stock, Weight, Dimensions, Allergens, Ingredients, Image, Dietary, Timing, etc.
- **Issue**: Overwhelming, most not needed immediately

**Example Sections:**
```jsx
{/* Basic Info */}
<input name="name" />
<textarea name="description" />

{/* Pricing */}
<input name="price" />
<select name="unit" />

{/* Categorization */}
<select name="category" />
<select name="subcategory" />
<select name="productType" />

{/* Inventory */}
<input name="stock" />

{/* Physical Attributes */}
<input name="weight" />
<input name="dimensions" />

{/* Food-Specific */}
<textarea name="allergens" />
<textarea name="ingredients" />

{/* Dietary Flags */}
<input type="checkbox" name="isOrganic" />
<input type="checkbox" name="isGlutenFree" />
<input type="checkbox" name="isVegan" />
{/* ... 7 more checkboxes */}

{/* Timing */}
<input name="preparationTime" />
<input name="leadTime" />

{/* Image Upload */}
<div className="drag-drop-zone">...</div>
```

#### Image Upload
- **Problem**: Drag & drop zone large even when image uploaded
- **Current**: Full preview + drag zone
- **Issue**: Takes 300-400px vertical space

#### Save Button
- **Problem**: Save button at bottom of long form
- **Issue**: Must scroll to bottom to save
- **No feedback**: Can't see which fields are required until submit

### Proposed Solutions

#### Multi-Step Form (Mobile)
```jsx
{isMobile ? (
  <MobileProductForm
    steps={[
      {
        id: 'basics',
        title: 'Basic Info',
        icon: CubeIcon,
        fields: ['name', 'description', 'category', 'price']
      },
      {
        id: 'inventory',
        title: 'Inventory',
        icon: ChartBarIcon,
        fields: ['productType', 'stock', 'unit']
      },
      {
        id: 'details',
        title: 'Details',
        icon: InformationCircleIcon,
        fields: ['weight', 'dimensions', 'timing']
      },
      {
        id: 'dietary',
        title: 'Dietary Info',
        icon: CheckCircleIcon,
        fields: ['allergens', 'ingredients', 'flags']
      },
      {
        id: 'image',
        title: 'Product Image',
        icon: PhotoIcon,
        fields: ['image']
      }
    ]}
    onSave={handleSave}
  />
) : (
  <DesktopProductForm />
)}

{/* Mobile step form */}
const MobileProductForm = ({ steps, onSave }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  
  return (
    <div className="h-[90vh] flex flex-col">
      {/* Progress indicator */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">
            Step {currentStep + 1} of {steps.length}
          </h3>
          <span className="text-sm text-gray-500">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-2 bg-blue-600 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Current step content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <steps[currentStep].icon className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold">
            {steps[currentStep].title}
          </h2>
        </div>
        
        <FormFields fields={steps[currentStep].fields} />
      </div>
      
      {/* Navigation buttons */}
      <div className="p-4 border-t flex gap-2">
        {currentStep > 0 && (
          <button 
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex-1 btn-secondary"
          >
            Back
          </button>
        )}
        <button 
          onClick={() => {
            if (currentStep < steps.length - 1) {
              setCurrentStep(currentStep + 1);
            } else {
              onSave(formData);
            }
          }}
          className="flex-1 btn-primary"
        >
          {currentStep < steps.length - 1 ? 'Next' : 'Save Product'}
        </button>
      </div>
    </div>
  );
};
```

**Benefits:**
- One section at a time (focus)
- Clear progress indicator
- Always visible navigation
- Can go back/forward
- Save only on last step

#### Accordion Form (Desktop)
```jsx
<form className="space-y-4">
  <Accordion defaultExpanded="basics">
    <AccordionSection
      id="basics"
      title="Basic Information"
      required={true}
      icon={<CubeIcon />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="name" required />
        <select name="category" required />
        <textarea name="description" className="md:col-span-2" />
        <input name="price" required />
        <select name="unit" required />
      </div>
    </AccordionSection>
    
    <AccordionSection
      id="inventory"
      title="Inventory & Stock"
      icon={<ChartBarIcon />}
    >
      {/* Inventory fields */}
    </AccordionSection>
    
    {/* More sections... */}
  </Accordion>
  
  {/* Sticky footer */}
  <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg">
    <div className="flex items-center justify-between">
      <button type="button" className="btn-secondary">
        Cancel
      </button>
      <button type="submit" className="btn-primary">
        {product ? 'Update' : 'Create'} Product
      </button>
    </div>
  </div>
</form>
```

#### Compact Image Upload
```jsx
{imagePreview ? (
  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
    <img 
      src={imagePreview} 
      className="w-20 h-20 rounded object-cover"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{fileName}</p>
      <p className="text-xs text-gray-500">{fileSize}</p>
    </div>
    <button onClick={removeImage} className="text-red-600">
      <TrashIcon className="w-5 h-5" />
    </button>
  </div>
) : (
  <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400">
    <PhotoIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
    <p className="text-sm font-medium">Upload Product Image</p>
    <p className="text-xs text-gray-500 mt-1">Tap or drag to upload</p>
    <input type="file" className="hidden" />
  </label>
)}
```

**Reduction**: 400px → 120px when image uploaded

### Priority
🟠 **HIGH** - Product creation is essential but less frequent than viewing

---

## 9. Order Cards
**File**: `frontend/src/components/mobile/MobileOrderCard.jsx`

### Current Issues

#### Card Size
- **Problem**: Order cards are ~200px tall
- **Content**: Header + items list + actions
- **Issue**: Only 3-4 orders visible per screen

**Expected Structure:**
```jsx
<div className="bg-white rounded-lg border p-4 mb-3">
  {/* Header: Order # + Status */}
  <div className="flex justify-between mb-3">
    <div>
      <p className="font-semibold">#ABC123</p>
      <p className="text-sm text-gray-500">Nov 15, 2024</p>
    </div>
    <StatusBadge status="pending" />
  </div>
  
  {/* Items list */}
  <div className="space-y-2 mb-4">
    {items.map(item => (
      <div className="flex items-center space-x-3">
        <img className="w-12 h-12 rounded" />
        <div className="flex-1">
          <p className="text-sm">{item.name}</p>
          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
        </div>
        <p className="text-sm font-semibold">${item.price}</p>
      </div>
    ))}
  </div>
  
  {/* Actions */}
  <div className="flex space-x-2">
    <button className="flex-1 h-10">View Details</button>
    <button className="flex-1 h-10">Cancel</button>
  </div>
</div>
```

- Padding p-4 (16px) is good
- Item thumbnails (48px) take space
- Action buttons (40px) okay but could be smaller
- Total height: ~180-200px

#### Information Density
- **Problem**: Shows all items with thumbnails
- **Better**: Show summary, expand for details

#### Action Buttons
- **Problem**: Two full-width buttons side by side
- **Issue**: Text gets cramped, not enough padding

### Proposed Solutions

#### Collapsed by Default
```jsx
<div className="bg-white rounded-lg border overflow-hidden">
  {/* Compact header */}
  <button 
    onClick={() => setExpanded(!expanded)}
    className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
        <ShoppingBagIcon className="w-5 h-5 text-orange-600" />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold">#{order._id.slice(-6)}</p>
        <p className="text-xs text-gray-500">
          {order.items.length} items • {formatDate(order.createdAt)}
        </p>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <StatusBadge status={order.status} size="sm" />
      <ChevronDownIcon 
        className={`w-5 h-5 transition-transform ${
          expanded ? 'rotate-180' : ''
        }`}
      />
    </div>
  </button>
  
  {/* Expanded details */}
  {expanded && (
    <div className="px-3 pb-3 space-y-3 border-t">
      {/* Items list */}
      <div className="space-y-2 pt-3">
        {order.items.map(item => (
          <div key={item._id} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0">
              {item.product?.images?.[0] ? (
                <img src={getImageUrl(item.product.images[0])} className="w-full h-full object-cover rounded" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.product?.name}</p>
              <p className="text-xs text-gray-500">×{item.quantity}</p>
            </div>
            <p className="text-xs font-semibold">${item.price}</p>
          </div>
        ))}
      </div>
      
      {/* Order total */}
      <div className="flex justify-between items-center pt-2 border-t">
        <span className="text-sm font-medium">Total</span>
        <span className="text-base font-bold">{formatCurrency(order.totalAmount)}</span>
      </div>
      
      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium">
          Details
        </button>
        {canCancel && (
          <button className="px-3 py-2 bg-red-50 text-red-600 rounded text-sm font-medium">
            Cancel
          </button>
        )}
      </div>
    </div>
  )}
</div>
```

**Benefits:**
- Collapsed: Only 56px height (vs 200px)
- Shows ~10 orders per screen (vs 3-4)
- Tap to expand for full details
- Smaller thumbnails (32px vs 48px)
- More compact spacing

#### Quick Actions Swipe (Alternative)
```jsx
<SwipeableCard
  onSwipeLeft={() => handleViewDetails(order)}
  onSwipeRight={() => handleQuickAction(order)}
  leftAction={{ icon: <EyeIcon />, label: 'View', color: 'blue' }}
  rightAction={{ icon: <CheckIcon />, label: 'Complete', color: 'green' }}
>
  <div className="p-3">
    {/* Order summary */}
  </div>
</SwipeableCard>
```

**Benefits:**
- No action buttons needed in card
- Swipe gestures natural on mobile
- More space for content
- Discoverable with visual hints

### Priority
🟡 **MEDIUM** - Card optimization nice-to-have

---

## 10. Implementation Priority Matrix

### Critical Path (Week 1)
Must fix immediately for usable mobile experience:

1. ✅ **Dashboard Header** (2 hours)
   - Responsive font sizes
   - Touch-friendly buttons
   - Compact layout

2. ✅ **Profile Business Overview** (8 hours)
   - Accordion/collapsible sections
   - Compact form fields
   - Sticky save button
   - Reduce from 2500px → 1000px height

3. ✅ **Profile Weekly Schedule** (4 hours)
   - Stack time inputs properly
   - Card-based day layout
   - Mobile-friendly time picker

### High Priority (Week 2)
Important for daily workflow:

4. ✅ **Priority Queue** (4 hours)
   - Compact header
   - Enhanced scroll indicators
   - Smaller card sizing
   - Snap scrolling

5. ✅ **Orders Page** (6 hours)
   - Compact header (remove large icon)
   - Condensed stats
   - Grouped filters
   - Compact order cards

6. ✅ **Add Product Modal** (8 hours)
   - Multi-step form for mobile
   - Accordion for desktop
   - Compact image upload
   - Progress indicators

### Medium Priority (Week 3)
Improves UX but not blocking:

7. ✅ **Revenue & Earnings** (3 hours)
   - Condensed stat display
   - Collapsible details
   - Shorter labels

8. ✅ **Home Page** (4 hours)
   - Compact hero (60vh)
   - Optimized grids (2 columns mobile)
   - Reduced section spacing

9. ✅ **Order Cards** (3 hours)
   - Collapsible by default
   - Smaller thumbnails
   - Better info density

### Effort Estimates

| Component | Complexity | Time | Dependencies |
|-----------|-----------|------|--------------|
| Dashboard Header | Low | 2h | None |
| Profile Overview | High | 8h | Accordion component |
| Profile Schedule | Medium | 4h | None |
| Priority Queue | Medium | 4h | None |
| Orders Page | Medium | 6h | Compact stats component |
| Add Product | High | 8h | Multi-step form component |
| Revenue Section | Low | 3h | None |
| Home Page | Low | 4h | None |
| Order Cards | Low | 3h | None |
| **Total** | | **42h** | ~1-2 weeks |

### New Components Needed

1. **Accordion Component** (`frontend/src/components/common/Accordion.jsx`)
   - Collapsible sections
   - Progress indicators
   - Mobile-optimized
   - ~200 lines

2. **MultiStepForm Component** (`frontend/src/components/common/MultiStepForm.jsx`)
   - Step navigation
   - Progress bar
   - Form validation per step
   - ~300 lines

3. **CompactStat Component** (`frontend/src/components/mobile/CompactStat.jsx`)
   - Condensed stat display
   - Optional expansion
   - ~100 lines

### Testing Requirements

For each optimized component:

- ✅ Test on iPhone SE (375px width)
- ✅ Test on iPhone 12/13/14 (390px width)
- ✅ Test on Android small (360px width)
- ✅ Test on tablet (768px width)
- ✅ Test landscape orientation
- ✅ Test with browser zoom 150%
- ✅ Test touch targets (minimum 44px)
- ✅ Test keyboard navigation
- ✅ Test with slow network

### Success Metrics

**Before Optimization:**
- Dashboard height: ~3500px on mobile
- Profile form: ~2500px on mobile
- Lighthouse mobile score: 70-75
- Touch target failures: 15-20
- Bounce rate: 45%

**After Optimization:**
- Dashboard height: < 2000px on mobile
- Profile form: < 1200px on mobile
- Lighthouse mobile score: > 90
- Touch target failures: 0
- Bounce rate: < 30%

**User Experience:**
- Time to complete profile: 50% faster
- Order management time: 40% faster
- Mobile satisfaction score: > 85%

---

## Next Steps

1. **Review this document** with stakeholders
2. **Create new reusable components** (Accordion, MultiStepForm, CompactStat)
3. **Implement Critical Path** items (Week 1)
4. **Test on real devices** throughout implementation
5. **Iterate based on feedback** from artisans
6. **Document all changes** for future reference

## Questions for Stakeholders

1. Should we use multi-step form or accordion for mobile product creation?
2. Are collapsible order cards acceptable or always show summary?
3. What's the minimum information needed in dashboard stats?
4. Should revenue details be collapsed by default?
5. Do we need preset time slots for business hours?

---

**Document Version**: 1.0  
**Last Updated**: October 14, 2025  
**Next Review**: After implementation  
**Owner**: Development Team

