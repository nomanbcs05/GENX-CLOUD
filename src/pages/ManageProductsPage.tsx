import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, Edit, Trash2, Package, Loader2, Settings, 
  X, ChevronRight, Upload, Check, MoreVertical
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

const ManageProductsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'addons'>('products');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Form State
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    kitchen: '',
    image: '',
    hasVariants: false,
    variants: [] as any[],
    selectedAddons: [] as string[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-with-details'],
    queryFn: api.products.getWithDetails,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.getAll,
  });

  const { data: addons = [] } = useQuery({
    queryKey: ['addons'],
    queryFn: api.addons.getAll,
  });

  const { data: kitchens = [] } = useQuery({
    queryKey: ['kitchens'],
    queryFn: api.kitchens.getAll,
  });

  // Mutations
  const uploadImageMutation = useMutation({
    mutationFn: api.products.uploadImage,
    onSuccess: (url) => {
      setProductForm(prev => ({ ...prev, image: url }));
      toast({ title: "Success", description: "Image uploaded successfully" });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImageMutation.mutate(file);
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: '',
      kitchen: '',
      image: '',
      hasVariants: false,
      variants: [],
      selectedAddons: [],
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* Header Tabs */}
        <div className="bg-white border-b px-8 pt-6">
          <div className="flex items-center gap-8 mb-[-1px]">
            <button 
              onClick={() => setActiveTab('products')}
              className={cn(
                "pb-4 text-sm font-bold transition-colors relative",
                activeTab === 'products' ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Manage Product
              {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={cn(
                "pb-4 text-sm font-bold transition-colors relative",
                activeTab === 'categories' ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Manage Category
              {activeTab === 'categories' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('addons')}
              className={cn(
                "pb-4 text-sm font-bold transition-colors relative",
                activeTab === 'addons' ? "text-emerald-500" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Manage Add-ons
              {activeTab === 'addons' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900">Manage Products</h1>
            <Button 
              onClick={() => { resetForm(); setIsProductModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Product
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search for Name, Number, etc."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 bg-white border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              Show Entries:
              <select className="bg-white border-slate-200 rounded-lg p-1 px-2 outline-none">
                <option>000</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1 flex flex-col shadow-sm">
            <Table>
              <TableHeader className="bg-emerald-400 hover:bg-emerald-400">
                <TableRow className="border-none hover:bg-emerald-400">
                  <TableHead className="text-white font-black uppercase text-[11px] tracking-wider py-4">Name</TableHead>
                  <TableHead className="text-white font-black uppercase text-[11px] tracking-wider py-4">Price</TableHead>
                  <TableHead className="text-white font-black uppercase text-[11px] tracking-wider py-4">Category</TableHead>
                  <TableHead className="text-white font-black uppercase text-[11px] tracking-wider py-4">Name of Kitchen</TableHead>
                  <TableHead className="text-white font-black uppercase text-[11px] tracking-wider py-4">Available</TableHead>
                  <TableHead className="text-white font-black uppercase text-[11px] tracking-wider py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isProductsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.map((product: any) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="font-bold text-slate-700 py-4">{product.name}</TableCell>
                    <TableCell className="font-bold text-slate-700 py-4">Rs {product.price.toLocaleString()}</TableCell>
                    <TableCell className="py-4">
                      <select className="bg-slate-50 border-none rounded-lg p-1.5 px-3 text-sm font-medium outline-none w-full max-w-[150px]">
                        <option>{product.category}</option>
                      </select>
                    </TableCell>
                    <TableCell className="py-4">
                      <select className="bg-slate-50 border-none rounded-lg p-1.5 px-3 text-sm font-medium outline-none w-full max-w-[150px]">
                        <option>Name of Kitchen</option>
                      </select>
                    </TableCell>
                    <TableCell className="py-4">
                      <Switch className="data-[state=checked]:bg-indigo-500" />
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Add/Edit Product Modal */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="max-w-[1000px] p-0 overflow-hidden bg-transparent border-none">
            <div className="flex gap-6 max-h-[90vh]">
              {/* Left Panel: Basic Info */}
              <div className="flex-1 bg-white rounded-3xl p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-indigo-600">Add New Product</h2>
                  <Button variant="ghost" size="icon" className="bg-indigo-50 text-indigo-600 rounded-full h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-black text-slate-900">Name</Label>
                    <Input className="h-12 bg-slate-50 border-none rounded-xl" placeholder="Enter product name" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-black text-slate-900">Description</Label>
                    <textarea 
                      className="w-full h-24 bg-slate-50 border-none rounded-xl p-4 text-sm outline-none resize-none" 
                      placeholder="Enter description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-black text-slate-900">Price</Label>
                    <Input className="h-12 bg-slate-50 border-none rounded-xl" placeholder="0.00" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-black text-slate-900">Discountable</Label>
                    <Switch className="data-[state=checked]:bg-indigo-500" />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-black text-slate-900">Categories</Label>
                    <select className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm outline-none">
                      <option>Select category</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none py-1.5 px-3 rounded-lg font-bold">
                        Fast Food <X className="h-3 w-3 ml-2 cursor-pointer" />
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-black text-slate-900">Addons</Label>
                    <select className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm outline-none">
                      <option>Select addons</option>
                      {addons.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none py-1.5 px-3 rounded-lg font-bold">
                        Cheese <X className="h-3 w-3 ml-2 cursor-pointer" />
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-black text-slate-900">Select Kitchen</Label>
                    <select className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-sm outline-none">
                      <option>Select kitchen</option>
                      {kitchens.map((k: any) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-black text-slate-900">Upload your image here</Label>
                    <div className="border-2 border-dashed border-indigo-100 rounded-3xl p-8 text-center bg-indigo-50/30">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Upload className="h-6 w-6 text-indigo-500" />
                        </div>
                        <p className="text-xs text-slate-400 font-bold mt-2">Drag and drop or browse to choose a file</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch id="variants" />
                    <Label htmlFor="variants" className="text-sm font-black text-slate-900">
                      This product has options, like size or color
                    </Label>
                  </div>

                  <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl">
                    Save
                  </Button>
                </div>
              </div>

              {/* Right Panel: Variants */}
              <div className="w-[380px] bg-white rounded-3xl p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-indigo-600">Add New Variants</h2>
                  <Button variant="ghost" size="icon" className="bg-indigo-50 text-indigo-600 rounded-full h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch checked />
                      <Label className="text-sm font-black text-slate-900">This product has options, like size or color</Label>
                    </div>

                    <div className="space-y-4">
                      {/* Option: Size */}
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900">Size</span>
                          <div className="flex gap-2">
                            <Trash2 className="h-4 w-4 text-slate-300 cursor-pointer" />
                            <Edit className="h-4 w-4 text-slate-300 cursor-pointer" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-white text-slate-400 border border-slate-200 py-1.5 px-4 rounded-lg font-bold">Medium</Badge>
                          <Badge className="bg-white text-slate-400 border border-slate-200 py-1.5 px-4 rounded-lg font-bold">Small</Badge>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <div className="space-y-2">
                          <Label className="text-xs font-black text-slate-400 uppercase">Option Name</Label>
                          <Input className="h-10 bg-slate-50 border-none rounded-xl" placeholder="e.g. Size" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black text-slate-400 uppercase">Option Value</Label>
                          <div className="flex gap-2">
                            <Input className="h-10 bg-slate-50 border-none rounded-xl flex-1" placeholder="e.g. Small" />
                            <Button size="icon" className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Button variant="ghost" className="text-indigo-600 font-bold text-xs p-0 h-auto">
                          Add Another Value
                        </Button>
                        <Button className="w-full h-10 bg-indigo-600 text-white font-black rounded-xl mt-4">
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-wider">Variants</h3>
                    <div className="space-y-3">
                      {[
                        'Medium/Black', 'Medium/Blue', 'Medium/Yellow', 
                        'Large/Yellow', 'Large/Yellow'
                      ].map((variant, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <span className="text-sm font-bold text-slate-600 flex-1">{variant}</span>
                          <Input className="h-10 w-24 bg-slate-50 border-none rounded-xl text-right" placeholder="0.00" />
                          <Switch defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl mt-8 shadow-lg shadow-indigo-100">
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ManageProductsPage;