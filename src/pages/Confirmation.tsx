import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

const Confirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const orderId = searchParams.get("orderid");
  const status = searchParams.get("status");
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidOrder, setIsValidOrder] = useState(false);

  useEffect(() => {
    const verifyOrderStatus = async () => {
      if (!orderId) {
        toast({
          title: "Error",
          description: "No order ID provided",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      try {
        const SPREADSHEET_ID = '1hzt3zyATvpMz5lN-ijwO9XzSxkmuiWY4-yTpF_Kojjc';
        const ORDERS_GID = '2936601';
        const timestamp = new Date().getTime();
        
        // Fetch orders to verify status
        const ordersUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${ORDERS_GID}&timestamp=${timestamp}`;
        const ordersResponse = await fetch(ordersUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });

        if (!ordersResponse.ok) {
          throw new Error('Failed to fetch order');
        }

        const ordersCSV = await ordersResponse.text();
        const ordersParsed = Papa.parse<Record<string, string>>(ordersCSV, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });

        const orders = ordersParsed.data;
        const order = orders.find((o) => o['Order No'] === orderId);

        if (!order) {
          toast({
            title: "Order Not Found",
            description: "The order ID does not exist",
            variant: "destructive",
          });
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // Check if order is completed
        const orderStatus = order['Status']?.trim().toLowerCase();
        if (orderStatus !== 'complete' && orderStatus !== 'completed') {
          toast({
            title: "Payment Not Completed",
            description: "This order has not been paid yet. Redirecting to payment page...",
            variant: "destructive",
          });
          setTimeout(() => {
            navigate(`/payment?orderid=${orderId}`);
          }, 2000);
          return;
        }

        // Order is valid and completed
        setIsValidOrder(true);
        console.log('✅ Order verified as Complete:', orderId);
      } catch (error) {
        console.error('Error verifying order:', error);
        toast({
          title: "Error",
          description: "Failed to verify order status",
          variant: "destructive",
        });
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyOrderStatus();
  }, [orderId, navigate, toast]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying order status...</p>
        </div>
      </div>
    );
  }

  if (!isValidOrder) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background flex items-center justify-center py-8 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            EasyRokra
          </h1>
          <p className="text-muted-foreground">Secure Payment Gateway</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription className="text-base">
              Your payment has been processed successfully
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-secondary/50 rounded-lg p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono font-semibold">{orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                  {status === 'success' ? 'Completed' : 'Processing'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transaction Date</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">What's Next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>A confirmation email has been sent to your registered email address</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Your order will be processed and shipped within 2-3 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>You can track your order using the order ID provided above</span>
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => window.location.href = '/'}
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Home
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Thank you for choosing EasyRokra. For any queries, please contact our support team.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Confirmation;
