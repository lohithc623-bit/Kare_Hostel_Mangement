import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, updateDoc, deleteDoc, doc, where, setDoc } from 'firebase/firestore';
import { Search, Edit2, Trash2, X, Save, UserPlus, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export default function StaffList() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'staff'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '' });
    setEditingStaff(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only admins can manage staff members.");
      return;
    }
    setLoading(true);

    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'users', editingStaff.uid), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success("Staff updated successfully");
      } else {
        // Since we enforce Google SSO, we no longer create traditional passwords.
        // We set the document ID exactly to their email address.
        const uid = formData.email.toLowerCase();
        
        await setDoc(doc(db, 'users', uid), {
          ...formData,
          email: formData.email.toLowerCase(),
          uid,
          role: 'staff',
          firstLogin: true,
          createdAt: new Date().toISOString()
        });
        toast.success("Staff member created. They can now login via Google.");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Staff save error:', err);
      toast.error(err.message || "Failed to save staff member");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!isAdmin) {
      toast.error("Only admins can delete staff members.");
      return;
    }
    if (window.confirm("Delete this staff member? They will lose all access.")) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        toast.success("Staff access revoked");
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-1">Staff Management</h3>
          <p className="text-xs sm:text-sm text-slate-400 font-medium whitespace-nowrap">Personnel authorized for hall operations</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-primary text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest px-6 py-4 sm:px-8 sm:py-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative group">
        <input 
          type="text"
          placeholder="Lookup staff name or email identity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-4 sm:py-5 pl-12 sm:pl-14 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
        />
        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Identity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Mobile Connection</th>
                {isAdmin && (
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStaff.length > 0 && filteredStaff.map((person) => (
                <tr key={person.uid} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm uppercase">
                        {person.name[0]}
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] uppercase tracking-tight">{person.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{person.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-mono font-bold text-slate-400">{person.phone || '—'}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingStaff(person);
                            setFormData({
                              name: person.name,
                              email: person.email,
                              phone: person.phone || '',
                            });
                            setIsModalOpen(true);
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(person.uid)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card-based List */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredStaff.length > 0 && filteredStaff.map((person) => (
            <div key={person.uid} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  {person.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate uppercase mt-0.5">{person.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{person.email}</p>
                    {person.phone && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <p className="text-[10px] font-mono text-slate-400 font-bold">{person.phone}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 ml-4 shrink-0">
                <button 
                  onClick={() => {
                    setEditingStaff(person);
                    setFormData({
                      name: person.name,
                      email: person.email,
                      phone: person.phone || '',
                    });
                    setIsModalOpen(true);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(person.uid)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 active:bg-rose-50 active:text-rose-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredStaff.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-400 italic text-sm font-medium">No personnel records found.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 tracking-tight">{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</h4>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Assign system permissions via Google SSO</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Google Email Address</label>
                    <input 
                      required
                      type="email"
                      disabled={!!editingStaff}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="staff@gmail.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                    />
                    {!editingStaff && (
                      <p className="text-[9px] text-gray-400 mt-1 ml-1">Staff will login using Google SSO with this exact email.</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Phone</label>
                    <input 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-xl flex gap-3 border border-orange-100">
                  <ShieldCheck className="text-orange-600 shrink-0" size={18} />
                  <p className="text-[10px] text-orange-800 font-medium leading-relaxed uppercase tracking-tight">
                    By default, staff can scan QR codes and update meal availability but cannot create other staff members or delete student profiles. 
                    <strong className="block mt-1">Staff must login using Google SSO with this EXACT email address.</strong>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/20">
                    {loading ? 'Processing...' : 'Save Staff Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
