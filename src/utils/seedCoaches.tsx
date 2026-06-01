import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0745406111",
  appId: "1:779419484245:web:7fe61af01855ab677b54dc",
  apiKey: "AIzaSyBGclsTgo1nkW8FiHA1AUl0bovxvnFqf74",
  authDomain: "gen-lang-client-0745406111.firebaseapp.com",
  storageBucket: "gen-lang-client-0745406111.firebasestorage.app",
  messagingSenderId: "779419484245",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-dfac6d3a-fbe3-4bfb-b173-22e6ac5d1ceb");

const coaches = [
  { uid: 'CUs50WIYsUbNYJhF1q3r273Vkcu2', email: 'benson34@me.com', name: 'Kris Benson', specialty: 'pitching', price: 150, years: 12, city: 'San Diego', state: 'CA', address: '16601 Nighthawk Ln' },
  { uid: 'PEZr6wb06YYLzc08MLUsq7B4PDo2', email: 'kchenderson22@gmail.com', name: 'Casey Henderson', specialty: 'fielding', price: 90, years: 8, city: 'Poway', state: 'CA', address: '789 Infield Dr' },
  { uid: 'BKRGmiaM75hdsI0mauIUaEsbDXv2', email: 'bdecker244@gmail.com', name: 'Brandon Decker', specialty: 'hitting', price: 100, years: 6, city: 'San Diego', state: 'CA', address: '101 Batter Up Blvd' },
  { uid: 'Mh33Uip3JOVvc1FryPwyhdf0X7g1', email: 'brettgbalkan@yahoo.com', name: 'Brett Balkan', specialty: 'hitting', price: 85, years: 5, city: 'Escondido', state: 'CA', address: '202 Base Hit St' },
  { uid: 'UDqp6R2PGkUUBwvyEfIbwMGudpk1', email: 'chyndman06@gmail.com', name: 'Chris Hyndman', specialty: 'pitching', price: 110, years: 9, city: 'Escondido', state: 'CA', address: '3120 Rue Montreux' },
  { uid: '7j9Yyu4A9SZu9Eap02VpszPYfsN2', email: 'Bobby@1RMperformance.com', name: 'Robert Congalton', specialty: 'strength', price: 80, years: 10, city: 'San Diego', state: 'CA', address: '4040 Sorrento Valley Blvd' },
];

async function seed() {
  for (const coach of coaches) {
    // Create coach_profiles doc with uid as document ID
    await setDoc(doc(db, 'coach_profiles', coach.uid), {
      user_id: coach.uid,
      specialty: coach.specialty,
      price_per_session: coach.price,
      years_experience: coach.years,
      city: coach.city,
      state: coach.state,
      street_address: coach.address,
      bio: '',
      skills: [],
      certifications: [],
      affiliations: [],
      availability: {},
      is_active: true,
      rating: 0,
      reviews: 0,
      photo_url: null,
      created_at: serverTimestamp(),
    });

    // Create users doc
    await setDoc(doc(db, 'users', coach.uid), {
      name: coach.name,
      email: coach.email,
      role: 'coach',
      created_at: serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Seeded ${coach.name}`);
  }
  console.log('All done!');
  process.exit(0);
}

seed().catch(console.error);