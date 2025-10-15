# i18n Developer Guide

## For Developers Adding New Features

This guide helps you quickly add internationalization support to new or existing components.

---

## Step-by-Step: Adding i18n to a Component

### Step 1: Import the Hook

```javascript
import { useTranslation } from 'react-i18next';
```

### Step 2: Use in Component

```javascript
export default function MyComponent() {
  const { t } = useTranslation();  // ← Add this line
  
  return (
    <div>
      {/* Use t() function for all text */}
      <h1>{t('mySection.title')}</h1>
    </div>
  );
}
```

### Step 3: Add Translation Keys

**English** (`/frontend/src/locales/en.json`):
```json
{
  "mySection": {
    "title": "My Title",
    "description": "My Description",
    "buttonLabel": "Click Me"
  }
}
```

**French** (`/frontend/src/locales/fr-CA.json`):
```json
{
  "mySection": {
    "title": "Mon titre",
    "description": "Ma description",
    "buttonLabel": "Cliquez-moi"
  }
}
```

### Step 4: Test Both Languages

1. Start dev server: `npm run dev`
2. Open app in browser
3. Click language switcher (EN/FR in navbar)
4. Verify both languages display correctly

---

## Common Scenarios

### Scenario 1: Simple Text

```javascript
// Before
<h1>Welcome to BazaarMkt</h1>

// After
<h1>{t('home.welcome')}</h1>

// Add to translation files:
// en.json: "home": { "welcome": "Welcome to BazaarMkt" }
// fr-CA.json: "home": { "welcome": "Bienvenue à BazaarMkt" }
```

### Scenario 2: Text with Variables

```javascript
// Before
<p>Hello, {user.name}!</p>

// After
<p>{t('greeting', { name: user.name })}</p>

// Add to translation files:
// en.json: "greeting": "Hello, {{name}}!"
// fr-CA.json: "greeting": "Bonjour, {{name}}!"
```

### Scenario 3: Plurals

```javascript
// Before
<span>{count} {count === 1 ? 'item' : 'items'}</span>

// After
<span>{t('itemCount', { count })}</span>

// Add to translation files:
// en.json: 
// "itemCount": "{{count}} item",
// "itemCount_plural": "{{count}} items"
// fr-CA.json:
// "itemCount": "{{count}} article",
// "itemCount_plural": "{{count}} articles"
```

### Scenario 4: Conditional Text

```javascript
// Before
<button>
  {isLoading ? 'Saving...' : 'Save'}
</button>

// After
<button>
  {isLoading ? t('common.saving') : t('common.save')}
</button>

// Add to translation files:
// en.json: "common": { "saving": "Saving...", "save": "Save" }
// fr-CA.json: "common": { "saving": "Sauvegarde...", "save": "Sauvegarder" }
```

### Scenario 5: Long Paragraphs

```javascript
// Before
<p>
  BazaarMkt is a platform that connects local artisans 
  with customers in their community. Shop handcrafted 
  products and support local makers.
</p>

// After
<p>{t('about.description')}</p>

// Add to translation files:
// en.json: "about": { 
//   "description": "BazaarMkt is a platform that connects local artisans with customers in their community. Shop handcrafted products and support local makers." 
// }
// fr-CA.json: "about": { 
//   "description": "BazaarMkt est une plateforme qui connecte les artisans locaux avec les clients de leur communauté. Magasinez des produits artisanaux et soutenez les créateurs locaux." 
// }
```

---

## Best Practices

### ✅ DO

1. **Group related keys**:
   ```json
   "orders": {
     "title": "My Orders",
     "empty": "No orders yet",
     "viewDetails": "View Details"
   }
   ```

2. **Use descriptive names**:
   ```json
   "auth.forgotPassword": "Forgot Password?"  // ✅ Clear
   ```

3. **Keep complete sentences**:
   ```json
   "welcomeMessage": "Welcome back, {{name}}!"  // ✅ Complete
   ```

4. **Test both languages**:
   - Switch to EN → Check text
   - Switch to FR → Check text

### ❌ DON'T

1. **Don't hardcode text**:
   ```javascript
   <h1>My Title</h1>  // ❌ Bad
   ```

2. **Don't use unclear keys**:
   ```json
   "text1": "Some text"  // ❌ Bad - unclear purpose
   ```

3. **Don't split sentences**:
   ```javascript
   {t('order')} {t('number')}  // ❌ Bad - hard to translate
   ```

4. **Don't forget Canadian French specifics**:
   ```json
   "email": "E-mail"  // ❌ Bad - use "Courriel" in French
   ```

---

## Translation Key Organization

### Use This Structure

```
{featureName}.{element}.{variant}
```

### Examples

```
home.hero.title
home.hero.subtitle
home.hero.ctaButton

products.card.title
products.card.price
products.card.addToCart

orders.status.pending
orders.status.shipped
orders.status.delivered
```

---

## Working with Forms

### Form Labels and Placeholders

```javascript
<div className="form-group">
  <label>{t('auth.email')}</label>
  <input 
    type="email"
    placeholder={t('auth.emailPlaceholder')}
  />
</div>

// Translation files:
// en.json:
"auth": {
  "email": "Email",
  "emailPlaceholder": "your@email.com"
}
// fr-CA.json:
"auth": {
  "email": "Courriel",
  "emailPlaceholder": "votre@courriel.com"
}
```

