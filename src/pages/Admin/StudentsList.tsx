import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import firebaseConfig from '../../../firebase-applet-config.json';
import { Plus, Search, Edit2, Trash2, X, Save, UserPlus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, MessType } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function StudentsList() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registerNumber: '',
    messType: 'Veg' as MessType,
    roomNumber: '',
    phone: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', registerNumber: '', messType: 'Veg', roomNumber: '', phone: '' });
    setEditingStudent(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingStudent) {
        await updateDoc(doc(db, 'users', editingStudent.uid), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success("Student updated successfully");
      } else {
        // Create Auth User using secondary app to avoid logging out admin
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, 'hostel2026');
          const uid = userCred.user.uid;

          await setDoc(doc(db, 'users', uid), {
            ...formData,
            uid,
            role: 'student',
            firstLogin: true,
            createdAt: new Date().toISOString()
          });
          toast.success("Student registered successfully");
        } finally {
          // Cleanup secondary app
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
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        toast.success("Student record removed");
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.registerNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#141414]">Student Management</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Directory of all registered hostelers</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-[#141414] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
        >
          <UserPlus size={16} />
          Register Student
        </button>
      </div>

      <div className="relative">
        <input 
          type="text"
          placeholder="Search by name, register number or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
        />
        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reg No.</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mess Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Room</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">No students found matches your criteria.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.uid} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[200px] uppercase tracking-tight">{student.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-gray-600 uppercase">{student.registerNumber}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        student.messType === 'Veg' ? "bg-green-100 text-green-700" :
                        student.messType === 'Non-Veg' ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"
                      )}>
                        {student.messType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600">Room {student.roomNumber}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingStudent(student);
                            setFormData({
                              name: student.name,
                              email: student.email,
                              registerNumber: student.registerNumber || '',
                              messType: student.messType || 'Veg',
                              roomNumber: student.roomNumber || '',
                              phone: student.phone || '',
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.uid)}
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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 tracking-tight">{editingStudent ? 'Edit Student' : 'New Student Registration'}</h4>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Fill in the student credentials</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      required
                      type="email"
                      disabled={!!editingStudent}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm disabled:opacity-50"
                      placeholder="student@univ.edu"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Register Number</label>
                    <input 
                      required
                      value={formData.registerNumber}
                      onChange={(e) => setFormData({...formData, registerNumber: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm uppercase"
                      placeholder="2026M01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Mess Type</label>
                    <select 
                      value={formData.messType}
                      onChange={(e) => setFormData({...formData, messType: e.target.value as MessType})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm appearance-none"
                    >
                      <option value="Veg">Veg</option>
                      <option value="Non-Veg">Non-Veg</option>
                      <option value="Special">Special Meat</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hostel Room</label>
                    <input 
                      required
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                      placeholder="e.g. 104B"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <input 
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                {!editingStudent && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                    <Info className="text-blue-600 shrink-0" size={18} />
                    <p className="text-[10px] text-blue-800 leading-relaxed font-medium uppercase tracking-tight">
                      Default password for all new students is set to <span className="font-bold underline">hostel2026</span>. 
                      They will be prompted to change it on their first successful login.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3.5 border border-gray-200 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3.5 bg-orange-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><Save size={16} /> {editingStudent ? 'Update Details' : 'Register Student'}</>}
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


