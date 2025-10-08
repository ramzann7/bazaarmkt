# BazaarMkt Internationalization (i18n) Implementation

## Overview
This document describes the French-Canadian (fr-CA) internationalization implementation for BazaarMkt.

## Installation Completed
✅ Packages installed:
- `react-i18next`
- `i18next`
- `i18next-browser-languagedetector`
- `i18next-http-backend`

## Core Configuration

### 1. i18n Configuration (`/src/i18n.js`)
- Configured for English and Canadian French (fr-CA)
- Auto-detect user language
- Store language preference in localStorage
- Fallback to English

### 2. Translation Files
- `/src/locales/en.json` - English translations
- `/src/locales/fr-CA.json` - Canadian French translations

### 3. Language Switcher Component
- Located at `/src/components/LanguageSwitcher.jsx`
- Dropdown with Canadian flag for both languages
- Shows current language selection
- Integrated into Navbar

## Canadian French Specifics

### Key Terminology Differences (fr-CA vs fr-FR):
1. **Email**: "Courriel" (fr-CA) vs "E-mail" (fr-FR)
2. **Shopping**: "Magasiner" (fr-CA) vs "Faire du shopping" (fr-FR)
3. **App**: "Application" is same, but pronunciation differs
4. **Phone**: "Téléphone" (same spelling, different pronunciation)

### Common Canadian French Terms Used:
- "Magasiner" - to shop
- "Courriel" - email
- "Paiement" - payment
- "Livraison" - delivery
- "Commande" - order
- "Panier" - cart
- "Compte" - account

## Usage in Components

### Basic Usage:
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <p>{t('home.hero.subtitle')}</p>
    </div>
  );
}
```

### With Variables:
```jsx
// In translation file:
{
  "welcome": "Welcome, {{name}}!"
}

// In component:
<p>{t('welcome', { name: user.firstName })}</p>
```

### Plural Forms:
```jsx
// In translation file:
{
  "itemCount": "{{count}} item",
  "itemCount_plural": "{{count}} items"
}

// In component:
<p>{t('itemCount', { count: items.length })}</p>
```

## Implementation Checklist

### ✅ Completed
1. Installed i18n packages
2. Created i18n configuration
3. Created English translation file
4. Created Canadian French translation file
5. Created LanguageSwitcher component
6. Integrated i18n into App.jsx
7. Added LanguageSwitcher to Navbar

### 🔲 To Complete (Per Component)
Each component needs to be updated to use translations. Here's the process:

1. Import useTranslation hook
2. Replace hard-coded strings with t() function
3. Test in both languages
4. Add new translation keys as needed

### Components to Update:
- [ ] home.jsx
- [ ] Footer.jsx (partially done - keys added)
- [ ] login.jsx
- [ ] register.jsx
- [ ] Profile.jsx
- [ ] Cart.jsx
- [ ] Orders.jsx
- [ ] Dashboard components
- [ ] BuyingLocal.jsx
- [ ] HowItWorks.jsx
- [ ] RevenueTransparency.jsx
- [ ] DashboardHighlights.jsx
- [ ] Community.jsx
- [ ] ProductCard.jsx
- [ ] SearchResults.jsx
- [ ] ArtisanShop.jsx
- [ ] And all other components...

## Example Component Implementation

### Before:
```jsx
function Home() {
  return (
    <div>
      <h1>Discover Local Artisans</h1>
      <p>Support your community</p>
      <button>Start Shopping</button>
    </div>
  );
}
```

### After:
```jsx
import { useTranslation } from 'react-i18next';

function Home() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('home.hero.title')}</h1>
      <p>{t('home.hero.subtitle')}</p>
      <button>{t('home.hero.cta')}</button>
    </div>
  );
}
```

## Translation Key Structure

The translation files use nested objects for organization:

```
common/          - Shared terms (buttons, actions, etc.)
nav/             - Navigation items
auth/            - Authentication (login, register)
home/            - Home page
footer/          - Footer content
products/        - Product-related terms
cart/            - Shopping cart
orders/          - Order management
dashboard/       - Dashboard terms
buyingLocal/     - Why Buy Local page
howItWorks/      - How It Works page
transparency/    - Revenue & Payouts page
dashboardHighlights/ - Dashboard Benefits page
community/       - Community features
profile/         - User profile
language/        - Language selector
```

## Testing

### Manual Testing:
1. Switch language using the language selector in navbar
2. Navigate through all pages
3. Verify all text is translated
4. Check for missing translations (will show the key instead)
5. Test with both authenticated and non-authenticated users

### Language Persistence:
- Language choice is saved in localStorage
- Persists across sessions
- Auto-loads on app start

## Adding New Translations

When adding new features:

1. Add English text to `/src/locales/en.json`
2. Add Canadian French translation to `/src/locales/fr-CA.json`
3. Use the translation key in your component
4. Test in both languages

## Best Practices

1. **Use Descriptive Keys**: `home.hero.title` not `title1`
2. **Keep Related Keys Together**: Group by page or feature
3. **Avoid Hard-Coded Text**: All user-facing text should be translatable
4. **Context Matters**: Same English word might need different French translations
5. **Canadian French**: Always use Canadian French terminology, not European French
6. **Test Both Languages**: Always test your changes in both English and French
7. **Complete Sentences**: Translate complete sentences, not fragments

## Support

For translation questions or Canadian French specifics, consult:
- Office québécois de la langue française (OQLF)
- Canadian government style guides
- Local French-Canadian speakers

## Notes

- The system supports adding more languages in the future
- Currently limited to English and Canadian French as per requirements
- All authenticated users can select their preferred language
- Language preference is user-specific and persists across sessions

