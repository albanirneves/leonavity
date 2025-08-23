import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  start_vote: string;
  end_vote: string;
  vote_value: number;
  active: boolean;
  id_account: number;
  pix_tax: number;
  card_tax: number;
  created_at: string;
}

interface Account {
  id: number;
  name: string;
  marketplace: string;
}

interface Category {
  id: number;
  id_event: number;
  id_category: number;
  name: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const { toast } = useToast();

  const [eventForm, setEventForm] = useState({
    name: '',
    start_vote: '',
    end_vote: '',
    vote_value: '',
    active: true,
    id_account: '',
    pix_tax: '',
    card_tax: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchAccounts();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar eventos', variant: 'destructive' });
    } else {
      setEvents(data || []);
    }
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name');
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar contas', variant: 'destructive' });
    } else {
      setAccounts(data || []);
    }
  };

  const fetchCategories = async (eventId: number) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id_event', eventId)
      .order('id_category');
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar categorias', variant: 'destructive' });
    } else {
      setCategories(data || []);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.name || !eventForm.start_vote || !eventForm.end_vote || !eventForm.vote_value || !eventForm.id_account) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('events')
      .insert([{
        name: eventForm.name,
        start_vote: eventForm.start_vote,
        end_vote: eventForm.end_vote,
        vote_value: parseFloat(eventForm.vote_value),
        active: eventForm.active,
        id_account: parseInt(eventForm.id_account),
        pix_tax: eventForm.pix_tax ? parseFloat(eventForm.pix_tax) : 0,
        card_tax: eventForm.card_tax ? parseFloat(eventForm.card_tax) : 0
      }]);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao criar evento', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Evento criado com sucesso' });
      setIsEventDialogOpen(false);
      setEventForm({
        name: '',
        start_vote: '',
        end_vote: '',
        vote_value: '',
        active: true,
        id_account: '',
        pix_tax: '',
        card_tax: ''
      });
      fetchEvents();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory || !selectedEvent) return;

    // Get next category_id for this event
    const nextCategoryId = categories.length > 0 
      ? Math.max(...categories.map(c => c.id_category)) + 1 
      : 1;

    const { error } = await supabase
      .from('categories')
      .insert([{
        id_event: selectedEvent,
        id_category: nextCategoryId,
        name: newCategory
      }]);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao criar categoria', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Categoria criada com sucesso' });
      setNewCategory('');
      fetchCategories(selectedEvent);
    }
  };

  const openCategoriesModal = (eventId: number) => {
    setSelectedEvent(eventId);
    fetchCategories(eventId);
    setIsCategoriesDialogOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        
        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Evento *</Label>
                <Input
                  id="name"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="account">Conta *</Label>
                <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {eventForm.id_account 
                        ? accounts.find(a => a.id.toString() === eventForm.id_account)?.name 
                        : 'Selecionar Conta'
                      }
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Selecionar Conta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {accounts.map((account) => (
                        <Button
                          key={account.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setEventForm({ ...eventForm, id_account: account.id.toString() });
                            setIsAccountDialogOpen(false);
                          }}
                        >
                          {account.name} - {account.marketplace}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <Label htmlFor="start_vote">Início da Votação *</Label>
                <Input
                  id="start_vote"
                  type="datetime-local"
                  value={eventForm.start_vote}
                  onChange={(e) => setEventForm({ ...eventForm, start_vote: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="end_vote">Fim da Votação *</Label>
                <Input
                  id="end_vote"
                  type="datetime-local"
                  value={eventForm.end_vote}
                  onChange={(e) => setEventForm({ ...eventForm, end_vote: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="vote_value">Valor do Voto *</Label>
                <Input
                  id="vote_value"
                  type="number"
                  step="0.01"
                  value={eventForm.vote_value}
                  onChange={(e) => setEventForm({ ...eventForm, vote_value: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="pix_tax">Taxa PIX</Label>
                <Input
                  id="pix_tax"
                  type="number"
                  step="0.01"
                  value={eventForm.pix_tax}
                  onChange={(e) => setEventForm({ ...eventForm, pix_tax: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="card_tax">Taxa Cartão</Label>
                <Input
                  id="card_tax"
                  type="number"
                  step="0.01"
                  value={eventForm.card_tax}
                  onChange={(e) => setEventForm({ ...eventForm, card_tax: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={eventForm.active}
                  onCheckedChange={(checked) => setEventForm({ ...eventForm, active: !!checked })}
                />
                <Label htmlFor="active">Evento Ativo</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent}>
                Criar Evento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{event.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Votação: {new Date(event.start_vote).toLocaleString()} - {new Date(event.end_vote).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    Valor do voto: R$ {event.vote_value} | 
                    Status: {event.active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCategoriesModal(event.id)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Categorias
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Categories Modal */}
      <Dialog open={isCategoriesDialogOpen} onOpenChange={setIsCategoriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <Button onClick={handleAddCategory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{category.id_category}. {category.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}