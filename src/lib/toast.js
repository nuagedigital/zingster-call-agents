// src/lib/toast.js
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
const CLIENT_ID      = import.meta.env.VITE_TOAST_CLIENT_ID  || '';
const CLIENT_SECRET  = import.meta.env.VITE_TOAST_CLIENT_SECRET || '';
const RESTAURANT_GUID = import.meta.env.VITE_TOAST_RESTAURANT_GUID || '';

let _token = null;
let _expires = 0;

export async function getToastToken() {
  if (_token && Date.now() < _expires) return _token;

  const res = await fetch(`${TOAST_BASE_URL}/authentication/v1/authentication/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }),
  });

  if (!res.ok) throw new Error(`Toast auth failed: ${await res.text()}`);

  const data = await res.json();
  _token   = data.token.accessToken;
  _expires = Date.now() + (data.token.expiresIn * 1000) - 60_000;
  return _token;
}

async function headers() {
  const token = await getToastToken();
  return {
    Authorization: `Bearer ${token}`,
    'Toast-Restaurant-External-ID': RESTAURANT_GUID,
    'Content-Type': 'application/json',
  };
}

export async function fetchToastMenu() {
  const res = await fetch(`${TOAST_BASE_URL}/menus/v2/menus`, { headers: await headers() });
  if (!res.ok) throw new Error(`Menu fetch failed: ${await res.text()}`);
  return res.json();
}

let _cart = [];
export const ToastCart = {
  add(item) {
    const ex = _cart.find(i => i.menuItemId === item.menuItemId);
    if (ex) ex.quantity += item.quantity || 1;
    else _cart.push({ ...item, quantity: item.quantity || 1 });
    return [..._cart];
  },
  remove(id) { _cart = _cart.filter(i => i.menuItemId !== id); return [..._cart]; },
  clear() { _cart = []; },
  get() { return [..._cart]; },
  total() { return _cart.reduce((s, i) => s + i.price * i.quantity, 0); },
};