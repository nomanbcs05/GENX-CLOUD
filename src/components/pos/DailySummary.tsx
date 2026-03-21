import { forwardRef } from 'react';
import { format } from 'date-fns';
import { businessInfo } from '@/data/mockData';

interface Order {
  id: string;
  dailyId?: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customers?: { name: string };
}

interface DailySummaryProps {
  orders: Order[];
  date: Date;
}

const DailySummary = forwardRef<HTMLDivElement, DailySummaryProps>(({ orders, date }, ref) => {
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  
  const salesByMethod = completedOrders.reduce((acc, o) => {
    const method = o.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + Number(o.total_amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div 
      ref={ref} 
      className="receipt-print bg-white text-black p-6 font-mono text-[10px] mx-auto"
      style={{ width: '80mm' }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-sm font-bold uppercase underline">Daily Sales Summary</h1>
        <h2 className="text-md font-bold uppercase">CRUST & CRUMS</h2>
        <p className="font-bold">{format(date, 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="border-t border-black my-3" />

      {/* Summary Stats */}
      <div className="space-y-1 mb-4 font-bold">
        <div className="flex justify-between border-b border-black pb-1">
          <span>TOTAL ORDERS:</span>
          <span>{completedOrders.length}</span>
        </div>
        <div className="flex justify-between border-b border-black py-1">
          <span>TOTAL REVENUE:</span>
          <span>Rs {totalSales.toLocaleString()}</span>
        </div>
      </div>

      {/* Sales by Payment Method */}
      <div className="mb-4">
        <p className="font-bold mb-1 border-b border-black">PAYMENT METHODS</p>
        {Object.entries(salesByMethod).map(([method, amount]) => (
          <div key={method} className="flex justify-between capitalize border-b border-dotted border-gray-300 py-1">
            <span>{method}:</span>
            <span>{amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Order List */}
      <div className="mb-4">
        <p className="font-bold mb-1 border-b border-black">ORDER DETAILS</p>
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left">ID</th>
              <th className="text-left">Time</th>
              <th className="text-left">Customer</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order) => (
              <tr key={order.id} className="border-b border-dotted border-gray-300">
                <td className="py-1">#{order.dailyId || order.id.slice(0, 3)}</td>
                <td className="py-1">{format(new Date(order.created_at), 'HH:mm')}</td>
                <td className="py-1 truncate max-w-[60px]">{order.customers?.name || 'Walk-in'}</td>
                <td className="text-right py-1">{Number(order.total_amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-black my-3" />
      
      <div className="text-center mt-4 text-[9px]">
        <p className="font-bold uppercase">GEN X CLOUD POS - DAILY REPORT</p>
        <p>{format(new Date(), 'dd-MMM HH:mm:ss')}</p>
        <p>GENX POS - 03061234567</p>
        <p className="mt-2">********************************</p>
      </div>
    </div>
  );
});

DailySummary.displayName = 'DailySummary';

export default DailySummary;
