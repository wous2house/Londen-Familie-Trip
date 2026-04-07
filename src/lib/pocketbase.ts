import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '');

export async function loginAnonymously() {
  // Voorbeeld implementatie voor anoniem inloggen, pas aan indien nodig.
  // Bijvoorbeeld via een specifieke route in PocketBase of een vast 'guest' account
  return await pb.collection('users').authWithPassword('guest', 'guest_password');
}

export async function loginWithFamilyPassword(password: string) {
  // Voorbeeld implementatie voor inloggen met familie wachtwoord
  // Aangenomen dat er een 'family' user is, of dat we inloggen met een specifieke identifier
  return await pb.collection('users').authWithPassword('family', password);
}

export async function getProfile() {
  return pb.authStore.model;
}
