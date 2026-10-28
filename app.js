// Accounts live only in this browser's localStorage. Nothing is sent anywhere.
const $=id=>document.getElementById(id),msg=(t,ok)=>{$('m').textContent=t;$('m').className='msg '+(ok?'ok':'err')};
const users=()=>JSON.parse(localStorage.getItem('cgs_users')||'{}');
async function hash(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch{return btoa(s)}}
const page=document.body.dataset.page;
if(page==='login'&&location.search.includes('new=1'))msg('Account created. Log in to open your studio.',true);
$('f').addEventListener('submit',async ev=>{ev.preventDefault();
 const u=$('u').value.trim().toLowerCase(),p=$('p').value;
 if(u.length<3)return msg('Username needs at least 3 characters.');
 if(page==='signup'){
  if(p.length<6)return msg('Password needs at least 6 characters.');
  if(p!==$('c').value)return msg('Passwords do not match.');
  const all=users();if(all[u])return msg('That username is taken.');
  all[u]={h:await hash(p)};localStorage.setItem('cgs_users',JSON.stringify(all));
  location.href='login.html?new=1';
 }else{
  const a=users()[u];
  if(!a||a.h!==await hash(p))return msg('Username or password is wrong.');
  localStorage.setItem('cgs_session',u);location.href='ripbozo.html';
 }});