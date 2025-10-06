import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Users, Search, Plus, Edit, Trash2, Camera } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CandidateImage } from '@/components/CandidateImage';

interface Candidate {
  id: number;
  name: string;
  name_complete: string;
  id_event: number;
  id_category: number;
  id_candidate: number;
  created_at: string;
  phone?: string;
}

interface Event {
  id: number;
  name: string;
  start_vote: string;
  end_vote: string;
  active: boolean;
}

interface Category {
  id: number;
  name: string;
  id_category: number;
  id_event: number;
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
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<CandidateWithDetails | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Always regenerate collage banner when a candidate photo changes
  const regenerateBanner = async (eventId: number, categoryId: number) => {
    try {
      toast({ title: 'Atualizando banner', description: 'Gerando colagem...', duration: 2000 });
      const { data, error } = await supabase.functions.invoke('collage', {
        body: { id_event: eventId, id_category: categoryId },
      });
      if (error || (data && data.ok === false)) {
        console.error('Collage error:', error || data?.error);
        toast({
          title: 'Erro ao atualizar banner',
          description: (error?.message || data?.error) ?? 'Tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Banner atualizado', description: 'A colagem foi gerada.' });
      }
    } catch (e: any) {
      console.error('Collage invoke failed:', e);
      toast({ title: 'Erro ao atualizar banner', description: e?.message || 'Falha na função.', variant: 'destructive' });
    }
  };

  const [newCandidateForm, setNewCandidateForm] = useState({
    name: '',
    name_complete: '',
    id_event: '',
    id_category: '',
    phone_ddi: '+55',
    phone_ddd: '',
    phone_number: ''
  });

  const [editCandidateForm, setEditCandidateForm] = useState({
    name: '',
    name_complete: '',
    id_event: '',
    id_category: '',
    id_candidate: '',
    phone_ddi: '+55',
    phone_ddd: '',
    phone_number: ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Reset "Add Candidate" form/modal state
  const resetAddForm = () => {
    setNewCandidateForm({
      name: '',
      name_complete: '',
      id_event: '',
      id_category: '',
      phone_ddi: '+55',
      phone_ddd: '',
      phone_number: ''
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const handleOpenAddModal = () => {
    resetAddForm();
    setIsAddModalOpen(true);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchCandidates()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEvent && selectedEvent !== '') {
      fetchCategories(parseInt(selectedEvent));
      // Reset category selection to "all" when event changes
      setSelectedCategory('all');
    }
  }, [selectedEvent]);

  useEffect(() => {
    applyFilters();
  }, [candidates, selectedEvent, selectedCategory, searchTerm]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, start_vote, end_vote, active')
      .order('start_vote', { ascending: true }); // Order by start date
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar eventos', variant: 'destructive' });
    } else {
      setEvents(data || []);
      // Auto-select the first active event that is currently ongoing
      if (data && data.length > 0 && (selectedEvent === 'all' || !selectedEvent)) {
        const now = new Date();
        // Filter only active events
        const activeEvents = data.filter(event => event.active === true);
        
        if (activeEvents.length > 0) {
          // Find the first active event that is currently ongoing
          const ongoingEvent = activeEvents.find(event => {
            const startDate = new Date(event.start_vote);
            const endDate = new Date(event.end_vote);
            return now >= startDate && now <= endDate;
          });
          
          // Select ongoing event if found, otherwise select the first active event
          const eventToSelect = ongoingEvent || activeEvents[0];
          setSelectedEvent(eventToSelect.id.toString());
        }
      }
    }
  };

  const fetchCategories = async (eventId: number) => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, id_category, id_event')
      .eq('id_event', eventId)
      .order('id_category');
    
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar categorias', variant: 'destructive' });
    } else {
      setCategories(data || []);
      // Auto-select the first category if categories exist and no category is selected
      if (data && data.length > 0 && (selectedCategory === '' || selectedCategory === 'all')) {
        setSelectedCategory(data[0].id_category.toString());
      }
    }
  };

