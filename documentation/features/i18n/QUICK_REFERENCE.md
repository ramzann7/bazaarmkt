# i18n Quick Reference Guide

## Quick Links
- [Full Documentation](./INTERNATIONALIZATION_IMPLEMENTATION.md)
- Translation Files: `/frontend/src/locales/`
- i18n Config: `/frontend/src/i18n.js`
- Language Switcher: `/frontend/src/components/LanguageSwitcher.jsx`

---

## Common Tasks

### Add Translation to Component

```javascript
// 1. Import useTranslation
import { useTranslation } from 'react-i18next';

// 2. Use in component
function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('section.key')}</h1>
    </div>
  );
}
```

### Add New Translation Keys

```javascript
// 1. Add to /frontend/src/locales/en.json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "My feature description"
  }
}

// 2. Add to /frontend/src/locales/fr-CA.json
{
  "myFeature": {
    "title": "Titre de ma fonctionnalité",
    "description": "Description de ma fonctionnalité"
  }
}

// 3. Use in component
<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
```

### Use Variables in Translations

```javascript
// In translation file:
{
  "greeting": "Hello, {{name}}!"
}

// In component:
<p>{t('greeting', { name: user.firstName })}</p>
```

### Handle Plurals

```javascript
// In translation files:
{
  "itemCount": "{{count}} item",
  "itemCount_plural": "{{count}} items"
}

// In component (i18next handles plural automatically):
<p>{t('itemCount', { count: cartItems.length })}</p>
```

---

## Translation File Structure

```
common/          → Buttons, actions, common terms
nav/             → Navigation items
auth/            → Login, register, authentication
home/            → Home page
footer/          → Footer
products/        → Products and shopping
cart/            → Shopping cart
orders/          → Order management
dashboard/       → Artisan dashboard
community/       → Community features
profile/         → User profile
language/        → Language selection
```

---

## Supported Languages

| Code | Language | Regional Variant |
|------|----------|------------------|
| `en` | English | Default |
| `fr-CA` | Français | Canada |

---

## Get Current Language

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { i18n } = useTranslation();
  
  console.log('Current language:', i18n.language); // 'en' or 'fr-CA'
}
```

---

## Change Language Programmatically

```javascript
import i18n from '../i18n';

// Change to French
i18n.changeLanguage('fr-CA');

// Change to English  
i18n.changeLanguage('en');
```

---

## Canadian French Terminology

| English | ❌ European French | ✅ Canadian French |
|---------|-------------------|-------------------|
| Email | E-mail | Courriel |
| To shop | Faire du shopping | Magasiner |
| Chat | Chat | Clavardage |
| Download | Downloader | Télécharger |
| Weekend | Week-end | Fin de semaine |
| Parking | Parking | Stationnement |

---

## Debug Language Issues

### Check current language:
```javascript
console.log('Current language:', i18n.language);
console.log('Language in localStorage:', localStorage.getItem('language'));
```

### Check if key exists:
```javascript
console.log('Key exists:', i18n.exists('section.key'));
```

### Get translation without component:
```javascript
import i18n from '../i18n';
const translation = i18n.t('section.key');
```

---

## Common Patterns

### Conditional Text
```javascript
{user.role === 'artisan' ? t('nav.dashboard') : t('nav.shop')}
```

### Button Labels
```javascript
<button>{t('common.save')}</button>
<button>{t('common.cancel')}</button>
<button>{t('common.delete')}</button>
```

### Form Labels
```javascript
<label>{t('auth.email')}</label>
<input placeholder={t('auth.emailPlaceholder')} />
```

### Status Messages
```javascript
{loading && <p>{t('common.loading')}</p>}
{error && <p>{t('common.error')}</p>}
{success && <p>{t('common.success')}</p>}
```

---

## Testing Checklist

- [ ] Add keys to both en.json and fr-CA.json
- [ ] Test with English selected
- [ ] Test with French selected  
- [ ] Check for layout issues with longer French text
- [ ] Verify no keys showing instead of text
- [ ] Test with variables and plurals

---

## User Flow

```
Registration → Language Captured → Database
Login → Language Loaded → UI Updates
Language Switch → UI Updates → Database Synced
Logout → Language Persists (localStorage)
```

---

## Files to Know

| Purpose | File Path |
|---------|-----------|
| i18n Config | `/frontend/src/i18n.js` |
| English Translations | `/frontend/src/locales/en.json` |
| French Translations | `/frontend/src/locales/fr-CA.json` |
| Language Switcher | `/frontend/src/components/LanguageSwitcher.jsx` |
| Auth Integration | `/frontend/src/contexts/AuthContext.jsx` |
| Backend Profile API | `/backend/routes/profile/index.js` |
| Backend Auth API | `/backend/routes/auth/index.js` |

---

## Need Help?

1. Check [Full Documentation](./INTERNATIONALIZATION_IMPLEMENTATION.md)
2. Look for 🌐 emoji in browser console logs
3. Verify keys exist in both translation files
4. Test language switcher in navbar

---

**Last Updated**: October 14, 2025

