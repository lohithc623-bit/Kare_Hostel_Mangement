import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Search, Edit2, Trash2, X, Save, UserPlus, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function StaffList() {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      if (editingStaff) {
        await updateDoc(doc(db, 'users', editingStaff.uid), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success("Staff updated successfully");
      } else {
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryStaff");
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, 'hostel2026');
          const uid = userCred.user.uid;

          await setDoc(doc(db, 'users', uid), {
            ...formData,
            uid,
            role: 'staff',
            firstLogin: true,
            createdAt: new Date().toISOString()
          });
          toast.success("Staff member created");
        } finally {
          await deleteApp(secondaryApp);
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#141414]">Staff Management</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Personnel with mess hall access</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#141414] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg"
        >
          <UserPlus size={16} />
          Add Staff Member
        </button>
      </div>

      <div className="relative">
        <input 
          type="text"
          placeholder="Search staff by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
        />
        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm">No staff members found.</td>
              </tr>
            ) : (
              filteredStaff.map((person) => (
                <tr key={person.uid} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">
                        {person.name[0]}
                      </div>
                      <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{person.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">{person.email}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">{person.phone || 'N/A'}</td>
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
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(person.uid)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Assign system permissions</p>
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
                    <input 
                      required
                      type="email"
                      disabled={!!editingStaff}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:opacity-50"
                    />
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
