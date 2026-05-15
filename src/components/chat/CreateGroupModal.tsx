import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { UserAvatar } from '../UserAvatar';

export function CreateGroupModal({ onClose, onGroupCreated }: { onClose: () => void, onGroupCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<{uid: string, username: string}[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchFriends = async () => {
      const snap = await getDocs(collection(db, 'users', user.uid, 'friends'));
      const fList = snap.docs.map(d => ({ uid: d.id, username: d.data().username }));
      setFriends(fList);
    };
    fetchFriends();
  }, [user]);

  const handleCreate = async () => {
    if (!user || selectedFriends.length === 0) return;
    setLoading(true);
    try {
      const participants = [user.uid, ...selectedFriends];
      
      const convRef = await addDoc(collection(db, 'conversations'), {
        type: 'group',
        participants,
        admins: [user.uid],
        name: groupName || 'Nowa Grupa',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessage: {
          text: 'Utworzono grupę',
          senderId: 'system',
          createdAt: Date.now()
        }
      });
      
      onGroupCreated(convRef.id);
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        <h2 className="text-xl font-bold mb-4">Utwórz nową grupę</h2>
        <input 
           type="text" 
           placeholder="Nazwa grupy (opcjonalnie)" 
           value={groupName}
           onChange={e => setGroupName(e.target.value)}
           className="w-full bg-bg-dark border border-gray-700 rounded-xl px-4 py-2 mb-4 text-white focus:border-neon-blue outline-none"
        />
        
        <div className="max-h-60 overflow-y-auto mb-4 border border-gray-800 rounded-xl p-2 bg-black/30">
           {friends.map(f => (
             <label key={f.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedFriends.includes(f.uid)}
                  onChange={(e) => {
                     if (e.target.checked) setSelectedFriends(p => [...p, f.uid]);
                     else setSelectedFriends(p => p.filter(id => id !== f.uid));
                  }}
                  className="w-4 h-4 rounded border-gray-700 text-neon-blue focus:ring-neon-blue bg-black"
                />
                <UserAvatar userId={f.uid} username={f.username} className="w-8 h-8" />
                <span className="font-semibold text-sm">{f.username}</span>
             </label>
           ))}
           {friends.length === 0 && <p className="text-center text-gray-500 text-xs py-4">Brak znajomych.</p>}
        </div>

        <div className="flex gap-3 justify-end mt-6">
           <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 text-sm font-bold">Anuluj</button>
           <button 
             onClick={handleCreate} 
             disabled={selectedFriends.length === 0 || loading}
             className="px-4 py-2 bg-neon-blue text-black rounded-xl text-sm font-bold disabled:opacity-50"
           >
             Utwórz
           </button>
        </div>
      </div>
    </div>
  );
}
