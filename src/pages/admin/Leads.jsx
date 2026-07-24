import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Phone, MessageCircle, Search, Star, Users2 } from "lucide-react";

const STATUS_COLUMNS = [{ id: "novo", label: "Novo" }, { id: "contatado", label: "Contatado" }, { id: "interessado", label: "Interessado" }, { id: "negociando", label: "Negociando" }, { id: "convertido", label: "Convertido" }, { id: "perdido", label: "Perdido" }];

const onlyDigits = str => (str || "").replace(/\D/g, "");
const whatsappLink = phone => {
  const digits = onlyDigits(phone);
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
};

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Novo lead manual
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("");
  const [saving, setSaving] = useState(false);

  // Busca automática
  const [searchCity, setSearchCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleAddLead = async () => {
    if (!newName.trim()) {
      toast.error("Digite o nome do negócio");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("leads").insert({
        business_name: newName.trim(),
        phone: newPhone.trim() || null,
        city: newCity.trim() || null,
        source: "manual",
        created_by: user.id
      });
      if (error) throw error;
      toast.success("Lead adicionado");
      setNewName("");
      setNewPhone("");
      setNewCity("");
      setAddOpen(false);
      fetchLeads();
    } catch (error) {
      console.error("Erro ao adicionar lead:", error);
      toast.error("Não foi possível adicionar o lead");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const { error } = await supabase.from("leads").update({
        status: newStatus,
        last_contact_at: newStatus !== "novo" ? new Date().toISOString() : undefined
      }).eq("id", leadId);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch (error) {
      console.error("Erro ao mudar status:", error);
      toast.error("Não foi possível mover o lead");
    }
  };

  const openDetail = lead => {
    setDetailLead(lead);
    setNotesDraft(lead.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!detailLead) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase.from("leads").update({ notes: notesDraft }).eq("id", detailLead.id);
      if (error) throw error;
      toast.success("Anotação salva");
      setLeads(prev => prev.map(l => l.id === detailLead.id ? { ...l, notes: notesDraft } : l));
      setDetailLead(null);
    } catch (error) {
      console.error("Erro ao salvar anotação:", error);
      toast.error("Não foi possível salvar");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCity.trim()) {
      toast.error("Digite uma cidade pra buscar");
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-leads", {
        body: { city: searchCity.trim() }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSearchResults(data.results || []);
      if (!data.results?.length) toast.info("Nenhum resultado encontrado para essa cidade");
    } catch (error) {
      console.error("Erro na busca:", error);
      toast.error("Não foi possível buscar", { description: error.message });
    } finally {
      setSearching(false);
    }
  };

  const importResult = async result => {
    try {
      const { error } = await supabase.from("leads").insert({
        business_name: result.business_name,
        phone: result.phone,
        address: result.address,
        rating: result.rating,
        google_place_id: result.google_place_id,
        source: "google_places",
        created_by: user.id
      });
      if (error) throw error;
      toast.success(`${result.business_name} adicionado aos leads`);
      setSearchResults(prev => prev.filter(r => r.google_place_id !== result.google_place_id));
      fetchLeads();
    } catch (error) {
      if (error.code === "23505") {
        toast.info("Esse negócio já está na sua lista");
      } else {
        console.error("Erro ao importar lead:", error);
        toast.error("Não foi possível importar");
      }
    }
  };

  const leadsByStatus = statusId => leads.filter(l => l.status === statusId);

  return <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users2 className="h-6 w-6 text-red-400" />
            Leads
          </h1>
          <p className="text-slate-400 text-sm mt-1">{leads.length} negócios na sua lista de prospecção</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSearchOpen(true)} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
            <Search className="h-4 w-4 mr-2" />
            Buscar automaticamente
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo lead
          </Button>
        </div>
      </div>

      {/* Quadro Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STATUS_COLUMNS.map(col => <div key={col.id} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-300">{col.label}</h3>
              <span className="text-xs text-slate-500">{leadsByStatus(col.id).length}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {loading ? <p className="text-xs text-slate-600 px-1">Carregando...</p> : leadsByStatus(col.id).map(lead => <Card key={lead.id} className="bg-slate-900 border-slate-800 p-3 space-y-2 cursor-pointer hover:border-slate-700" onClick={() => openDetail(lead)}>
                    <p className="text-sm font-medium text-white truncate">{lead.business_name}</p>
                    {lead.city && <p className="text-xs text-slate-500 truncate">{lead.city}</p>}
                    {lead.rating && <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <Star className="h-3 w-3 fill-amber-400" />{lead.rating}
                      </span>}
                    <div className="flex items-center gap-1.5 pt-1">
                      {lead.phone && <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-950" onClick={e => {
                e.stopPropagation();
                window.open(whatsappLink(lead.phone), "_blank");
              }}>
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>}
                      <Select value={lead.status} onValueChange={val => handleStatusChange(lead.id, val)}>
                        <SelectTrigger onClick={e => e.stopPropagation()} className="h-7 text-xs bg-slate-800 border-slate-700 text-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_COLUMNS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>)}
            </div>
          </div>)}
      </div>

      {/* Novo lead manual */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do negócio" value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
            <Input placeholder="Telefone / WhatsApp" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
            <Input placeholder="Cidade" value={newCity} onChange={e => setNewCity(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
            <Button className="w-full" onClick={handleAddLead} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhe / anotações do lead */}
      <Dialog open={!!detailLead} onOpenChange={open => !open && setDetailLead(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>{detailLead?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {detailLead?.phone && <p className="text-sm text-slate-400 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />{detailLead.phone}
              </p>}
            {detailLead?.address && <p className="text-sm text-slate-400">{detailLead.address}</p>}
            <Textarea placeholder="Anotações sobre o contato..." value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={4} className="bg-slate-800 border-slate-700 text-slate-100" />
            <div className="flex gap-2">
              {detailLead?.phone && <Button variant="outline" className="bg-slate-800 border-green-800 text-green-400 hover:bg-green-950" onClick={() => window.open(whatsappLink(detailLead.phone), "_blank")}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>}
              <Button className="flex-1" onClick={handleSaveNotes} disabled={savingNotes}>
                {savingNotes ? "Salvando..." : "Salvar anotação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Busca automática (Google Places) */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buscar assistências técnicas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Cidade (ex: Coelho Neto, MA)" value={searchCity} onChange={e => setSearchCity(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-100" />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            <div className="space-y-2">
              {searchResults.map(r => <Card key={r.google_place_id} className="bg-slate-800 border-slate-700 p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.business_name}</p>
                    <p className="text-xs text-slate-400 truncate">{r.address}</p>
                    {r.phone && <p className="text-xs text-slate-500">{r.phone}</p>}
                  </div>
                  <Button size="sm" onClick={() => importResult(r)} className="shrink-0">
                    Adicionar
                  </Button>
                </Card>)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Leads;
