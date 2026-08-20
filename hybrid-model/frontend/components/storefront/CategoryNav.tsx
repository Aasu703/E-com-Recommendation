import { useCategories } from '../../hooks/useRecommendations';

// Loading fallback only — the live list is fetched from the catalogue so the
// filter never drifts from the backend's actual categories.
const FALLBACK_CATEGORIES = [
  'Traditional Attire',
  'Handicrafts & Art',
  'Electronics',
  'Kitchen & Home',
  'Daily Groceries',
  'Fashion & Accessories',
  'Books & Education',
];

interface CategoryNavProps {
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
}

export function CategoryNav({ activeCategory, setActiveCategory }: CategoryNavProps) {
  const { categories } = useCategories();
  const list = categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <div className="w-full border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              activeCategory === null
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {list.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeCategory === c
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}