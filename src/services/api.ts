import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  available: boolean;
  created_at: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  created_at: string;
}

export interface Kitchen {
  id: string;
  name: string;
  created_at: string;
}

export interface DailyRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  starting_amount: number;
  ending_amount: number | null;
  status: 'open' | 'closed';
  notes: string | null;
}

export const api = {
  registers: {
    getOpen: async () => {
      const { data, error } = await supabase
        .from('daily_registers')
        .select('*')
        .eq('status', 'open')
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyRegister | null;
    },
    start: async (startingAmount: number, openedAt?: string) => {
      const { data, error } = await supabase
        .from('daily_registers')
        .insert({
          starting_amount: startingAmount,
          status: 'open',
          opened_at: openedAt || new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as DailyRegister;
    },
    close: async (id: string, endingAmount: number, notes?: string) => {
      const { data, error } = await supabase
        .from('daily_registers')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          ending_amount: endingAmount,
          notes: notes
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data as DailyRegister;
    }
  },
  categories: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    create: async (category: Omit<Category, 'id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  products: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    create: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, product: ProductUpdate) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    uploadImage: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
    getWithDetails: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_variants(*),
          product_addons(*)
        `)
        .order('name');
      if (error) throw error;
      return data;
    }
  },
  addons: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('product_addons')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ProductAddon[];
    },
    create: async (addon: Omit<ProductAddon, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('product_addons')
        .insert(addon)
        .select()
        .single();
      if (error) throw error;
      return data as ProductAddon;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('product_addons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },
  kitchens: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Kitchen[];
    },
    create: async (name: string) => {
      const { data, error } = await supabase
        .from('kitchens')
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data as Kitchen;
    }
  },
  customers: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    create: async (customer: CustomerInsert) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id: number, customer: CustomerUpdate) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('customer_id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: number) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('customer_id', id);
      if (error) throw error;
    }
  },
  tables: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number');
      if (error) throw error;
      return data;
    },
    updateStatus: async (id: number, status: 'available' | 'occupied' | 'reserved' | 'cleaning') => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update({ status })
        .eq('table_id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    clearReserved: async () => {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('status', 'reserved');
      if (error) throw error;
    }
  },
  orders: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    getDailyCount: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());
        
      if (error) {
        console.error('Error fetching daily order count:', error);
        return 0;
      }
      
      return count || 0;
    },
    create: async (order: any, items: OrderItemInsert[]) => {
      // Clean order data to match actual Supabase schema
      const safeOrder: any = {
        total_amount: Number(order.total_amount) || 0,
        status: order.status || 'completed',
        payment_method: order.payment_method || 'cash',
        order_type: order.order_type || 'dine_in',
        // Removing register_id to prevent 400 error as it doesn't exist in current DB schema
      };

      // Handle customer_id as number if it's an integer-like string or number
      if (order.customer_id) {
        const cid = parseInt(String(order.customer_id));
        if (!isNaN(cid)) {
          safeOrder.customer_id = cid;
        }
      }

      // Handle table_id if present
      if (order.table_id) {
        const tid = parseInt(String(order.table_id));
        if (!isNaN(tid)) {
          safeOrder.table_id = tid;
        }
      }

      // Validate safeOrder object before inserting
      if (!safeOrder.total_amount || typeof safeOrder.total_amount !== 'number') {
        throw new Error('Invalid or missing total_amount');
      }
      if (!safeOrder.payment_method || typeof safeOrder.payment_method !== 'string') {
        throw new Error('Invalid or missing payment_method');
      }

      console.log("Validated safeOrder object for Supabase insertion:", safeOrder);

      // Attempt to insert order into Supabase
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(safeOrder)
        .select()
        .single();

      if (orderError) {
        console.error("Supabase Order Insert Error:", {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code,
          payload: safeOrder
        });
        throw orderError;
      }
      if (!newOrder) throw new Error('Failed to create order');

      const itemsWithOrderId = items.map(item => ({
        ...item,
        order_id: newOrder.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsWithOrderId);

      if (itemsError) throw itemsError;
      return newOrder;
    },
    getOngoing: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, phone),
          restaurant_tables(table_number),
          order_items(
            *,
            products(name, image)
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    updateStatus: async (id: string, status: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    clearAllToday: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startOfDay.toISOString());
      
      if (fetchError) throw fetchError;
      if (!orders || orders.length === 0) return;
      
      const orderIds = orders.map(o => o.id);
      
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;

      // Delete orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
      
      if (ordersError) throw ordersError;
    },
    deleteTodayOrders: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      // 1. Get IDs of orders to delete
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startOfDay.toISOString());
      
      if (fetchError) throw fetchError;
      
      if (!orders || orders.length === 0) return;
      
      const orderIds = orders.map(o => (o as any).id);

      // 2. Delete associated order items first (Manual Cascade)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
        
      if (itemsError) throw itemsError;

      // 3. Delete the orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
      
      if (ordersError) throw ordersError;
    },
    deleteAllOrders: async () => {
      // 1. Delete ALL order items first (Manual Cascade)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
        
      if (itemsError) throw itemsError;

      // 2. Delete ALL orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (ordersError) throw ordersError;
    }
  },
  reports: {
    getDashboardStats: async () => {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      return {
        orders: orders || [],
        customers: customers || []
      };
    }
  }
};
