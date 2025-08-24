import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Users, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Candidate {
  id: number;
  name: string;
  name_complete: string;
  id_event: number;
  id_category: number;
  id_candidate: number;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  id_category: number;
}

interface CandidateWithDetails extends Candidate {
  event_name: string;
  category_name: string;
  votes_count: number;
  photo_url?: string;
}

export default function Candidates() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateWithDetails[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithDetails[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [newCandidateForm, setNewCandidateForm] = useState({
    name: '',
    name_complete: '',
    id_event: '',
    id_category: '',
    id_candidate: ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchCandidates()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEvent && selectedEvent !== 'all') {
      fetchCategories(parseInt(selectedEvent));
    }
  }, [selectedEvent]);

  useEffect(() => {
    applyFilters();
  }, [candidates, selectedEvent, searchTerm]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name')
      .order('name');
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar eventos', variant: 'destructive' });
    } else {
      setEvents(data || []);
    }
  };

  const fetchCategories = async (eventId: number) => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, id_category')
      .eq('id_event', eventId)
      .order('id_category');
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar categorias', variant: 'destructive' });
    } else {
      setCategories(data || []);
    }
  };

  const fetchCandidates = async () => {
    try {
      // Fetch candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name');

      if (eventsError) throw eventsError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id_event, id_category, name');

      if (categoriesError) throw categoriesError;

      // Fetch vote counts for each candidate
      const candidatesWithVotes = await Promise.all(
        (candidatesData || []).map(async (candidate) => {
          const { data: votesData, error: votesError } = await supabase
            .from('votes')
            .select('votes')
            .eq('id_event', candidate.id_event)
            .eq('id_category', candidate.id_category)
            .eq('id_candidate', candidate.id_candidate)
            .eq('payment_status', 'approved');

          if (votesError) {
            console.error('Error fetching votes:', votesError);
          }

          const totalVotes = votesData?.reduce((sum, vote) => sum + (vote.votes || 0), 0) || 0;
          
          // Find event and category names
          const event = eventsData?.find(e => e.id === candidate.id_event);
          const category = categoriesData?.find(c => c.id_event === candidate.id_event && c.id_category === candidate.id_category);
          
          // Check if photo exists
          const fileName = `event_${candidate.id_event}_category_${candidate.id_category}_candidate_${candidate.id_candidate}`;
          const { data: photoData } = await supabase.storage
            .from('candidates')
            .getPublicUrl(`${fileName}.jpg`);

          return {
            ...candidate,
            event_name: event?.name || 'Evento não encontrado',
            category_name: category?.name || 'Categoria não encontrada',
            votes_count: totalVotes,
            photo_url: photoData.publicUrl
          };
        })
      );

      setCandidates(candidatesWithVotes);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar candidatas', variant: 'destructive' });
    }
  };

  const applyFilters = () => {
    let filtered = candidates;
    
    if (selectedEvent !== 'all') {
      filtered = filtered.filter(c => c.id_event === parseInt(selectedEvent));
    }
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name_complete?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredCandidates(filtered);
  };

  const openCandidateModal = (candidate: CandidateWithDetails) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !selectedCandidate) return;
    
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileName = `event_${selectedCandidate.id_event}_category_${selectedCandidate.id_category}_candidate_${selectedCandidate.id_candidate}`;
      const fileExt = 'jpg';
      const filePath = `${fileName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('candidates')
        .getPublicUrl(filePath);

      setSelectedCandidate({
        ...selectedCandidate,
        photo_url: urlData.publicUrl
      });

      // Update the candidates list
      setCandidates(candidates.map(c => 
        c.id === selectedCandidate.id 
          ? { ...c, photo_url: urlData.publicUrl }
          : c
      ));

      toast({ title: 'Sucesso', description: 'Foto enviada com sucesso' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCandidate = async () => {
    if (!newCandidateForm.name || !newCandidateForm.id_event || !newCandidateForm.id_category || !newCandidateForm.id_candidate) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // First, create the candidate
      const { error } = await supabase
        .from('candidates')
        .insert([{
          name: newCandidateForm.name,
          name_complete: newCandidateForm.name_complete || null,
          id_event: parseInt(newCandidateForm.id_event),
          id_category: parseInt(newCandidateForm.id_category),
          id_candidate: parseInt(newCandidateForm.id_candidate)
        }]);

      if (error) throw error;

      // If there's a photo selected, upload it
      if (selectedPhoto) {
        const fileName = `event_${newCandidateForm.id_event}_category_${newCandidateForm.id_category}_candidate_${newCandidateForm.id_candidate}`;
        const fileExt = 'jpg';
        const filePath = `${fileName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('candidates')
          .upload(filePath, selectedPhoto, { upsert: true });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          // Don't throw error here, just log it since candidate was created successfully
        }
      }

      toast({ title: 'Sucesso', description: 'Candidata criada com sucesso' });
      setIsAddModalOpen(false);
      setNewCandidateForm({
        name: '',
        name_complete: '',
        id_event: '',
        id_category: '',
        id_candidate: ''
      });
      setSelectedPhoto(null);
      setPhotoPreview(null);
      fetchCandidates();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao criar candidata', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCandidate = async (candidate: CandidateWithDetails) => {
    if (!confirm('Tem certeza que deseja excluir esta candidata?')) return;

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidate.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir candidata', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Candidata excluída com sucesso' });
      fetchCandidates();
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Candidatas</h1>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar candidata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Candidata</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new_event">Evento *</Label>
                    <Select value={newCandidateForm.id_event} onValueChange={(value) => {
                      setNewCandidateForm({ ...newCandidateForm, id_event: value, id_category: '' });
                      if (value) fetchCategories(parseInt(value));
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar evento" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="new_category">Categoria *</Label>
                    <Select value={newCandidateForm.id_category} onValueChange={(value) => setNewCandidateForm({ ...newCandidateForm, id_category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id_category.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="new_id_candidate">ID da Candidata *</Label>
                    <Input
                      id="new_id_candidate"
                      type="number"
                      value={newCandidateForm.id_candidate}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, id_candidate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_name">Nome de Exibição *</Label>
                    <Input
                      id="new_name"
                      value={newCandidateForm.name}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_name_complete">Nome Completo</Label>
                    <Input
                      id="new_name_complete"
                      value={newCandidateForm.name_complete}
                      onChange={(e) => setNewCandidateForm({ ...newCandidateForm, name_complete: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Foto da Candidata</Label>
                    <div className="mt-2">
                      {photoPreview ? (
                        <img 
                          src={photoPreview} 
                          alt="Preview"
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-muted-foreground">Nenhuma foto selecionada</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="candidate-photo-upload">Selecionar Foto</Label>
                    <div className="mt-2">
                      <Input
                        id="candidate-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        disabled={uploading}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        A foto será salva automaticamente com o nome baseado nos IDs selecionados
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateCandidate} disabled={uploading}>
                  {uploading ? 'Criando...' : 'Criar Candidata'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Candidata
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCandidates.map((candidate) => (
          <Card 
            key={candidate.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openCandidateModal(candidate)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{candidate.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {candidate.event_name} - {candidate.category_name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCandidateModal(candidate);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCandidate(candidate);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{candidate.votes_count} votos</span>
              </div>
              {candidate.name_complete && (
                <p className="text-sm mt-2">
                  <strong>Nome completo:</strong> {candidate.name_complete}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCandidate.name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <p className="font-medium">{selectedCandidate.name}</p>
                  </div>
                  
                  {selectedCandidate.name_complete && (
                    <div>
                      <Label>Nome Completo</Label>
                      <p className="font-medium">{selectedCandidate.name_complete}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label>Evento</Label>
                    <p className="font-medium">{selectedCandidate.event_name}</p>
                  </div>
                  
                  <div>
                    <Label>Categoria</Label>
                    <p className="font-medium">{selectedCandidate.category_name}</p>
                  </div>
                  
                  <div>
                    <Label>ID da Candidata</Label>
                    <p className="font-medium">{selectedCandidate.id_candidate}</p>
                  </div>
                  
                  <div>
                    <Label>Total de Votos</Label>
                    <p className="font-medium text-lg text-primary">{selectedCandidate.votes_count}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Foto de Perfil</Label>
                    <div className="mt-2">
                      {selectedCandidate.photo_url ? (
                        <img 
                          src={selectedCandidate.photo_url} 
                          alt={selectedCandidate.name}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-muted-foreground">Sem foto</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="photo-upload">Enviar Nova Foto</Label>
                    <div className="mt-2">
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                      {uploading && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Enviando foto...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}