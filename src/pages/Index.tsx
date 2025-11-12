import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ShieldCheck, Zap, ArrowRight } from "lucide-react";

const Index = () => {
  const [orderId, setOrderId] = useState("");

  const handleNavigate = () => {
    if (orderId.trim()) {
      window.location.href = `/payment?orderid=${orderId}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            EasyRokra
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Secure Payment Gateway
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Made Simple
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Process payments quickly and securely with our trusted payment infrastructure. 
            Built for businesses of all sizes.
          </p>

          {/* Quick Payment Access */}
          <Card className="max-w-md mx-auto shadow-elevated">
            <CardHeader>
              <CardTitle>Complete Your Payment</CardTitle>
              <CardDescription>
                Enter your order ID to proceed with payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter Order ID (e.g., 65435367)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNavigate()}
                className="text-center text-lg"
              />
              <Button 
                onClick={handleNavigate} 
                className="w-full"
                size="lg"
                disabled={!orderId.trim()}
              >
                Proceed to Payment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Secure & Encrypted</CardTitle>
              <CardDescription>
                Bank-level encryption protects all your payment information
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Process payments in seconds with our optimized infrastructure
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Multiple Payment Methods</CardTitle>
              <CardDescription>
                Accept all major credit and debit cards with ease
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 EasyRokra. All rights reserved.</p>
            <p className="mt-2">Secure payments powered by advanced encryption</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