  const fetchCandidates = async () => {
    try {
      // Fetch candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .order('id_candidate', { ascending: true });

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
    
    // Always filter by selected event (no "all" option)
    if (selectedEvent && selectedEvent !== '') {
      filtered = filtered.filter(c => c.id_event === parseInt(selectedEvent));
    }
    
    // Filter by selected category if one is selected and it's not "all"
    if (selectedCategory && selectedCategory !== '' && selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.id_category === parseInt(selectedCategory));
    }
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name_complete?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort by candidate ID (ascending)
    filtered = filtered.sort((a, b) => a.id_candidate - b.id_candidate);
    
    setFilteredCandidates(filtered);
  };

  const openCandidateModal = async (candidate: CandidateWithDetails) => {
    // Reset photo selection states
    setSelectedPhoto(null);
    setPhotoPreview(null);
    
    // Get the fresh photo URL from storage to avoid cache
    const fileName = `event_${candidate.id_event}_category_${candidate.id_category}_candidate_${candidate.id_candidate}`;
    const filePath = `${fileName}.jpg`;
    
    const { data: photoData } = await supabase.storage
      .from('candidates')
      .getPublicUrl(filePath);
    
    // Add timestamp to break cache
    const freshPhotoUrl = `${photoData.publicUrl}?t=${Date.now()}`;
    
    const candidateWithFreshPhoto = {
      ...candidate,
      photo_url: freshPhotoUrl
    };
    
    setSelectedCandidate(candidateWithFreshPhoto);
    // Parse phone number if it exists
    let phoneDdi = '+55';
    let phoneDdd = '';
    let phoneNumber = '';
    
    if (candidate.phone) {
      const phoneMatch = candidate.phone.match(/^\+(\d{2})(\d{2})(\d{8,9})$/);
      if (phoneMatch) {
        phoneDdi = `+${phoneMatch[1]}`;
        phoneDdd = phoneMatch[2];
        phoneNumber = phoneMatch[3];
      }
    }

    setEditCandidateForm({
      name: candidate.name,
      name_complete: candidate.name_complete || '',
      id_event: candidate.id_event.toString(),
      id_category: candidate.id_category.toString(),
      id_candidate: candidate.id_candidate.toString(),
      phone_ddi: phoneDdi,
      phone_ddd: phoneDdd,
      phone_number: phoneNumber
    });
    
    // Load categories for the selected event
    fetchCategories(candidate.id_event);
    setIsModalOpen(true);
  };

