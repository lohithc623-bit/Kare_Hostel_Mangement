import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, onSnapshot, updateDoc, deleteDoc, doc, where, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Search, Edit2, Trash2, Save, UserPlus, Info, Mail } from 'lucide-react';
import { UserProfile, MessType } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export default function StudentsList() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registerNumber: '',
    messType: 'Veg' as MessType,
    roomNumber: '',
    phone: '',
    age: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const handleRegisterNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const regNum = e.target.value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      registerNumber: regNum,
      // Auto-generate email if not manually overridden and not editing
      email: (!manualEmail && !editingStudent && regNum) ? `${regNum.toLowerCase()}@klu.ac.in` : prev.email
    }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', registerNumber: '', messType: 'Veg', roomNumber: '', phone: '', age: '' });
    setEditingStudent(null);
    setManualEmail(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        name: formData.name,
        email: formData.email,
        registerNumber: formData.registerNumber,
        messType: formData.messType,
        roomNumber: formData.roomNumber,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age, 10) : null,
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'users', editingStudent.uid), {
          ...dataToSave,
          updatedAt: new Date().toISOString()
        });
        toast.success("Student updated successfully");
      } else {
        // Just create the record in Firestore without Firebase Auth
        // Google SSO will handle authentication when they try to login
        
        // Generate a clean ID (we use email as the ID for simple tracking before UID generation)
        // or just let Firestore auto-generate an ID. Let's use email as ID.
        const docId = formData.email.toLowerCase();
        await setDoc(doc(db, 'users', docId), {
          ...dataToSave,
          uid: docId,
          role: 'student',
          firstLogin: true,
          createdAt: new Date().toISOString()
        });
        toast.success("Student registered successfully");
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-1">Student Management</h3>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Directory of all registered hostelers</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={16} />
          Register Student
        </button>
      </div>

      {/* Search & Filters */}
      <div className="relative group">
        <input 
          type="text"
          placeholder="Search identity, registration or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3.5 sm:py-4 pl-12 sm:pl-14 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
        />
        <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
      </div>

      {/* List Container */}
      <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Info</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Registration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Protocol</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.length > 0 && filteredStudents.map((student) => (
                <tr key={student.uid} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm uppercase">
                        {student.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{student.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail size={10} className="text-slate-400" />
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{student.email}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-mono font-bold text-slate-600 tracking-tight">{student.registerNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      student.messType === 'Veg' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {student.messType || 'Veg'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-bold text-slate-500">{student.roomNumber ? `R-${student.roomNumber}` : '—'}</span>
                  </td>
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
                            age: student.age ? student.age.toString() : '',
                          });
                          setIsModalOpen(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.uid)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredStudents.length > 0 && filteredStudents.map((student) => (
            <div key={student.uid} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                  {student.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-widest border shrink-0",
                      student.messType === 'Veg' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {student.messType || 'Veg'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 whitespace-nowrap">
                    <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">{student.registerNumber}</p>
                    {student.roomNumber && (
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Room {student.roomNumber}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 ml-4 shrink-0">
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
                      age: student.age ? student.age.toString() : '',
                    });
                    setIsModalOpen(true);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(student.uid)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 active:bg-rose-50 active:text-rose-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className="py-16 sm:py-24">
            <EmptyState 
              icon={<Search size={32} className="text-slate-300" />} 
              title="Identity Signal Not Found" 
              description="Refine your search parameters or check the global directory records."
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'New Student Registration'}
        subtitle="Complete the student profile"
      >
        <form onSubmit={handleSave} className="p-8 space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Register Number</label>
              <input 
                required
                value={formData.registerNumber}
                onChange={handleRegisterNumberChange}
                className="premium-input uppercase font-mono"
                placeholder="e.g. 99240041356"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <input 
                  required
                  type="email"
                  disabled={!!editingStudent || (!manualEmail && !editingStudent)}
                  value={formData.email}
                  onChange={(e) => {
                    setManualEmail(true);
                    setFormData({...formData, email: e.target.value});
                  }}
                  className="premium-input text-slate-600 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="premium-input"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Age</label>
              <input 
                type="number"
                min="16" max="100"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                className="premium-input"
                placeholder="19"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Food Preference</label>
              <select 
                value={formData.messType}
                onChange={(e) => setFormData({...formData, messType: e.target.value as MessType})}
                className="premium-input appearance-none bg-white cursor-pointer"
              >
                <option value="Veg">Vegetarian</option>
                <option value="Non-Veg">Non-Vegetarian</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hostel Room</label>
              <input 
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                className="premium-input uppercase"
                placeholder="104B"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input 
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="premium-input font-mono"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          {!editingStudent && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 text-emerald-800">
              <Info className="shrink-0" size={18} />
              <p className="text-[10px] leading-relaxed font-bold uppercase tracking-wide">
                Authentication is handled directly via <span className="underline">Google SSO</span>. 
                The student will automatically bypass the security guard wall seamlessly upon logging in using the email specified above.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
             <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-4 border border-slate-200 rounded-[var(--radius-md)] font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary text-white rounded-[var(--radius-md)] font-bold text-xs uppercase tracking-widest hover:bg-accent transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <><Save size={16} /> {editingStudent ? 'Update Details' : 'Register'}</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
