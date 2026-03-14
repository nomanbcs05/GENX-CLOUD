import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, X, Grid3x3, Package, Coffee, UtensilsCrossed, Gift, IceCream, Utensils, ShoppingBag, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCartStore, Product } from '@/stores/cartStore';
import { api } from '@/services/api';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import TableSelectionModal from './TableSelectionModal';
import CustomerSelectionModal from './CustomerSelectionModal';
import RiderSelectionModal from './RiderSelectionModal';
import ArabicBroastModal from './ArabicBroastModal';
import PizzaSelectionModal from './PizzaSelectionModal';
import RollSelectionModal from './RollSelectionModal';
import BroastSelectionModal from './BroastSelectionModal';
import BurgerSelectionModal from './BurgerSelectionModal';
import BarBQSelectionModal from './BarBQSelectionModal';
import SauceToppingSelectionModal from './SauceToppingSelectionModal';

const ProductGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showBroastModal, setShowBroastModal] = useState(false);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [showRollModal, setShowRollModal] = useState(false);
  const [showSimpleBroastModal, setShowSimpleBroastModal] = useState(false);
  const [showBurgerModal, setShowBurgerModal] = useState(false);
  const [showBarBQModal, setShowBarBQModal] = useState(false);
  const [showSauceToppingModal, setShowSauceToppingModal] = useState(false);
  
  const { data: openRegister } = useQuery({
    queryKey: ['open-register'],
    queryFn: api.registers.getOpen,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const { 
    addItem,
    orderType,
    setOrderType,
    tableId
  } = useCartStore();

  // Fetch Products
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.getAll,
  });

  // Automatically seed menu items if none exist
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const seedMenu = useCallback(async () => {
    try {
      setSeeding(true);
      toast.loading('Seeding menu items...', { id: 'seed-toast' });
      const success = await api.products.seedPizzaBurgerHouse();
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        toast.success('Menu items seeded successfully!', { id: 'seed-toast' });
      }
    } catch (error: any) {
      console.error('Seed error:', error);
      toast.error(`Failed to seed menu: ${error.message}`, { id: 'seed-toast' });
    } finally {
      setSeeding(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!productsLoading) {
      const hasPizza = allProducts.some(p => p.category === 'Pizzas');
      const hasRolls = allProducts.some(p => p.category === 'Rolls');
      
      if (!hasPizza || !hasRolls) {
        seedMenu();
      }
    }
  }, [allProducts, productsLoading, seedMenu]);

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.getAll,
  });

  // New Menu Categories to show
  const NEW_MENU_CATEGORIES = ['Deals', 'Burgers', 'Rolls', 'Pizzas', 'Fries', 'ALA CART', 'Beverages'];

  // Combine default "All" category with fetched categories, but filter for new menu only
  const allCategories = useMemo(() => [
    { id: 'all', name: 'All Category', icon: 'Grid3x3' },
    ...categories
      .filter(c => NEW_MENU_CATEGORIES.includes(c.name))
      .map(c => ({ id: c.name, name: c.name, icon: c.icon }))
  ], [categories]);

  const fuse = useMemo(() => new Fuse(allProducts, {
    keys: ['name', 'sku', 'barcode'],
    threshold: 0.3,
  }), [allProducts]);

  const filteredProducts = useMemo(() => {
    // Only show products from the new menu categories
    let products = allProducts.filter(p => NEW_MENU_CATEGORIES.includes(p.category));

    // Filter by selected category
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }

    // Then filter by search
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      const searchIds = new Set(searchResults.map(r => r.item.id));
      products = products.filter(p => searchIds.has(p.id));
    }

    return products;
  }, [searchQuery, selectedCategory, fuse, allProducts]);

  const handleAddToCart = useCallback((product: Product) => {
    if ((product as any).isVirtual) {
      if ((product as any).modalType === 'broast') {
        setShowBroastModal(true);
      } else if ((product as any).modalType === 'pizza') {
        setShowPizzaModal(true);
      } else if ((product as any).modalType === 'roll') {
        setShowRollModal(true);
      } else if ((product as any).modalType === 'simple-broast') {
        setShowSimpleBroastModal(true);
      } else if ((product as any).modalType === 'burger') {
        setShowBurgerModal(true);
      } else if ((product as any).modalType === 'barbq') {
        setShowBarBQModal(true);
      } else if ((product as any).modalType === 'sauce-topping') {
        setShowSauceToppingModal(true);
      }
      return;
    }
    addItem(product);
  }, [addItem]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Order Type Selection */}
      <div className="p-4 border-b bg-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
            />
          </div>
          <Button 
            variant={orderType === 'dine_in' ? "default" : "outline"}
            className={cn(
              "h-11 flex items-center justify-center gap-2 text-base font-medium transition-all",
              orderType === 'dine_in' ? "bg-white text-blue-600 hover:bg-slate-50 border-2 border-blue-600 shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
            onClick={() => {
              setOrderType('dine_in');
              if (!tableId) setShowTableModal(true);
            }}
          >
            <Utensils className="h-5 w-5" />
            Dine In
          </Button>
          <Button 
            variant={orderType === 'take_away' ? "default" : "outline"}
            className={cn(
              "h-11 flex items-center justify-center gap-2 text-base font-medium transition-all",
              orderType === 'take_away' ? "bg-white text-blue-600 hover:bg-slate-50 border-2 border-blue-600 shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
            onClick={() => {
              setOrderType('take_away');
              setShowCustomerModal(true);
            }}
          >
            <ShoppingBag className="h-5 w-5" />
            Take Away
          </Button>
          <Button 
            variant={orderType === 'delivery' ? "default" : "outline"}
            className={cn(
              "h-11 flex items-center justify-center gap-2 text-base font-medium transition-all",
              orderType === 'delivery' ? "bg-white text-blue-600 hover:bg-slate-50 border-2 border-blue-600 shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
            onClick={() => {
              setOrderType('delivery');
              setShowCustomerModal(true);
            }}
          >
            <Truck className="h-5 w-5" />
            Delivery
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full hover:bg-slate-100"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>

          <div 
            ref={scrollContainerRef}
            className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-1"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {allCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className={cn(
                  "whitespace-nowrap px-6 h-9 rounded-full transition-all text-sm font-bold font-heading uppercase tracking-wide",
                  selectedCategory === category.id 
                    ? "bg-white text-blue-600 border-2 border-blue-600 shadow-md" 
                    : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100 hover:text-blue-600"
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full hover:bg-slate-100"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </Button>
          
          <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => seedMenu()}
            className="whitespace-nowrap text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors shrink-0"
          >
            Refresh Menu
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {productsLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-xl" />
            ))
          ) : (
            filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={handleAddToCart} 
              />
            ))
          )}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try adjusting your search or category filter</p>
          </div>
        )}
      </ScrollArea>
      
      <TableSelectionModal 
        isOpen={showTableModal} 
        onClose={() => setShowTableModal(false)} 
      />
      
      <CustomerSelectionModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSaved={() => {
          if (orderType === 'delivery') {
            setShowRiderModal(true);
          }
        }}
      />

      <RiderSelectionModal
        isOpen={showRiderModal}
        onClose={() => setShowRiderModal(false)}
      />

      <ArabicBroastModal
        isOpen={showBroastModal}
        onClose={() => setShowBroastModal(false)}
        products={allProducts.filter(p => p.category === 'Arabic Broast')}
        onAdd={handleAddToCart}
      />

      <PizzaSelectionModal
        isOpen={showPizzaModal}
        onClose={() => setShowPizzaModal(false)}
        onAdd={handleAddToCart}
      />

      <RollSelectionModal
         isOpen={showRollModal}
         onClose={() => setShowRollModal(false)}
         onAdd={handleAddToCart}
       />

       <BroastSelectionModal
          isOpen={showSimpleBroastModal}
          onClose={() => setShowSimpleBroastModal(false)}
          onAdd={handleAddToCart}
        />

        <BurgerSelectionModal
           isOpen={showBurgerModal}
           onClose={() => setShowBurgerModal(false)}
           onAdd={handleAddToCart}
         />

         <BarBQSelectionModal
           isOpen={showBarBQModal}
          onClose={() => setShowBarBQModal(false)}
          onAdd={handleAddToCart}
        />

        <SauceToppingSelectionModal
          isOpen={showSauceToppingModal}
          onClose={() => setShowSauceToppingModal(false)}
          onAdd={handleAddToCart}
        />
      </div>
  );
};

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard = ({ product, onAdd }: ProductCardProps) => {
  const isNoImageCategory = ['Burgers', 'Rolls', 'Pizzas', 'Fries', 'ALA CART', 'Beverages', 'Deals'].includes(product.category);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | undefined>((product.image as any));
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const fallbacks: string[] = (product as any).imageFallbacks || [];
  const imageHeightClass = "h-20 md:h-24";

  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAdd(product)}
      className={cn(
        "relative w-full aspect-square p-3 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all",
        "hover:shadow-lg hover:border-blue-200 hover:bg-blue-50/30",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        "flex flex-col items-center justify-center text-center gap-2 group overflow-hidden"
      )}
    >
      <div className="absolute top-2 right-2">
        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none text-[9px] font-bold">
          Rs {product.price}
        </Badge>
      </div>

      {product.image && (
        <div className={cn(
          "relative mb-1 w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-50/50 p-2",
          imageHeightClass
        )}>
          {currentSrc && (currentSrc.startsWith('http') || currentSrc.startsWith('/')) ? (
            <>
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 animate-pulse bg-slate-200/50 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                </div>
              )}
              {imageError ? (
                <span className="text-3xl opacity-50">📦</span>
              ) : (
                <img 
                  src={currentSrc} 
                  alt={product.name} 
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    if (fallbackIndex < fallbacks.length) {
                      setCurrentSrc(fallbacks[fallbackIndex]);
                      setFallbackIndex(fallbackIndex + 1);
                    } else {
                      setImageError(true);
                    }
                  }}
                  className={cn(
                    "h-full w-full object-contain transition-all duration-500",
                    imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  )}
                />
              )}
            </>
          ) : (
            <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
              {product.image}
            </span>
          )}
        </div>
      )}
      
      <div className="space-y-0.5">
        <h3 className="font-black font-heading text-slate-900 leading-tight line-clamp-2 px-1 text-[11px] md:text-xs tracking-tight uppercase">
          {product.name}
        </h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {product.category}
        </p>
      </div>
    </motion.button>
  );
};

export default ProductGrid;
