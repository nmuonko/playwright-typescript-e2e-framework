/**
 * Search and recommendations call live third-party catalogues; uncontended search takes ~6s, so
 * assertions that wait for catalogue results use this budget instead of the 15s default.
 */
export const CATALOG_TIMEOUT_MS = 30_000;

/** French UI copy rendered by afrishop-usa.com (default locale). Kept here so tests read as behaviour. */
export const fr = {
  searchPlaceholder: 'Rechercher des millions de produits...',
  searchButton: 'Rechercher',
  sort: { cheapest: "Moins cher d'abord", newest: 'Nouveautés', priciest: "Plus cher d'abord" },
  searchHeading: (q: string) => `Résultats pour "${q}"`,
  resultsCount: /(\d[\d,\s]*) produits? affichés?/,
  noResults: 'Aucun produit trouvé',
  clearSearch: 'Effacer la recherche',
  addToCart: 'Ajouter au panier',
  cart: {
    heading: 'Votre panier',
    empty: 'Votre panier est vide',
    clear: 'Vider le panier',
    deselectAll: 'Tout désélectionner',
    summary: 'Résumé de la commande',
    checkout: (n: number) => `Procéder au paiement (${n})`,
  },
  checkout: {
    heading: 'Finaliser votre commande',
    orderHeading: 'Votre commande',
    fullName: 'Nom complet *',
    email: 'Email *',
    phone: 'Téléphone *',
    address: 'Adresse *',
    city: 'Ville *',
    country: 'Pays',
    submit: 'Continuer vers le paiement',
    accountExists: 'Ce compte existe déjà. Connectez-vous ci-dessous.',
  },
  trackOrder: { placeholder: 'Ex: AFS-XXXX-XXXX', notFound: 'Commande non trouvée' },
  nav: [
    { label: 'Parcourir', path: '/' },
    { label: 'Coller', path: '/paste-link' },
    { label: 'Panier', path: '/cart' },
    { label: 'Favoris', path: '/saved' },
    { label: 'Commandes', path: '/my-orders' },
    { label: 'Compte', path: '/account' },
  ],
  countries: [{ button: 'Acheter depuis Turquie', path: '/turkey' }],
} as const;
