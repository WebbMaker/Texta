import React, { useState } from 'react';
import { Conversation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Users, X, Shield, UserMinus, Edit2 } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';

interface Props {
  conversation: Conversation;
  friendsInfo: Record<string, {username: string, avatarUrl?: string}>;
  onClose: () => void;
}

export function ChatSettings({ conversation, friendsInfo, onClose }: Props) {
  const { user } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || '');

  if (!user) return null;

  const isAdmin = conversation.type === 'group' && conversation.admins?.includes(user.uid);
  const friendId = conversation.type === 'direct' ? conversation.participants.find(p => p !== user.uid) : null;

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === conversation.name) {
      setEditingName(false);
      return;
    }
    await updateDoc(doc(db, 'conversations', conversation.id), {
       name: newName.trim(),
       updatedAt: Date.now()
    });
    setEditingName(false);
  };

  const handleChangePhoto = async () => {
    const url = prompt('Wklej link do zdjęcia grupy:');
    if (url) {
       await updateDoc(doc(db, 'conversations', conversation.id), { photoUrl: url, updatedAt: Date.now() });
    }
  };

  const handleSetNickname = async (uid: string) => {
    const nick = prompt(`Podaj pseudonim dla ${friendsInfo[uid]?.username}:`);
    if (nick !== null) {
       await updateDoc(doc(db, 'conversations', conversation.id), {
          [`nicknames.${uid}`]: nick,
          updatedAt: Date.now()
       });
    }
  };

  const handleBlock = async () => {
    if (!friendId) return;
    if (confirm('Czy na pewno chcesz zablokować tego użytkownika?')) {
      await setDoc(doc(db, 'users', user.uid, 'blocks', friendId), { blockedAt: Date.now() });
      alert('Użytkownik zablokowany.');
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendId) return;
    if (confirm('Czy na pewno chcesz usunąć z listy znajomych?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'friends', friendId));
      await deleteDoc(doc(db, 'users', friendId, 'friends', user.uid));
      alert('Usunięto ze znajomych.');
    }
  };

  return (
    <div className="w-80 border-l border-white/10 bg-zinc-950/95 backdrop-blur-xl p-6 flex flex-col absolute top-0 right-0 h-full shadow-2xl z-20 overflow-y-auto">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <h3 className="font-bold text-lg font-display">Ustawienia</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center mb-8 shrink-0">
         {conversation.type === 'group' ? (
           <div className="relative group/avatar cursor-pointer" onClick={() => isAdmin && handleChangePhoto()}>
             {conversation.photoUrl ? (
                <img src={conversation.photoUrl} alt="" className="w-20 h-20 rounded-full shadow-lg object-cover mb-4" />
             ) : (
               <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center shadow-lg mb-4">
                 <Users className="w-10 h-10 text-white" />
               </div>
             )}
             {isAdmin && (
               <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity mb-4">
                  <Edit2 className="w-6 h-6 text-white" />
               </div>
             )}
           </div>
         ) : friendId ? (
           <UserAvatar userId={friendId} username={friendsInfo[friendId]?.username || ''} className="w-20 h-20 shadow-lg mb-4" />
         ) : null}

         {conversation.type === 'group' ? (
           <div className="flex items-center gap-2">
             {editingName ? (
               <div className="flex items-center gap-2">
                 <input 
                   autoFocus
                   type="text" 
                   value={newName} 
                   onChange={e => setNewName(e.target.value)}
                   className="bg-zinc-800 text-white px-3 py-1 rounded outline-none border border-white/20 text-center w-full"
                 />
                 <button onClick={handleUpdateName} className="text-green-400 text-sm font-bold">Zapisz</button>
               </div>
             ) : (
               <>
                 <span className="font-bold text-xl">{conversation.name || 'Grupa'}</span>
                 {isAdmin && (
                   <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-white">
                     <Edit2 className="w-4 h-4" />
                   </button>
                 )}
               </>
             )}
           </div>
         ) : (
           <span className="font-bold text-xl">{friendsInfo[friendId!]?.username || 'Użytkownik'}</span>
         )}
      </div>

      {conversation.type === 'direct' && (
         <div className="space-y-2 mt-4 border-t border-white/10 pt-6">
           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Opcje</h4>
           <button onClick={handleBlock} className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/5 rounded-xl text-red-400 font-medium transition-colors">
             <Shield className="w-5 h-5" /> Blokuj
           </button>
           <button onClick={handleRemoveFriend} className="w-full flex items-center gap-3 py-3 px-4 hover:bg-white/5 rounded-xl text-red-400 font-medium transition-colors">
             <UserMinus className="w-5 h-5" /> Usuń znajomego
           </button>
         </div>
      )}

      {conversation.type === 'group' && (
         <div className="mt-4 border-t border-white/10 pt-6 flex-1">
           <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex justify-between items-center">
             <span>Uczestnicy ({conversation.participants.length})</span>
             <button title="Dodaj osobę" onClick={async () => {
                const uname = prompt('Wpisz dokładną nazwę użytkownika:');
                if(!uname) return;
                try {
                  const { getDocs, query, collection, where, addDoc } = await import('firebase/firestore');
                  const snap = await getDocs(query(collection(db, 'usernames'), where('__name__', '==', uname.toLowerCase())));
                  if(snap.empty) { alert('Nie znaleziono użytkownika.'); return; }
                  const targetUid = snap.docs[0].data().userId;
                  
                  if (conversation.participants.includes(targetUid)) {
                    alert('Ten użytkownik jest już w grupie.'); return;
                  }

                  if(isAdmin) {
                    await updateDoc(doc(db, 'conversations', conversation.id), { participants: [...conversation.participants, targetUid] });
                    alert('Dodano użytkownika.');
                  } else {
                    await addDoc(collection(db, 'group_requests'), {
                       conversationId: conversation.id,
                       targetUserId: targetUid,
                       requesterId: user.uid,
                       createdAt: Date.now()
                    });
                    alert('Prośba o dodanie została wysłana do adminów.');
                  }
                } catch(e) { console.error(e); }
             }} className="text-neon-blue hover:text-white px-2 py-0.5 rounded bg-neon-blue/10 text-[10px]">+ Dodaj</button>
           </h4>
           <div className="space-y-3">
             {conversation.participants.map(pid => (
               <div key={pid} className="flex items-center gap-3">
                 <UserAvatar userId={pid} username={friendsInfo[pid]?.username || ''} className="w-8 h-8" />
                 <div className="flex flex-col min-w-0 flex-1">
                   <div className="flex items-center gap-2">
                     <span className="font-semibold text-sm truncate">
                       {conversation.nicknames?.[pid] || friendsInfo[pid]?.username || 'Ładowanie...'}
                     </span>
                     {conversation.admins?.includes(pid) && (
                       <span className="text-[9px] bg-[#007aff]/20 text-[#007aff] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shrink-0">Admin</span>
                     )}
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                     <button onClick={() => handleSetNickname(pid)} className="text-[10px] text-gray-400 hover:text-white">Zmień pseudonim</button>
                     {isAdmin && pid !== user.uid && (
                       <>
                         {!conversation.admins?.includes(pid) && (
                           <button onClick={async () => {
                             await updateDoc(doc(db, 'conversations', conversation.id), { admins: [...(conversation.admins||[]), pid] });
                           }} className="text-[10px] text-green-400 hover:underline">Daj admina</button>
                         )}
                         <button onClick={async () => {
                           if(confirm(`Wyrzucić ${friendsInfo[pid]?.username}?`)) {
                             await updateDoc(doc(db, 'conversations', conversation.id), { participants: conversation.participants.filter(p => p !== pid) });
                           }
                         }} className="text-[10px] text-red-400 hover:underline">Wyrzuć</button>
                       </>
                     )}
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
}
