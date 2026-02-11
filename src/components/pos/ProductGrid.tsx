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

  // Automatically seed Arabic Broast items if none exist
  const queryClient = useQueryClient();
  const { mutate: seedMenu } = useMutation({
    mutationFn: api.products.seedArabicBroast,
    onMutate: () => {
      toast.loading('Seeding menu items...', { id: 'seed-toast' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Menu items seeded successfully!', { id: 'seed-toast' });
    },
    onError: (error: any) => {
      console.error('Seed error:', error);
      toast.error(`Failed to seed menu: ${error.message}`, { id: 'seed-toast' });
    }
  });

  useEffect(() => {
    if (!productsLoading) {
      const hasArabicBroast = allProducts.some(p => p.category === 'Arabic Broast');
      const hasBeverages = allProducts.some(p => p.category === 'Beverages');
      
      if (!hasArabicBroast || !hasBeverages) {
        seedMenu();
      }
    }
  }, [allProducts, productsLoading, seedMenu]);

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.getAll,
  });

  // Combine default "All" category with fetched categories
  const allCategories = useMemo(() => [
    { id: 'all', name: 'All Items', icon: 'Grid3x3' },
    ...categories.map(c => ({ id: c.name, name: c.name, icon: c.icon }))
  ], [categories]);

  const fuse = useMemo(() => new Fuse(allProducts, {
    keys: ['name', 'sku', 'barcode'],
    threshold: 0.3,
  }), [allProducts]);

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    // Filter by category first
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }

    // Special logic for Arabic Broast: 
    // If NOT in the "Arabic Broast" category, hide individual items and only show the main "Injected Broast" card
    if (selectedCategory !== 'Arabic Broast') {
      const isBroastItem = (p: any) => p.category === 'Arabic Broast';
      const broastProducts = allProducts.filter(isBroastItem);
      
      if (broastProducts.length > 0) {
        // Remove individual broast items from the current filtered list
        products = products.filter(p => !isBroastItem(p));
        
        // Add a single virtual product for "Injected Broast"
        const virtualBroast = {
          id: 'virtual-arabic-broast',
          name: 'Arabic Injected Broast',
          price: 0,
          category: 'Arabic Broast',
          image: '🍗',
          isVirtual: true,
          modalType: 'broast'
        };
        
        // Only show it if it matches search or search is empty
        if (!searchQuery.trim() || virtualBroast.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          products = [...products, virtualBroast as any];
        }
      }
    } else {
      // If we ARE in the "Arabic Broast" category, don't show the virtual card
      products = products.filter(p => !(p as any).isVirtual);
    }

    // Special logic for Pizzas:
    // We want the Pizza Menu card to ALWAYS show up in 'all' category or 'Pizzas' category
    const isPizzasVisible = selectedCategory === 'all' || selectedCategory === 'Pizzas';
    
    if (isPizzasVisible) {
      const isPizzaItem = (p: any) => p.category === 'Pizzas';
      
      // Remove any individual pizza items that might be in the database
      products = products.filter(p => !isPizzaItem(p));
      
      const virtualPizza = {
        id: 'virtual-pizza-menu',
        name: 'Pizzas Menu',
        price: 0,
        category: 'Pizzas',
        image: '🍕',
        isVirtual: true,
        modalType: 'pizza'
      };
      
      // Add the virtual pizza card at the beginning if it matches search
      if (!searchQuery.trim() || virtualPizza.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        products = [virtualPizza as any, ...products];
      }
    } else {
       // If we are in another category, hide any pizza items
       products = products.filter(p => p.category !== 'Pizzas' && !(p as any).isVirtual);
     }

     // Special logic for Rolls:
     const isRollsVisible = selectedCategory === 'all' || selectedCategory === 'Rolls';
     
     if (isRollsVisible) {
       const isRollItem = (p: any) => p.category === 'Rolls';
       products = products.filter(p => !isRollItem(p));
       
       const virtualRoll = {
         id: 'virtual-roll-menu',
         name: 'Rolls Menu',
         price: 0,
         category: 'Rolls',
         image: '🌯',
         isVirtual: true,
         modalType: 'roll'
       };
       
       if (!searchQuery.trim() || virtualRoll.name.toLowerCase().includes(searchQuery.toLowerCase())) {
         products = [virtualRoll as any, ...products];
       }
     } else {
       products = products.filter(p => p.category !== 'Rolls' && !(p as any).isVirtual);
     }

     // Special logic for Simple Broast:
     const isSimpleBroastVisible = selectedCategory === 'all' || selectedCategory === 'Broast';
     
     if (isSimpleBroastVisible) {
       const isSimpleBroastItem = (p: any) => p.category === 'Broast';
       products = products.filter(p => !isSimpleBroastItem(p));
       
       const virtualBroast = {
         id: 'virtual-broast-menu',
         name: 'Broast Menu',
         price: 0,
         category: 'Broast',
         image: '🍗',
         isVirtual: true,
         modalType: 'simple-broast'
       };
       
       if (!searchQuery.trim() || virtualBroast.name.toLowerCase().includes(searchQuery.toLowerCase())) {
         products = [virtualBroast as any, ...products];
       }
     } else {
       products = products.filter(p => p.category !== 'Broast' && !(p as any).isVirtual);
     }

     // Special logic for Burgers:
     const isBurgersVisible = selectedCategory === 'all' || selectedCategory === 'Burgers';
     
     if (isBurgersVisible) {
       const isBurgerItem = (p: any) => p.category === 'Burgers';
       products = products.filter(p => !isBurgerItem(p));
       
       const virtualBurger = {
         id: 'virtual-burger-menu',
         name: 'Burgers Menu',
         price: 0,
         category: 'Burgers',
         image: '🍔',
         isVirtual: true,
         modalType: 'burger'
       };
       
       if (!searchQuery.trim() || virtualBurger.name.toLowerCase().includes(searchQuery.toLowerCase())) {
         products = [virtualBurger as any, ...products];
       }
     } else {
       products = products.filter(p => p.category !== 'Burgers' && !(p as any).isVirtual);
     }

     // Special logic for BAR BQ:
     const isBarBQVisible = selectedCategory === 'all' || selectedCategory === 'BAR BQ';
     
     if (isBarBQVisible) {
       const isBarBQItem = (p: any) => p.category === 'BAR BQ';
       products = products.filter(p => !isBarBQItem(p));
       
       const virtualBarBQ = {
         id: 'virtual-barbq-menu',
         name: 'BAR BQ Menu',
         price: 0,
         category: 'BAR BQ',
         image: '🔥',
         isVirtual: true,
         modalType: 'barbq'
       };
       
       if (!searchQuery.trim() || virtualBarBQ.name.toLowerCase().includes(searchQuery.toLowerCase())) {
         products = [virtualBarBQ as any, ...products];
       }
     } else {
       products = products.filter(p => p.category !== 'BAR BQ' && !(p as any).isVirtual);
     }

     // Special logic for Sauces & Toppings:
     const isSauceToppingVisible = selectedCategory === 'all' || selectedCategory === 'Sauces' || selectedCategory === 'Toppings' || selectedCategory === 'ALA CART';
     
     if (isSauceToppingVisible) {
       const isSauceToppingItem = (p: any) => p.category === 'Sauces' || p.category === 'Toppings';
       products = products.filter(p => !isSauceToppingItem(p));
       
       const virtualSauceTopping = {
         id: 'virtual-sauce-topping-menu',
         name: 'Sauces & Toppings',
         price: 0,
         category: 'ALA CART',
         image: '🥣',
         isVirtual: true,
         modalType: 'sauce-topping'
       };
       
       if (!searchQuery.trim() || virtualSauceTopping.name.toLowerCase().includes(searchQuery.toLowerCase())) {
         products = [virtualSauceTopping as any, ...products];
       }
     } else {
       products = products.filter(p => p.category !== 'Sauces' && p.category !== 'Toppings' && !(p as any).isVirtual);
     }

     // Then filter by search
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      const searchIds = new Set(searchResults.map(r => r.item.id));
      products = products.filter(p => searchIds.has(p.id) || (p as any).isVirtual);
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
    if (!openRegister) {
      toast.error('Please start the day shift before taking orders');
      return;
    }
    addItem(product);
  }, [addItem, openRegister]);

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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-blue-600 text-white placeholder:text-blue-100 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button 
            variant={orderType === 'dine_in' ? "default" : "outline"}
            className={cn(
              "h-11 flex items-center justify-center gap-2 text-base font-medium transition-all",
              orderType === 'dine_in' ? "bg-blue-600 text-white hover:bg-blue-700 border-none" : "bg-blue-600 text-white hover:bg-blue-700 border-none"
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
              orderType === 'take_away' ? "bg-blue-600 text-white hover:bg-blue-700 border-none" : "bg-blue-600 text-white hover:bg-blue-700 border-none"
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
              orderType === 'delivery' ? "bg-blue-600 text-white hover:bg-blue-700 border-none" : "bg-blue-600 text-white hover:bg-blue-700 border-none"
            )}
            onClick={() => {
              setOrderType('delivery');
              setShowRiderModal(true);
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
                  "whitespace-nowrap px-6 h-9 rounded-full transition-all text-sm font-semibold",
                  selectedCategory === category.id 
                    ? "bg-blue-600 text-white border-none shadow-md" 
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
  const isNoImageCategory = product.category === 'Arabic Broast' || product.category === 'ALA CART' || product.category === 'Snacks' || product.category === 'Beverages' || product.category === 'Pizzas' || product.category === 'Rolls' || product.category === 'Broast' || product.category === 'Burgers' || product.category === 'BAR BQ' || product.category === 'Sauces' || product.category === 'Toppings';
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.button
      whileHover={{ scale: 1.02, translateY: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAdd(product)}
      className={cn(
        "relative w-full aspect-square p-3 bg-white rounded-xl border border-slate-100 shadow-sm transition-all",
        "hover:shadow-md hover:border-blue-200 hover:bg-blue-50/30",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
        "flex flex-col items-center justify-center text-center gap-1.5 group"
      )}
    >
      {!isNoImageCategory && product.image && (
        <div className="relative mb-0.5 h-14 w-full flex items-center justify-center overflow-hidden rounded-lg bg-slate-50/50">
          {product.image.startsWith('http') ? (
            <>
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 animate-pulse bg-slate-200/50 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                </div>
              )}
              {imageError ? (
                <span className="text-xl opacity-50">📦</span>
              ) : (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={cn(
                    "h-full w-full object-contain p-0.5 transition-all duration-500",
                    imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  )} 
                />
              )}
            </>
          ) : (
            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
              {product.image}
            </span>
          )}
        </div>
      )}
      
      <h3 className={cn(
        "font-bold text-slate-800 leading-tight line-clamp-2 px-1 text-[11px] md:text-xs",
        isNoImageCategory && "text-xs md:text-sm"
      )}>
        {product.name}
      </h3>
    </motion.button>
  );
};

export default ProductGrid;