### Validation Messages

```javascript
{errors.email && <span className="error">{t('validation.emailRequired')}</span>}

// Translation files:
// en.json: "validation": { "emailRequired": "Email is required" }
// fr-CA.json: "validation": { "emailRequired": "Le courriel est requis" }
```

---

## Working with Arrays/Lists

### Option 1: Map with Translation

```javascript
const statuses = ['pending', 'confirmed', 'delivered'];

{statuses.map(status => (
  <span key={status}>{t(`orders.status.${status}`)}</span>
))}

// Translation files need:
// "orders": {
//   "status": {
//     "pending": "Pending",
//     "confirmed": "Confirmed",
//     "delivered": "Delivered"
//   }
// }
```

### Option 2: Translated Array

```javascript
const statusOptions = [
  { value: 'pending', label: t('orders.status.pending') },
  { value: 'confirmed', label: t('orders.status.confirmed') },
  { value: 'delivered', label: t('orders.status.delivered') }
];
```

---

## Date and Number Formatting

### Dates

```javascript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();

// Format date based on language
const formattedDate = new Date().toLocaleDateString(
  i18n.language === 'fr-CA' ? 'fr-CA' : 'en-US',
  { year: 'numeric', month: 'long', day: 'numeric' }
);
```

### Currency

```javascript
const formatPrice = (price) => {
  return new Intl.NumberFormat(
    i18n.language === 'fr-CA' ? 'fr-CA' : 'en-CA',
    { style: 'currency', currency: 'CAD' }
  ).format(price);
};

// Results:
// en: $19.99
// fr-CA: 19,99 $
```

---

## Common Translation Patterns

### Status Indicators

```javascript
const getStatusColor = (status) => {
  // Logic doesn't change
  return status === 'completed' ? 'green' : 'orange';
};

const getStatusText = (status) => {
  // Translation changes
  return t(`orders.status.${status}`);
};

<span className={getStatusColor(status)}>
  {getStatusText(status)}
</span>
```

### Toast Messages

```javascript
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// Success
toast.success(t('messages.orderPlaced'));

// Error
toast.error(t('messages.orderFailed'));

// Translation files:
// "messages": {
//   "orderPlaced": "Order placed successfully!",
//   "orderFailed": "Failed to place order"
// }
```

### Modal Titles

```javascript
<Modal open={isOpen} onClose={handleClose}>
  <Modal.Title>{t('modals.confirmDelete.title')}</Modal.Title>
  <Modal.Body>{t('modals.confirmDelete.message')}</Modal.Body>
  <Modal.Footer>
    <button onClick={handleClose}>{t('common.cancel')}</button>
    <button onClick={handleDelete}>{t('common.delete')}</button>
  </Modal.Footer>
</Modal>
```

---

## Debugging Tips

### Check if Key Exists

```javascript
import i18n from '../i18n';

console.log('Key exists:', i18n.exists('section.key'));
```

### See Current Language

```javascript
const { i18n } = useTranslation();
console.log('Current language:', i18n.language);
```

### Get Raw Translation

```javascript
import i18n from '../i18n';
const text = i18n.t('section.key');
console.log('Translation:', text);
```

### Missing Translation Warning

If you see the key instead of translated text, check:
1. Key exists in both en.json and fr-CA.json
2. Key path is correct (case-sensitive)
3. JSON file has valid syntax
4. Dev server was restarted after adding new keys

---

## Canadian French Guidelines

### Use Canadian Terms

| Context | English | Canadian French |
|---------|---------|-----------------|
| Email | Email | Courriel |
| Shopping | Shopping | Magasiner |
| Store | Store | Magasin |
| Cart | Cart | Panier |
| Checkout | Checkout | Paiement / Caisse |
| Download | Download | Télécharger |
| Upload | Upload | Téléverser |
| Chat | Chat | Clavardage |
| Parking | Parking | Stationnement |
| Weekend | Weekend | Fin de semaine |

### Formality Level

Use "vous" form (formal) for:
- Error messages
- Instructions
- General communication

Example:
- ✅ "Veuillez entrer votre courriel" (Please enter your email)
- ❌ "Entre ton courriel" (too informal)

---

## Component Conversion Checklist

When adding i18n to a component:

- [ ] Import `useTranslation` hook
- [ ] Add `const { t } = useTranslation();`
- [ ] Replace all hardcoded text with `t('key')`
- [ ] Add keys to `en.json`
- [ ] Add translations to `fr-CA.json`
- [ ] Test component in English
- [ ] Test component in French
- [ ] Check layout with French text (often longer)
- [ ] Verify no keys showing instead of text
- [ ] Test with variables/plurals if applicable

---

## Quick Reference

```javascript
// Import
import { useTranslation } from 'react-i18next';

// Use in component
const { t, i18n } = useTranslation();

// Simple translation
{t('key')}

// With variable
{t('key', { name: value })}

// With plural
{t('key', { count: number })}

// Get current language
i18n.language

// Change language
i18n.changeLanguage('fr-CA')
```

---

## Need Help?

1. Check [Full Documentation](./INTERNATIONALIZATION_IMPLEMENTATION.md)
2. See [Quick Reference](./QUICK_REFERENCE.md)
3. Look at existing translated components for examples
4. Test with language switcher in navbar

---

**Last Updated**: October 14, 2025  
**For Questions**: Review documentation or check console for 🌐 language sync logs

