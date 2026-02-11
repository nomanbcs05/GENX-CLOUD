import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, X, Grid3x3, Package, Coffee, UtensilsCrossed, Gift, IceCream, Utensils, ShoppingBag, Truck } from 'lucide-react';
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

const ProductGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showBroastModal, setShowBroastModal] = useState(false);
  
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  useEffect(() => {
    const hasArabicBroast = allProducts.some(p => p.category === 'Arabic Broast');
    if (!productsLoading && !hasArabicBroast) {
      seedMenu();
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
    ...categories
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
    // If not in the "Arabic Broast" category, hide individual items and only show the main "Injected Broast" card
    if (selectedCategory !== 'Arabic Broast') {
      const isBroastItem = (p: any) => p.category === 'Arabic Broast';
      const broastProducts = products.filter(isBroastItem);
      
      if (broastProducts.length > 0) {
        // Remove individual broast items
        products = products.filter(p => !isBroastItem(p));
        
        // Add a single virtual product for "Injected Broast"
        // We use a unique ID that won't conflict
        const virtualBroast = {
          id: 'virtual-arabic-broast',
          name: 'Arabic Injected Broast',
          price: 0,
          category: 'Arabic Broast',
          image: '🍗',
          isVirtual: true
        };
        
        // Only show it if it matches search or search is empty
        if (!searchQuery.trim() || virtualBroast.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          products = [...products, virtualBroast as any];
        }
      }
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
      setShowBroastModal(true);
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
      <div className="p-4 border-b bg-card">
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            {allCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className={cn(
                  "whitespace-nowrap transition-all",
                  selectedCategory === category.id && "shadow-md"
                )}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAdd={handleAddToCart} 
            />
          ))}
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
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const ProductCard = ({ product, onAdd }: ProductCardProps) => {
  const isLowStock = product.stock <= 10;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAdd(product)}
      className={cn(
        "relative w-full p-4 bg-card rounded-lg border shadow-card transition-all",
        "hover:shadow-hover hover:border-primary/20",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        "flex flex-col items-center text-center"
      )}
    >
      {isLowStock && (
        <span className="low-stock-badge">Low Stock</span>
      )}
      
      <div className="mb-3 h-24 w-full flex items-center justify-center bg-secondary/20 rounded-md overflow-hidden">
        {product.image?.startsWith('http') ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">{product.image}</span>
        )}
      </div>
      
      <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
        {product.name}
      </h3>
    </motion.button>
  );
};

export default ProductGrid;
