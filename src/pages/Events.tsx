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
import { Plus, Settings, Search, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<Event | null>(null);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
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

  const [editEventForm, setEditEventForm] = useState({
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
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchAccounts()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [events, searchTerm]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar eventos', variant: 'destructive' });
    } else {
      setEvents(data || []);
      setFilteredEvents(data || []);
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
      resetEventForm();
      fetchEvents();
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEventForEdit) return;

    const { error } = await supabase
      .from('events')
      .update({
        name: editEventForm.name,
        start_vote: editEventForm.start_vote,
        end_vote: editEventForm.end_vote,
        vote_value: parseFloat(editEventForm.vote_value),
        active: editEventForm.active,
        id_account: parseInt(editEventForm.id_account),
        pix_tax: editEventForm.pix_tax ? parseFloat(editEventForm.pix_tax) : 0,
        card_tax: editEventForm.card_tax ? parseFloat(editEventForm.card_tax) : 0
      })
      .eq('id', selectedEventForEdit.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar evento', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Evento atualizado com sucesso' });
      setIsEditEventDialogOpen(false);
      setSelectedEventForEdit(null);
      fetchEvents();
    }
  };

  const resetEventForm = () => {
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

  const handleUpdateCategory = async () => {
    if (!selectedCategoryForEdit || !editCategoryName) return;

    const { error } = await supabase
      .from('categories')
      .update({ name: editCategoryName })
      .eq('id', selectedCategoryForEdit.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar categoria', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso' });
      setIsEditCategoryDialogOpen(false);
      setSelectedCategoryForEdit(null);
      setEditCategoryName('');
      if (selectedEvent) fetchCategories(selectedEvent);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir categoria', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso' });
      if (selectedEvent) fetchCategories(selectedEvent);
    }
  };

  const openCategoriesModal = (eventId: number) => {
    setSelectedEvent(eventId);
    fetchCategories(eventId);
    setIsCategoriesDialogOpen(true);
  };

  const openEditEventModal = (event: Event) => {
    setSelectedEventForEdit(event);
    setEditEventForm({
      name: event.name,
      start_vote: event.start_vote.split('T')[0], // Remove time part
      end_vote: event.end_vote.split('T')[0], // Remove time part
      vote_value: event.vote_value.toString(),
      active: event.active,
      id_account: event.id_account.toString(),
      pix_tax: event.pix_tax?.toString() || '',
      card_tax: event.card_tax?.toString() || ''
    });
    setIsEditEventDialogOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setEditCategoryName(category.name);
    setIsEditCategoryDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
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
                    type="date"
                    value={eventForm.start_vote}
                    onChange={(e) => setEventForm({ ...eventForm, start_vote: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end_vote">Fim da Votação *</Label>
                  <Input
                    id="end_vote"
                    type="date"
                    value={eventForm.end_vote}
                    onChange={(e) => setEventForm({ ...eventForm, end_vote: e.target.value })}
                  />
                </div>

            <div>
              <Label htmlFor="vote_value">Valor do Voto *</Label>
              <Input
                id="vote_value"
                placeholder="R$ 0,00"
                value={eventForm.vote_value}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEventForm({ ...eventForm, vote_value: value });
                }}
              />
            </div>

            <div>
              <Label htmlFor="pix_tax">Taxa PIX</Label>
              <Input
                id="pix_tax"
                placeholder="R$ 0,00"
                value={eventForm.pix_tax}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEventForm({ ...eventForm, pix_tax: value });
                }}
              />
            </div>

            <div>
              <Label htmlFor="card_tax">Taxa Cartão</Label>
              <Input
                id="card_tax"
                placeholder="R$ 0,00"
                value={eventForm.card_tax}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEventForm({ ...eventForm, card_tax: value });
                }}
              />
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
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditEventDialogOpen} onOpenChange={setIsEditEventDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_name">Nome do Evento *</Label>
              <Input
                id="edit_name"
                value={editEventForm.name}
                onChange={(e) => setEditEventForm({ ...editEventForm, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_account">Conta *</Label>
              <Select value={editEventForm.id_account} onValueChange={(value) => setEditEventForm({ ...editEventForm, id_account: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar Conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} - {account.marketplace}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_start_vote">Início da Votação *</Label>
              <Input
                id="edit_start_vote"
                type="date"
                value={editEventForm.start_vote}
                onChange={(e) => setEditEventForm({ ...editEventForm, start_vote: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_end_vote">Fim da Votação *</Label>
              <Input
                id="edit_end_vote"
                type="date"
                value={editEventForm.end_vote}
                onChange={(e) => setEditEventForm({ ...editEventForm, end_vote: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit_vote_value">Valor do Voto *</Label>
              <Input
                id="edit_vote_value"
                placeholder="R$ 0,00"
                value={`R$ ${parseFloat(editEventForm.vote_value || '0').toFixed(2).replace('.', ',')}`}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEditEventForm({ ...editEventForm, vote_value: value });
                }}
              />
            </div>

            <div>
              <Label htmlFor="edit_pix_tax">Taxa PIX</Label>
              <Input
                id="edit_pix_tax"
                placeholder="0,00%"
                value={`${parseFloat(editEventForm.pix_tax || '0').toFixed(2).replace('.', ',')}%`}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEditEventForm({ ...editEventForm, pix_tax: value });
                }}
              />
            </div>

            <div>
              <Label htmlFor="edit_card_tax">Taxa Cartão</Label>
              <Input
                id="edit_card_tax"
                placeholder="0,00%"
                value={`${parseFloat(editEventForm.card_tax || '0').toFixed(2).replace('.', ',')}%`}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEditEventForm({ ...editEventForm, card_tax: value });
                }}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditEventDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent}>
              Atualizar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-8">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openEditEventModal(event)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle>{event.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Votação: {event.start_vote ? new Date(event.start_vote).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'N/A'} - {event.end_vote ? new Date(event.end_vote).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'N/A'}
                  </p>
                  <p className="text-sm">
                    Valor do voto: R$ {event.vote_value}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCategoriesModal(event.id);
                  }}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditCategoryModal(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_category_name">Nome da Categoria</Label>
              <Input
                id="edit_category_name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCategory}>
              Atualizar Categoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}