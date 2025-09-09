import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Search,
  Users as UsersIcon,
  Shield,
  Calendar,
  Trash2,
  User
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
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

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  roles: Array<{
    role: string;
    id_account: number | null;
    account_name?: string;
  }>;
}

interface Account {
  id: number;
  name: string;
}

export default function Users() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'user' as 'admin' | 'user',
    id_account: ''
  });

  // Verificar se o usuário é admin antes de mostrar a página
  if (roleLoading) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Shield className="h-8 w-8 text-muted-foreground" />
                Acesso Negado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Apenas administradores podem acessar esta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setFetchingData(true);
      
      // Primeiro, buscar perfis dos usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar roles dos usuários
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          id_account,
          accounts:id_account (
            name
          )
        `);

      if (rolesError) throw rolesError;

      // Buscar emails dos usuários (apenas admins podem ver)
      let authUsers: any = null;
      try {
        const response = await supabase.auth.admin.listUsers();
        authUsers = response.data;
      } catch (authError) {
        console.error('Error fetching auth users:', authError);
      }

      // Combinar dados
      const usersWithRoles = (profiles || []).map(profile => {
        const roles = (userRoles || [])
          .filter(role => role.user_id === profile.id)
          .map(role => ({
            role: role.role,
            id_account: role.id_account,
            account_name: role.accounts?.name || null
          }));

        const authUser = authUsers?.users.find(user => user.id === profile.id);

        return {
          ...profile,
          email: authUser?.email,
          roles
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
      });
    } finally {
      setFetchingData(false);
      setInitialDataLoaded(true);
    }
  };

  useEffect(() => {
    if (isAdmin && !roleLoading && !initialDataLoaded) {
      fetchUsers();
      fetchAccounts();
    }
  }, [isAdmin, roleLoading, initialDataLoaded]);

  const filteredUsers = users.filter(user =>
    (user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Email e senha são obrigatórios.",
      });
      return;
    }

    try {
      setFetchingData(true);

      if (editingUser) {
        // Editar usuário existente (apenas roles e conta)
        // Primeiro, remover roles antigas
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id);

        // Adicionar nova role
        const roleData: any = {
          user_id: editingUser.id,
          role: formData.role
        };

        if (formData.role === 'user' && formData.id_account) {
          roleData.id_account = parseInt(formData.id_account);
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([roleData]);

        if (roleError) throw roleError;

        // Atualizar perfil se necessário
        if (formData.display_name) {
          await supabase
            .from('profiles')
            .update({ display_name: formData.display_name })
            .eq('id', editingUser.id);
        }

        toast({
          title: "Usuário atualizado",
          description: "As informações do usuário foram atualizadas com sucesso.",
        });
      } else {
        // Criar novo usuário
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            display_name: formData.display_name
          }
        });

        if (authError) throw authError;

        // Criar role para o novo usuário
        const roleData: any = {
          user_id: newUser.user.id,
          role: formData.role
        };

        if (formData.role === 'user' && formData.id_account) {
          roleData.id_account = parseInt(formData.id_account);
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([roleData]);

        if (roleError) throw roleError;

        toast({
          title: "Usuário criado",
          description: "O novo usuário foi criado com sucesso.",
        });
      }

      // Reset form and close dialog
      setFormData({
        email: '',
        password: '',
        display_name: '',
        role: 'user',
        id_account: ''
      });
      setEditingUser(null);
      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar usuário",
        description: error.message || "Não foi possível salvar o usuário.",
      });
    } finally {
      setFetchingData(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    const mainRole = user.roles.find(r => r.role === 'admin') || user.roles[0];
    setFormData({
      email: user.email || '',
      password: '',
      display_name: user.display_name || '',
      role: mainRole?.role as 'admin' | 'user' || 'user',
      id_account: mainRole?.id_account?.toString() || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      setFetchingData(true);
      
      // Remover roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      // Remover perfil
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      // Remover usuário da auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.id);
      if (authError) throw authError;

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
      });

      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Erro ao remover usuário",
        description: error.message || "Não foi possível remover o usuário.",
      });
    } finally {
      setFetchingData(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!initialDataLoaded && fetchingData) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <UsersIcon className="h-8 w-8 text-primary" />
              Usuários
            </h1>
            <p className="text-muted-foreground">
              Gerencie usuários e suas permissões no sistema
            </p>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4 bg-card p-3 rounded-lg border">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <CustomButton 
              variant="default"
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  email: '',
                  password: '',
                  display_name: '',
                  role: 'user',
                  id_account: ''
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Novo Usuário
            </CustomButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Edite as informações e permissões do usuário.'
                  : 'Adicione um novo usuário ao sistema.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full"
                  required
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Senha do usuário"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-medium">
                  Nome de Exibição
                </Label>
                <Input
                  id="display_name"
                  placeholder="Nome completo"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Tipo de Usuário *
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: 'admin' | 'user') => setFormData(prev => ({ ...prev, role: value, id_account: value === 'admin' ? '' : prev.id_account }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuário Comum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === 'user' && (
                <div className="space-y-2">
                  <Label htmlFor="account" className="text-sm font-medium">
                    Conta Associada *
                  </Label>
                  <Select 
                    value={formData.id_account} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, id_account: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <CustomButton 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </CustomButton>
                <CustomButton 
                  type="submit"
                  disabled={fetchingData}
                >
                  {editingUser ? 'Atualizar' : 'Criar'} Usuário
                </CustomButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="relative group hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {user.display_name || 'Sem nome'}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {user.email || 'Email não disponível'}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(user)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="h-4 w-4" />
                  </CustomButton>
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUserToDelete(user);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </CustomButton>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Roles */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Permissões:</h4>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role, index) => (
                    <Badge 
                      key={index} 
                      variant={getRoleBadgeVariant(role.role)}
                      className="text-xs"
                    >
                      {role.role === 'admin' ? 'Admin' : 'Usuário'}
                      {role.account_name && ` - ${role.account_name}`}
                    </Badge>
                  ))}
                  {user.roles.length === 0 && (
                    <Badge variant="outline" className="text-xs">
                      Sem permissões
                    </Badge>
                  )}
                </div>
              </div>

              {/* Data de criação */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Criado em {formatDate(user.created_at)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && initialDataLoaded && (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? 'Tente ajustar os filtros de busca.' 
              : 'Comece criando o primeiro usuário.'
            }
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário "{userToDelete?.display_name || userToDelete?.email}"? 
              Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}