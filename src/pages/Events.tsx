import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Settings, Search, Edit, Trash2, MessageSquare, BarChart3, Upload, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface ScheduleItem {
  id?: number;
  weekday: number;
  hour: string;
  message?: string;
}

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
  send_ranking?: ScheduleItem[] | null;
  msg_saudacao?: string;
  layout_color?: string;
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');

  const [isMessagesDialogOpen, setIsMessagesDialogOpen] = useState(false);
  const [messagesText, setMessagesText] = useState('');
  const [selectedEventForMessages, setSelectedEventForMessages] = useState<Event | null>(null);
  
  const [isParciaisDialogOpen, setIsParciaisDialogOpen] = useState(false);
  const [selectedEventForParciais, setSelectedEventForParciais] = useState<Event | null>(null);
  const [newScheduleWeekday, setNewScheduleWeekday] = useState(1);
  const [newScheduleHour, setNewScheduleHour] = useState('09:00');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  
  // Message dialog states
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<ScheduleItem | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState('');
  
  // Background image states
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [layoutColor, setLayoutColor] = useState('#fddf59');
  const [tempLayoutColor, setTempLayoutColor] = useState('#fddf59');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const now = new Date();
    const filtered = events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (statusFilter === 'all') return true;
      
      const startDate = new Date(event.start_vote);
      const endDate = new Date(event.end_vote);
      
      if (statusFilter === 'active') return event.active;
      if (statusFilter === 'inactive') return !event.active;
      if (statusFilter === 'finished') return now > endDate;
      if (statusFilter === 'scheduled') return now < startDate;
      if (statusFilter === 'running') return now >= startDate && now <= endDate && event.active;
      
      return true;
    });
    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar eventos', variant: 'destructive' });
    } else {
      const eventsData = data as unknown as Event[];
      setEvents(eventsData);
      setFilteredEvents(eventsData);
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
    setCategoryToDelete(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryToDelete.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir categoria', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso' });
      if (selectedEvent) fetchCategories(selectedEvent);
    }
    
    setIsDeleteCategoryDialogOpen(false);
    setCategoryToDelete(null);
  };

  const openCategoriesModal = (eventId: number) => {
    setSelectedEvent(eventId);
    fetchCategories(eventId);
    setIsCategoriesDialogOpen(true);
  };

  // Open "Messages" modal and load current msg_saudacao
  const openMessagesModal = async (event: Event, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEventForMessages(event);
    // fetch the current message from DB to avoid stale state
    const { data, error } = await supabase
      .from('events')
      .select('msg_saudacao')
      .eq('id', event.id)
      .single();
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar a mensagem.', variant: 'destructive' });
      return;
    }
    setMessagesText((data as any)?.msg_saudacao || '');
    setIsMessagesDialogOpen(true);
  };

  const handleSaveMessages = async () => {
    if (!selectedEventForMessages) return;
    const { error } = await supabase
      .from('events')
      .update({ msg_saudacao: messagesText } as any)
      .eq('id', selectedEventForMessages.id);
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar a mensagem.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Mensagem atualizada com sucesso.' });
      setIsMessagesDialogOpen(false);
      setSelectedEventForMessages(null);
      setMessagesText('');
      fetchEvents();
    }
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

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.start_vote);
    const endDate = new Date(event.end_vote);
    
    if (!event.active) {
      return { status: 'inactive', label: 'Inativo', variant: 'secondary' as const };
    }
    
    if (now > endDate) {
      return { status: 'finished', label: 'Finalizado', variant: 'secondary' as const };
    }
    
    if (now < startDate) {
      return { status: 'scheduled', label: 'Agendado', variant: 'default' as const };
    }
    
    return { status: 'running', label: 'Em andamento', variant: 'default' as const };
  };

  const handleToggleActive = async (event: Event, isActive: boolean) => {
    const { error } = await supabase
      .from('events')
      .update({ active: isActive })
      .eq('id', event.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar status do evento', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: `Evento ${isActive ? 'ativado' : 'desativado'} com sucesso` });
      fetchEvents();
    }
  };

  const openEditCategoryModal = (category: Category) => {
    setSelectedCategoryForEdit(category);
    setEditCategoryName(category.name);
    setIsEditCategoryDialogOpen(true);
  };

  const openParciaisModal = async (event: Event, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEventForParciais(event);
    const eventColor = event.layout_color || '#fddf59';
    setLayoutColor(eventColor);
    setTempLayoutColor(eventColor);
    
    // Load schedule items from new table
    try {
      const { data: scheduleData, error } = await supabase
        .from('send_ranking')
        .select('*')
        .eq('id_event', event.id)
        .order('weekday', { ascending: true })
        .order('hour', { ascending: true });
      
      if (error) {
        console.error('Error fetching schedule:', error);
        setScheduleItems([]);
      } else {
        setScheduleItems(scheduleData || []);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      setScheduleItems([]);
    }
    
    setIsParciaisDialogOpen(true);
    
    // Check if background image exists
    await checkBackgroundImage(event.id);
  };

  const handleAddSchedule = async () => {
    if (!selectedEventForParciais) return;

    const newSchedule = {
      hour: newScheduleHour,
      weekday: newScheduleWeekday,
      message: ''
    };
    
    try {
      const { data, error } = await supabase
        .from('send_ranking')
        .insert({
          id_event: selectedEventForParciais.id,
          hour: newSchedule.hour,
          weekday: newSchedule.weekday,
          message: newSchedule.message
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setScheduleItems([...scheduleItems, { ...newSchedule, id: data.id }]);
      setNewScheduleWeekday(1);
      setNewScheduleHour('09:00');
      
      toast({ title: 'Sucesso', description: 'Horário adicionado com sucesso' });
    } catch (error) {
      console.error('Error adding schedule item:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar horário de envio.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSchedule = async (item: ScheduleItem, index: number) => {
    if (item.id) {
      try {
        const { error } = await supabase
          .from('send_ranking')
          .delete()
          .eq('id', item.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error removing schedule item:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover horário de envio.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setScheduleItems(scheduleItems.filter((_, i) => i !== index));
    toast({ title: 'Sucesso', description: 'Horário removido com sucesso' });
  };

  const openMessageDialog = (item: ScheduleItem) => {
    setSelectedScheduleItem(item);
    setScheduleMessage(item.message || '');
    setIsMessageDialogOpen(true);
  };

  const handleSaveMessage = async () => {
    if (!selectedScheduleItem || !selectedScheduleItem.id) return;
    
    try {
      const { error } = await supabase
        .from('send_ranking')
        .update({ message: scheduleMessage })
        .eq('id', selectedScheduleItem.id);
      
      if (error) throw error;
      
      // Update local state
      setScheduleItems(scheduleItems.map(item => 
        item.id === selectedScheduleItem.id 
          ? { ...item, message: scheduleMessage }
          : item
      ));
      
      setIsMessageDialogOpen(false);
      setSelectedScheduleItem(null);
      setScheduleMessage('');
      
      toast({
        title: "Sucesso",
        description: "Mensagem salva com sucesso.",
      });
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar mensagem.",
        variant: "destructive",
      });
    }
  };

  const getWeekdayName = (weekday: number) => {
    const days = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[weekday] || '';
  };

  // Background image functions
  const checkBackgroundImage = async (eventId: number) => {
    const imagePath = `assets/background_layout_event_${eventId}.png`;
    const { data } = await supabase.storage
      .from('candidates')
      .getPublicUrl(imagePath);
    
    // Check if the image actually exists by trying to fetch it
    try {
      const response = await fetch(data.publicUrl);
      if (response.ok) {
        setBackgroundImageUrl(data.publicUrl);
      } else {
        setBackgroundImageUrl(null);
      }
    } catch {
      setBackgroundImageUrl(null);
    }
  };

  const resizeImageToStoryFormat = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Story format: 9:16 aspect ratio
        const targetWidth = 1080;
        const targetHeight = 1920;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Calculate scaling to cover the entire canvas
        const scaleX = targetWidth / img.width;
        const scaleY = targetHeight / img.height;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        // Center the image
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        // Fill background with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Draw the image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/png',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          }
        }, 'image/png', 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedEventForParciais) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor, selecione um arquivo de imagem', variant: 'destructive' });
      return;
    }
    
    setIsUploadingImage(true);
    
    try {
      // Resize image to story format (9:16)
      const resizedFile = await resizeImageToStoryFormat(file);
      
      const imagePath = `assets/background_layout_event_${selectedEventForParciais.id}.png`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(imagePath, resizedFile, {
          upsert: true,
          contentType: 'image/png'
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL with cache busting
      const { data } = await supabase.storage
        .from('candidates')
        .getPublicUrl(imagePath);
      
      // Add cache busting to force refresh of the thumbnail
      const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;
      setBackgroundImageUrl(cacheBustedUrl);
      toast({ title: 'Sucesso', description: 'Background Parciais atualizado com sucesso' });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: 'Erro', description: 'Erro ao fazer upload da imagem', variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackgroundImage = async () => {
    if (!selectedEventForParciais) return;
    
    const imagePath = `assets/background_layout_event_${selectedEventForParciais.id}.png`;
    
    try {
      const { error } = await supabase.storage
        .from('candidates')
        .remove([imagePath]);
      
      if (error) throw error;
      
      setBackgroundImageUrl(null);
      toast({ title: 'Sucesso', description: 'Background Parciais removido com sucesso' });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({ title: 'Erro', description: 'Erro ao remover a imagem', variant: 'destructive' });
    }
  };

  const handleLayoutColorChange = async () => {
    if (!selectedEventForParciais) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({ layout_color: tempLayoutColor })
        .eq('id', selectedEventForParciais.id);

      if (error) throw error;

      setLayoutColor(tempLayoutColor);
      setSelectedEventForParciais({ ...selectedEventForParciais, layout_color: tempLayoutColor });
      
      // Update the events list
      setEvents(prev => prev.map(event => 
        event.id === selectedEventForParciais.id 
          ? { ...event, layout_color: tempLayoutColor }
          : event
      ));
      
      toast({ title: 'Sucesso', description: 'Cor do layout atualizada com sucesso' });
    } catch (error) {
      console.error('Error updating layout color:', error);
      toast({ title: 'Erro', description: 'Erro ao atualizar a cor do layout', variant: 'destructive' });
    }
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
    <div className="p-4 md:p-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Eventos</h1>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="running">Em andamento</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="finished">Finalizados</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Evento *</Label>
                  <Input
                    id="name"
                    value={eventForm.name}
                    onChange={(e) => setEventForm({ ...eventForm, name: e.target.value.slice(0, 50) })}
                    maxLength={50}
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
                    <DialogContent className="mx-4 my-4">
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
              <Label htmlFor="pix_tax">Taxa PIX (%)</Label>
              <Input
                id="pix_tax"
                placeholder="0,00%"
                value={`${parseFloat(eventForm.pix_tax || '0').toFixed(2).replace('.', ',')}%`}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '');
                  value = (parseFloat(value) / 100).toFixed(2);
                  if (value === 'NaN') value = '';
                  setEventForm({ ...eventForm, pix_tax: value });
                }}
              />
            </div>

            <div>
              <Label htmlFor="card_tax">Taxa Cartão (%)</Label>
              <Input
                id="card_tax"
                placeholder="0,00%"
                value={`${parseFloat(eventForm.card_tax || '0').toFixed(2).replace('.', ',')}%`}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '');
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
        <DialogContent className="max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_name">Nome do Evento *</Label>
              <Input
                id="edit_name"
                value={editEventForm.name}
                onChange={(e) => setEditEventForm({ ...editEventForm, name: e.target.value.slice(0, 50) })}
                maxLength={50}
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
              <Label htmlFor="edit_pix_tax">Taxa PIX (%)</Label>
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
              <Label htmlFor="edit_card_tax">Taxa Cartão (%)</Label>
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
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle>{event.name}</CardTitle>
                    <Badge variant={
                      getEventStatus(event).status === 'running' ? 'default' :
                      getEventStatus(event).status === 'scheduled' ? 'default' :
                      'secondary'
                    } className={
                      getEventStatus(event).status === 'running' ? 'bg-green-100 text-green-800 border-green-200' :
                      getEventStatus(event).status === 'scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }>
                      {getEventStatus(event).label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Votação: {event.start_vote ? event.start_vote.split('T')[0].split('-').reverse().join('/') : 'N/A'} - {event.end_vote ? event.end_vote.split('T')[0].split('-').reverse().join('/') : 'N/A'}
                  </p>
                  <p className="text-sm">
                    Valor do voto: R$ {event.vote_value}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm">Ativo:</span>
                    <Switch
                      checked={event.active}
                      onCheckedChange={(checked) => {
                        handleToggleActive(event, checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openMessagesModal(event, e)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mensagens
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => openParciaisModal(event, e)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Parciais
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Categories Modal */}
      <Dialog open={isCategoriesDialogOpen} onOpenChange={setIsCategoriesDialogOpen}>
        <DialogContent className="mx-4 my-4">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value.slice(0, 50))}
                maxLength={50}
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
        <DialogContent className="mx-4 my-4">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_category_name">Nome da Categoria</Label>
              <Input
                id="edit_category_name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value.slice(0, 50))}
                maxLength={50}
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

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages Modal */}
      <Dialog open={isMessagesDialogOpen} onOpenChange={setIsMessagesDialogOpen}>
        <DialogContent className="mx-4 my-6 w-full max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Mensagem do Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="event_message">Mensagem de Saudação</Label>
            <Textarea
              id="event_message"
              placeholder="Digite a mensagem de saudação que será usada neste evento..."
              value={messagesText}
              onChange={(e) => setMessagesText(e.target.value)}
              rows={12}
              className="min-h-[40vh]"  /* aumenta a área de edição */
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsMessagesDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMessages}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parciais Modal */}
      <Dialog open={isParciaisDialogOpen} onOpenChange={setIsParciaisDialogOpen}>
        <DialogContent className="mx-4 my-4 max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Gerenciar Parciais - {selectedEventForParciais?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-8rem)] pr-2">
            {/* Background Image Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Background Parciais</Label>
                <div className="text-sm text-muted-foreground">Formato 9:16 (Stories)</div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {backgroundImageUrl ? 'Substituir Imagem' : 'Upload Imagem'}
                    </Button>
                    
                    {backgroundImageUrl && (
                      <Button
                        variant="outline"
                        onClick={handleRemoveBackgroundImage}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Layout Color Section */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Cor do Layout</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tempLayoutColor}
                        onChange={(e) => setTempLayoutColor(e.target.value)}
                        className="w-12 h-10 border rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={tempLayoutColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Validate hex color format
                          if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                            setTempLayoutColor(value);
                          }
                        }}
                        placeholder="#000000"
                        className="w-24 font-mono text-sm"
                        maxLength={7}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleLayoutColorChange}
                      >
                        Salvar Cor
                      </Button>
                    </div>
                  </div>
                  
                  {isUploadingImage && (
                    <div className="text-sm text-muted-foreground">
                      Fazendo upload e ajustando para formato 9:16...
                    </div>
                  )}
                </div>
                
                {/* Image Preview */}
                {backgroundImageUrl && (
                  <div className="w-20 h-36 border rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={backgroundImageUrl}
                      alt="Background Parciais"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />
            
            {/* Scheduling Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Horários de Envio</Label>
              
              {/* Add new schedule form */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="weekday">Dia da Semana</Label>
                  <Select value={newScheduleWeekday.toString()} onValueChange={(value) => setNewScheduleWeekday(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar dia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Domingo</SelectItem>
                      <SelectItem value="2">Segunda-feira</SelectItem>
                      <SelectItem value="3">Terça-feira</SelectItem>
                      <SelectItem value="4">Quarta-feira</SelectItem>
                      <SelectItem value="5">Quinta-feira</SelectItem>
                      <SelectItem value="6">Sexta-feira</SelectItem>
                      <SelectItem value="7">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="hour">Horário</Label>
                  <Input
                    id="hour"
                    type="time"
                    value={newScheduleHour}
                    onChange={(e) => setNewScheduleHour(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddSchedule}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Schedule list */}
              <div className="space-y-2">
                {scheduleItems && scheduleItems.length > 0 ? (
                  scheduleItems.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <span>
                        {getWeekdayName(schedule.weekday)} - {schedule.hour}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMessageDialog(schedule)}
                          title="Editar mensagem"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSchedule(schedule, index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum horário configurado
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mensagem do Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Mensagem:</Label>
              <Textarea
                value={scheduleMessage}
                onChange={(e) => setScheduleMessage(e.target.value)}
                placeholder="Digite a mensagem que será enviada neste horário..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMessage}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}