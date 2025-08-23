
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/button-variants';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-muted-foreground">404</span>
          </div>
          <CardTitle>Página não encontrada</CardTitle>
          <CardDescription>
            A página que você está procurando não existe ou foi movida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CustomButton 
            onClick={() => navigate('/dashboard')} 
            className="w-full gap-2"
          >
            <Home className="h-4 w-4" />
            Ir para Dashboard
          </CustomButton>
          <CustomButton 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </CustomButton>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
