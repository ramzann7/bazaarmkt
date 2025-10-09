# Registration Page - Country Code Fixed to Canada

## Summary
Modified the registration page to lock the country selection to Canada only, making it non-editable for users.

## Changes Made

### File: `frontend/src/components/register.jsx`

#### 1. Updated Initial Form State
- **Line 35:** Changed `country: ""` to `country: "Canada"`
- Sets the default country to Canada when the form loads

#### 2. Updated Address Config Default
- **Line 42:** Changed `ADDRESS_CONFIG.default` to `ADDRESS_CONFIG.Canada || ADDRESS_CONFIG.default`
- Ensures Canadian address configuration (provinces, postal code format) is loaded by default

#### 3. Modified Country Selector UI
- **Lines 550-568:** Updated the country dropdown
  - Added `disabled` attribute to make it non-editable
  - Added `bg-gray-50 cursor-not-allowed` classes for visual feedback
  - Removed all other country options (US, UK, Australia, etc.)
  - Added helper text: "🇨🇦 Currently available in Canada only"
  - Kept only "Canada" as the single option

## User Experience

### Before
- Users could select from multiple countries (Canada, US, UK, etc.)
- Country field was editable
- Form would validate and reject non-Canadian addresses at submission

### After
- Country is pre-selected to "Canada"
- Field is visually disabled (grayed out)
- Cursor shows "not-allowed" when hovering
- Clear message indicates Canada-only availability
- Users cannot change the country selection

## Benefits

1. **Clearer UX:** Users immediately see the Canada-only restriction
2. **Fewer Errors:** Prevents users from entering addresses in unsupported countries
3. **Better Validation:** No need to validate country at submission since it's locked
4. **Consistent Behavior:** Always uses Canadian address format (provinces, postal codes)

## Technical Details

### CSS Classes Applied
```css
bg-gray-50        /* Light gray background to indicate disabled state */
cursor-not-allowed /* Shows "not allowed" cursor on hover */
```

### HTML Attributes
```html
disabled          /* Makes the select field non-interactive */
```

### Form State
```javascript
country: "Canada"  // Always set to Canada
```

## Testing Recommendations

1. **Visual Test:**
   - Visit registration page
   - Verify country field shows "Canada" and appears disabled
   - Hover over field to confirm cursor shows "not-allowed"

2. **Functional Test:**
   - Try to click/change the country field (should not be changeable)
   - Complete registration with Canadian address
   - Verify it successfully registers

3. **Responsive Test:**
   - Check on mobile devices
   - Ensure disabled state is clearly visible

## Screenshots Reference

The country dropdown now appears as:
```
┌─────────────────────────────┐
│ Country                      │
├─────────────────────────────┤
│ Canada                    ▼  │  [grayed out, disabled]
└─────────────────────────────┘
   🇨🇦 Currently available in Canada only
```

## Related Validation

The existing validation at line 202-205 is still in place as a safety check:
```javascript
if (formData.country !== 'Canada') {
  toast.error('Sorry, bazaar is currently only available in Canada...');
  return;
}
```

This provides defense-in-depth even though users can no longer change the country.

## Future Considerations

When expanding to other countries:
1. Remove the `disabled` attribute
2. Add back other country options
3. Update the helper text
4. Modify validation logic for multi-country support
5. Update the addressConfig initialization logic

