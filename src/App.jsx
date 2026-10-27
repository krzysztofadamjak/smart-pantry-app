import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pantry, setPantry] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchPantry(u.uid);
    });
    return () => unsub();
  }, []);

  const fetchPantry = async (uid) => {
    const q = query(collection(db, "pantry"), where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    setPantry(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleLogin = async (isSignup) => {
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/qwen-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: reader.result })
        });
        const data = await res.json();
        const content = JSON.parse(data.choices[0].message.content);
        
        // Zapisz produkty do Firestore
        for (let item of (content.products || content)) {
          await addDoc(collection(db, "pantry"), {
            uid: user.uid,
            name: item.name,
            quantity: item.quantity || '1 szt',
            expiryDate: item.expiryDate || 'Brak daty'
          });
        }
        fetchPantry(user.uid);
      } catch (err) {
        alert('Błąd przetwarzania OCR przez Qwen');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div style={{ padding: 40, maxWidth: 400, margin: 'auto' }}>
        <h2>Smart Pantry - Logowanie</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /><br/>
        <input type="password" placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)} /><br/>
        <button onClick={() => handleLogin(false)}>Zaloguj się</button>
        <button onClick={() => handleLogin(true)}>Zarejestruj się</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: 'auto' }}>
      <h1>Wirtualna Spiżarnia (Qwen OCR + Firebase)</h1>
      <button onClick={() => signOut(auth)}>Wyloguj się ({user.email})</button>
      
      <div style={{ margin: '20px 0', padding: 20, border: '2px dashed #ccc' }}>
        <h3>Dodaj produkt ze zdjęcia (Paragon / Etykieta)</h3>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {loading && <p>Przetwarzanie przez Qwen AI...</p>}
      </div>

      <h3>Twoje produkty:</h3>
      <ul>
        {pantry.map(item => (
          <li key={item.id}>{item.name} - Ilość: {item.quantity} (Ważne do: {item.expiryDate})</li>
        ))}
      </ul>
    </div>
  );
}