
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Plus, 
  Edit, 
  Copy, 
  Eye, 
  EyeOff,
  Search,
  CreditCard,
  Building,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Account {
  id: number;
  name: string;
  marketplace: string;
  access_token: string;
  evolution_instance: string | null;
  created_at: string;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTokens, setShowTokens] = useState<Record<number, boolean>>({});
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    marketplace: '',
    access_token: '',
    evolution_instance: '',
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar contas",
        description: "Não foi possível carregar as contas de pagamento.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.marketplace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.marketplace || !formData.access_token || !formData.evolution_instance) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from('accounts')
          .update({
            name: formData.name,
            marketplace: formData.marketplace,
            access_token: formData.access_token,
            evolution_instance: formData.evolution_instance || null,
          })
          .eq('id', editingAccount.id);

        if (error) throw error;

        toast({
          title: "Conta atualizada",
          description: "A conta foi atualizada com sucesso.",
        });
      } else {
        // Create new account
        const { error } = await supabase
          .from('accounts')
          .insert({
            name: formData.name,
            marketplace: formData.marketplace,
            access_token: formData.access_token,
            evolution_instance: formData.evolution_instance || null,
          });

        if (error) throw error;

        toast({
          title: "Conta criada",
          description: "A conta foi criada com sucesso.",
        });
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        marketplace: '',
        access_token: '',
        evolution_instance: '',
      });
      setEditingAccount(null);
      setDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a conta. Tente novamente.",
      });
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      marketplace: account.marketplace,
      access_token: account.access_token,
      evolution_instance: account.evolution_instance || '',
    });
    setDialogOpen(true);
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast({
        title: "Token copiado",
        description: "O token foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar o token.",
      });
    }
  };

  const toggleTokenVisibility = (accountId: number) => {
    setShowTokens(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return '•'.repeat(token.length);
    return token.substring(0, 4) + '•'.repeat(token.length - 8) + token.substring(token.length - 4);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div className="loading-skeleton h-8 w-48"></div>
          <div className="loading-skeleton h-4 w-64"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="loading-skeleton h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-brand">Contas de Pagamento</h1>
            <p className="text-muted-foreground">
              Gerencie as contas de pagamento dos eventos
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <CustomButton 
                variant="brand" 
                onClick={() => {
                  setEditingAccount(null);
                  setFormData({
                    name: '',
                    marketplace: '',
                    access_token: '',
                    evolution_instance: '',
                  });
                }}
              >
                <Plus className="h-4 w-4" />
                Nova Conta
              </CustomButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Editar Conta' : 'Nova Conta de Pagamento'}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount 
                    ? 'Atualize as informações da conta de pagamento.'
                    : 'Adicione uma nova conta de pagamento para os eventos.'
                  }
                </DialogDescription>
              </DialogHeader>
              
               <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-2">
                   <Label htmlFor="name" className="text-sm font-medium">
                     Nome da Conta *
                   </Label>
                   <Input
                     id="name"
                     placeholder="Ex: Conta Principal"
                     value={formData.name}
                     onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                     className="w-full"
                     required
                   />
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="marketplace" className="text-sm font-medium">
                     Marketplace *
                   </Label>
                   <Select 
                     value={formData.marketplace} 
                     onValueChange={(value) => setFormData(prev => ({ ...prev, marketplace: value }))}
                   >
                     <SelectTrigger className="w-full">
                       <SelectValue placeholder="Selecione o marketplace" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="MERCADO_PAGO">Mercado Pago</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="access_token" className="text-sm font-medium">
                     Token de Acesso *
                   </Label>
                   <Input
                     id="access_token"
                     type="password"
                     placeholder="Token de acesso da API"
                     value={formData.access_token}
                     onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                     className="w-full"
                     required
                   />
                   <p className="text-xs text-muted-foreground">
                     Token para autenticação na API do marketplace
                   </p>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="evolution_instance" className="text-sm font-medium">
                     Instância Evolution *
                   </Label>
                   <Input
                     id="evolution_instance"
                     placeholder="Instância do WhatsApp"
                     value={formData.evolution_instance}
                     onChange={(e) => setFormData(prev => ({ ...prev, evolution_instance: e.target.value }))}
                     className="w-full"
                     required
                   />
                   <p className="text-xs text-muted-foreground">
                     Instância para integração com WhatsApp (obrigatória)
                   </p>
                 </div>

                <div className="flex justify-end gap-3 pt-4">
                  <CustomButton 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </CustomButton>
                  <CustomButton type="submit" variant="brand">
                    {editingAccount ? 'Atualizar' : 'Criar'} Conta
                  </CustomButton>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar contas por nome ou marketplace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <div className="space-y-4">
        {filteredAccounts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? 'Nenhuma conta encontrada' : 'Nenhuma conta cadastrada'}
                </p>
                <p>
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca.' 
                    : 'Comece criando sua primeira conta de pagamento.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAccounts.map((account) => (
            <Card key={account.id} className="card-gradient hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-brand rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building className="h-3 w-3" />
                        {account.marketplace}
                        {account.evolution_instance && (
                          <>
                            <span>•</span>
                            <span>WhatsApp: {account.evolution_instance}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CustomButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(account)}
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </CustomButton>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Token de Acesso
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded flex-1 font-mono">
                        {showTokens[account.id] ? account.access_token : maskToken(account.access_token)}
                      </code>
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTokenVisibility(account.id)}
                      >
                        {showTokens[account.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </CustomButton>
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(account.access_token)}
                      >
                        <Copy className="h-4 w-4" />
                      </CustomButton>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Data de Criação
                    </Label>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(account.created_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