  // Convert any selected image to JPEG without changing dimensions
  const convertToJpeg = async (file: File): Promise<Blob> => {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao converter imagem'));
      }, 'image/jpeg', 0.92);
    });
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

      const jpegBlob = await convertToJpeg(file);

      const { error: uploadError } = await supabase.storage
        .from('candidates')
        .upload(filePath, jpegBlob, { upsert: true, contentType: 'image/jpeg' });

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

      await regenerateBanner(selectedCandidate.id_event, selectedCandidate.id_category);

      toast({ title: 'Sucesso', description: 'Foto enviada com sucesso' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCandidate = async () => {
    if (!newCandidateForm.name || !newCandidateForm.id_event || !newCandidateForm.id_category) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // Get the next sequential id_candidate for this category
      const { data: existingCandidates, error: fetchError } = await supabase
        .from('candidates')
        .select('id_candidate')
        .eq('id_event', parseInt(newCandidateForm.id_event))
        .eq('id_category', parseInt(newCandidateForm.id_category))
        .order('id_candidate', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextIdCandidate = existingCandidates && existingCandidates.length > 0 
        ? existingCandidates[0].id_candidate + 1 
        : 1;

      // Create phone number if provided (numbers only, no + prefix)
      let fullPhone = null;
      if (newCandidateForm.phone_ddd && newCandidateForm.phone_number) {
        const ddi = newCandidateForm.phone_ddi.replace('+', '');
        fullPhone = `${ddi}${newCandidateForm.phone_ddd}${newCandidateForm.phone_number}`;
      }

      // First, create the candidate
      const { error } = await supabase
        .from('candidates')
        .insert([{
          name: newCandidateForm.name,
          name_complete: newCandidateForm.name_complete || null,
          id_event: parseInt(newCandidateForm.id_event),
          id_category: parseInt(newCandidateForm.id_category),
          id_candidate: nextIdCandidate,
          phone: fullPhone
        }]);

      if (error) throw error;

      // If there's a photo selected, upload it
      if (selectedPhoto) {
        const fileName = `event_${newCandidateForm.id_event}_category_${newCandidateForm.id_category}_candidate_${nextIdCandidate}`;
        const fileExt = 'jpg';
        const filePath = `${fileName}.${fileExt}`;

        const jpegBlob = await convertToJpeg(selectedPhoto);

        const { error: uploadError } = await supabase.storage
          .from('candidates')
          .upload(filePath, jpegBlob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          // Don't throw error here, just log it since candidate was created successfully
        }
      }

      // Always regenerate banner when creating new candidate (new id_candidate, id_category, name, and potentially photo)
      await regenerateBanner(parseInt(newCandidateForm.id_event), parseInt(newCandidateForm.id_category));

      toast({ title: 'Sucesso', description: 'Candidata criada com sucesso' });
      setIsAddModalOpen(false);
      setNewCandidateForm({
        name: '',
        name_complete: '',
        id_event: '',
        id_category: '',
        phone_ddi: '+55',
        phone_ddd: '',
        phone_number: ''
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
    setCandidateToDelete(candidate);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;

    // First, check if candidate has approved votes
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('id')
      .eq('id_event', candidateToDelete.id_event)
      .eq('id_category', candidateToDelete.id_category)
      .eq('id_candidate', candidateToDelete.id_candidate)
      .eq('payment_status', 'approved')
      .limit(1);

    if (votesError) {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao verificar votos da candidata', 
        variant: 'destructive' 
      });
      return;
    }

    // If candidate has approved votes, prevent deletion
    if (votesData && votesData.length > 0) {
      toast({ 
        title: 'Não é possível excluir', 
        description: 'Esta candidata possui votos aprovados e não pode ser excluída.', 
        variant: 'destructive' 
      });
      setIsDeleteDialogOpen(false);
      setCandidateToDelete(null);
      return;
    }

    // Proceed with deletion if no approved votes
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateToDelete.id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir candidata', variant: 'destructive' });
    } else {
      // 1. Show success toast immediately
      toast({ title: 'Sucesso', description: 'Candidata excluída com sucesso' });
      
      // 2. Remove from local state (update UI immediately)
      setCandidates(candidates.filter(c => c.id !== candidateToDelete.id));
      
      // 3. Finally, regenerate banner in background
      await regenerateBanner(candidateToDelete.id_event, candidateToDelete.id_category);
    }
    
    setIsDeleteDialogOpen(false);
    setCandidateToDelete(null);
  };

  const handleEditCandidate = async () => {
    if (!selectedCandidate || !editCandidateForm.name || !editCandidateForm.id_event || !editCandidateForm.id_category || !editCandidateForm.id_candidate) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // Check if banner-affecting fields will change
      const originalCandidate = selectedCandidate;
      const nameChanged = editCandidateForm.name !== originalCandidate.name;
      const idCandidateChanged = parseInt(editCandidateForm.id_candidate) !== originalCandidate.id_candidate;
      const idCategoryChanged = parseInt(editCandidateForm.id_category) !== originalCandidate.id_category;
      const photoChanged = selectedPhoto !== null;
      
      const bannerShouldRegenerate = nameChanged || idCandidateChanged || idCategoryChanged || photoChanged;

      // Create phone number if provided (numbers only, no + prefix)
      let fullPhone = null;
      if (editCandidateForm.phone_ddd && editCandidateForm.phone_number) {
        const ddi = editCandidateForm.phone_ddi.replace('+', '');
        fullPhone = `${ddi}${editCandidateForm.phone_ddd}${editCandidateForm.phone_number}`;
      }

      const { error } = await supabase
        .from('candidates')
        .update({
          name: editCandidateForm.name,
          name_complete: editCandidateForm.name_complete || null,
          id_event: parseInt(editCandidateForm.id_event),
          id_category: parseInt(editCandidateForm.id_category),
          id_candidate: parseInt(editCandidateForm.id_candidate),
          phone: fullPhone
        })
        .eq('id', selectedCandidate.id);

      if (error) throw error;

      // If there's a photo selected, upload it
      if (selectedPhoto) {
        console.log('📸 Starting photo upload process...');
        console.log('Selected photo:', selectedPhoto);
        
        const fileName = `event_${editCandidateForm.id_event}_category_${editCandidateForm.id_category}_candidate_${editCandidateForm.id_candidate}`;
        const fileExt = 'jpg';
        const filePath = `${fileName}.${fileExt}`;
        
        console.log('File path for upload:', filePath);

        try {
          const jpegBlob = await convertToJpeg(selectedPhoto);
          console.log('✅ JPEG conversion successful, blob size:', jpegBlob.size);

          // Remove old file first to ensure fresh upload
          console.log('🗑️ Removing old file...');
          const { error: removeError } = await supabase.storage
            .from('candidates')
            .remove([filePath]);
          
          if (removeError) {
            console.log('⚠️ Remove error (might not exist):', removeError);
          } else {
            console.log('✅ Old file removed or didn\'t exist');
          }

          console.log('⬆️ Uploading new file...');
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('candidates')
            .upload(filePath, jpegBlob, { contentType: 'image/jpeg' });

          if (uploadError) {
            console.error('❌ Upload failed:', uploadError);
            toast({ title: 'Erro', description: `Erro ao fazer upload da foto: ${uploadError.message}`, variant: 'destructive' });
            throw uploadError; // This will prevent the success message
          } else {
            console.log('✅ Upload successful:', uploadData);
            toast({ title: 'Sucesso', description: 'Foto atualizada com sucesso!' });
          }
        } catch (conversionError) {
          console.error('❌ JPEG conversion failed:', conversionError);
          toast({ title: 'Erro', description: 'Erro ao processar imagem', variant: 'destructive' });
          throw conversionError; // This will prevent the success message
        }
      } else {
        console.log('ℹ️ No photo selected for upload');
      }

      // Only regenerate banner if relevant fields changed
      if (bannerShouldRegenerate) {
        console.log('🎨 Regenerating banner due to changes in:', {
          nameChanged,
          idCandidateChanged, 
          idCategoryChanged,
          photoChanged
        });
        await regenerateBanner(parseInt(editCandidateForm.id_event), parseInt(editCandidateForm.id_category));
      } else {
        console.log('ℹ️ Banner regeneration skipped - no relevant changes detected');
      }

      toast({ title: 'Sucesso', description: 'Candidata atualizada com sucesso' });
      
      // Always refresh the candidates list to get fresh photo URLs
      await fetchCandidates();
      
      setIsModalOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar candidata', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPreview = e.target?.result as string;
        setPhotoPreview(newPreview);
        
        // If we're editing a candidate, update the preview immediately
        if (selectedCandidate) {
          setSelectedCandidate({
            ...selectedCandidate,
            photo_url: newPreview
          });
        }
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
    <div className="p-4 md:p-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar candidata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Evento" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id_category.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end mb-4">
        <Button onClick={handleOpenAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Candidata
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCandidates.map((candidate) => (
          <Card 
            key={candidate.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
            onClick={() => openCandidateModal(candidate)}
          >
            <div className="flex gap-4 p-4">
              <div className="w-24 h-32 flex-shrink-0">
                <CandidateImage
                  src={candidate.photo_url}
                  alt={`Foto de ${candidate.name}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <CardTitle className="text-sm font-semibold leading-tight mb-1">
                      #{candidate.id_candidate} - {candidate.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {candidate.event_name} - {candidate.category_name}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
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
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{candidate.votes_count} votos</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Candidate Modal */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (open) resetAddForm();
        }}
      >
        <DialogContent className="max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
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
                <Select
                  value={newCandidateForm.id_category}
                  onValueChange={(value) =>
                    setNewCandidateForm({ ...newCandidateForm, id_category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {newCandidateForm.id_event &&
                      categories
                        .filter((c) => c.id_event === parseInt(newCandidateForm.id_event))
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id_category.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>


              <div>
                <Label htmlFor="new_name">Nome de Exibição *</Label>
                <Input
                  id="new_name"
                  value={newCandidateForm.name}
                  onChange={(e) => setNewCandidateForm({ ...newCandidateForm, name: e.target.value.slice(0, 24) })}
                  maxLength={24}
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

              {/* Phone Fields */}
              <div>
                <Label>Telefone</Label>
                <div className="flex gap-2">
                  <div className="w-20">
                    <Select 
                      value={newCandidateForm.phone_ddi} 
                      onValueChange={(value) => setNewCandidateForm({ ...newCandidateForm, phone_ddi: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+55">+55</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-16">
                    <Input
                      placeholder="DDD"
                      value={newCandidateForm.phone_ddd}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setNewCandidateForm({ ...newCandidateForm, phone_ddd: value });
                      }}
                      maxLength={2}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Número"
                      value={newCandidateForm.phone_number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setNewCandidateForm({ ...newCandidateForm, phone_number: value });
                      }}
                      maxLength={9}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Foto da Candidata</Label>
                <div className="mt-2">
                  {photoPreview ? (
                    <CandidateImage
                      src={photoPreview} 
                      alt="Preview"
                      className="w-full aspect-[4/5] object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-[4/5] bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">Nenhuma foto selecionada</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="candidate-photo-upload">Selecionar Foto</Label>
                <div className="mt-2">
                  <input
                    id="candidate-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('candidate-photo-upload')?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Selecionar Foto
                  </Button>
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
                resetAddForm();
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

      {/* Candidate Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl mx-4 my-4 max-h-[90vh] overflow-y-auto">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCandidate.name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Nome *</Label>
                    <Input
                      id="edit-name"
                      type="text"
                      value={editCandidateForm.name}
                      onChange={(e) => setEditCandidateForm({...editCandidateForm, name: e.target.value.slice(0, 24)})}
                      placeholder="Digite o nome da candidata"
                      maxLength={24}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-name-complete">Nome Completo</Label>
                    <Input
                      id="edit-name-complete"
                      type="text"
                      value={editCandidateForm.name_complete}
                      onChange={(e) => setEditCandidateForm({...editCandidateForm, name_complete: e.target.value})}
                      placeholder="Digite o nome completo (opcional)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-event">Evento *</Label>
                    <Select value={editCandidateForm.id_event} onValueChange={(value) => setEditCandidateForm({...editCandidateForm, id_event: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um evento" />
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
                  
                  {editCandidateForm.id_event && (
                    <div>
                      <Label htmlFor="edit-category">Categoria *</Label>
                      <Select value={editCandidateForm.id_category} onValueChange={(value) => setEditCandidateForm({...editCandidateForm, id_category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter(cat => cat.id_event === parseInt(editCandidateForm.id_event))
                            .map((category) => (
                            <SelectItem key={category.id} value={category.id_category.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  
                  {/* Phone Fields */}
                  <div>
                    <Label>Telefone</Label>
                    <div className="flex gap-2">
                      <div className="w-20">
                        <Select 
                          value={editCandidateForm.phone_ddi} 
                          onValueChange={(value) => setEditCandidateForm({ ...editCandidateForm, phone_ddi: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+55">+55</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-16">
                        <Input
                          placeholder="DDD"
                          value={editCandidateForm.phone_ddd}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                            setEditCandidateForm({ ...editCandidateForm, phone_ddd: value });
                          }}
                          maxLength={2}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Número"
                          value={editCandidateForm.phone_number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                            setEditCandidateForm({ ...editCandidateForm, phone_number: value });
                          }}
                          maxLength={9}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Total de Votos</Label>
                    <p className="font-medium text-lg text-primary">{selectedCandidate.votes_count}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Foto da Candidata</Label>
                    <div className="mt-2">
                      <CandidateImage
                        src={photoPreview || selectedCandidate.photo_url}
                        alt={selectedCandidate.name}
                        className="w-full aspect-[4/5] object-cover rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <input
                      id="edit-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      disabled={uploading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('edit-photo-upload')?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {selectedCandidate.photo_url ? 'Trocar Foto' : 'Selecionar Foto'}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                  }}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleEditCandidate}
                  disabled={uploading}
                >
                  {uploading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a candidata "{candidateToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCandidate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}