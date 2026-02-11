import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const ProductGrid = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  
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

    // Then filter by search
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      const searchIds = new Set(searchResults.map(r => r.item.id));
      products = products.filter(p => searchIds.has(p.id));
    }

    return products;
  }, [searchQuery, selectedCategory, fuse]);

  const handleAddToCart = useCallback((product: Product) => {
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
      {/* Order Type Selection */}
      <div className="p-4 border-b bg-card">
        <Tabs value={orderType} onValueChange={(v) => {
            setOrderType(v as any);
            if (v === 'dine_in' && !tableId) setShowTableModal(true);
            if (v === 'take_away') setShowCustomerModal(true);
            if (v === 'delivery') setShowRiderModal(true);
          }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="dine_in" className="flex items-center gap-2 h-9">
              <Utensils className="h-4 w-4" />
              <span className="hidden sm:inline">Dine In</span>
            </TabsTrigger>
            <TabsTrigger value="take_away" className="flex items-center gap-2 h-9">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Take Away</span>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2 h-9">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Delivery</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
