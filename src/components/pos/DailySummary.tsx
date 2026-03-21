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
      className="receipt-print bg-white text-black p-4 font-mono text-[9px] mx-auto leading-relaxed"
      style={{ width: '80mm' }}
    >
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-[11px] font-bold uppercase tracking-wider">Daily Sales Summary</h1>
        <h2 className="text-[12px] font-bold uppercase py-0.5">CRUST & CRUMS</h2>
        <p className="font-bold text-[8px]">{format(date, 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="border-t-[1.5px] border-black mt-1 mb-2" />

      {/* Summary Stats */}
      <div className="space-y-0.5 mb-2 font-bold uppercase">
        <div className="flex justify-between items-center border-b border-black pb-0.5">
          <span>TOTAL ORDERS:</span>
          <span>{completedOrders.length}</span>
        </div>
        <div className="flex justify-between items-center border-b-[1.5px] border-black py-0.5">
          <span>TOTAL REVENUE:</span>
          <span>Rs {totalSales.toLocaleString()}</span>
        </div>
      </div>

      {/* Sales by Payment Method */}
      <div className="mb-2">
        <p className="font-bold text-center border-b border-black mb-1 py-0.5">PAYMENT METHODS</p>
        {Object.entries(salesByMethod).map(([method, amount]) => (
          <div key={method} className="flex justify-between capitalize border-b border-dotted border-gray-400 py-0.5">
            <span className="font-bold">{method}:</span>
            <span>Rs {amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Order List */}
      <div className="mb-2">
        <p className="font-bold text-center border-b border-black mb-1 py-0.5 uppercase">Order Details</p>
        <table className="w-full text-[8px] border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left font-bold py-0.5">ID</th>
              <th className="text-left font-bold py-0.5">Time</th>
              <th className="text-left font-bold py-0.5">Customer</th>
              <th className="text-right font-bold py-0.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((order) => (
              <tr key={order.id} className="border-b border-dotted border-gray-300">
                <td className="py-1">#{order.dailyId || order.id.slice(0, 3)}</td>
                <td className="py-1">{format(new Date(order.created_at), 'HH:mm')}</td>
                <td className="py-1 truncate max-w-[60px]">{order.customers?.name || 'Walk-in'}</td>
                <td className="text-right py-1">Rs {Number(order.total_amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-[1.5px] border-black my-2" />
      
      <div className="text-center space-y-0.5 text-[8px]">
        <p className="font-bold uppercase tracking-tighter">GEN X CLOUD POS - DAILY REPORT</p>
        <p>{format(new Date(), 'dd-MMM-yyyy HH:mm:ss')}</p>
        <p className="font-bold">GENX-POS-NAWABSHAH CONTACT 033102826675</p>
        <p className="mt-1 font-bold">********************************</p>
      </div>
    </div>
  );
});

DailySummary.displayName = 'DailySummary';

export default DailySummary;
