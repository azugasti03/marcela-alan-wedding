const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('scrollRestoration' in history)history.scrollRestoration='manual';
function resetToClosedInvitation(){
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  window.scrollTo(0,0);
}
resetToClosedInvitation();
const doors=document.querySelector('#doors');
const opening=document.querySelector('.opening-scroll');
const hero=document.querySelector('.hero');
const heroCopy=document.querySelector('.hero-copy');
const sealImg=document.querySelector('.opening-seal img');
const leftDoor=document.querySelector('.door.left');
const rightDoor=document.querySelector('.door.right');
let scrollFrame=0;
let openingTop=0;
let openingTravel=1;
let rightTravel=1;
let targetOpening=0;
let renderedOpening=0;

function clamp01(value){return Math.min(1,Math.max(0,value));}
function measureOpening(snap=false){
  openingTop=opening.getBoundingClientRect().top+window.scrollY;
  openingTravel=Math.max(1,opening.offsetHeight-hero.offsetHeight);
  rightTravel=hero.offsetWidth*.505+sealImg.offsetWidth/2+4;
  targetOpening=clamp01((window.scrollY+document.querySelector('header').offsetHeight-openingTop)/openingTravel);
  if(snap||reduced)renderedOpening=targetOpening;
}
function renderOpening(){
  scrollFrame=0;
  targetOpening=clamp01((window.scrollY+document.querySelector('header').offsetHeight-openingTop)/openingTravel);
  const distance=targetOpening-renderedOpening;
  renderedOpening=(reduced||Math.abs(distance)<.001)?targetOpening:renderedOpening+distance*.24;
  const reveal=renderedOpening;
  const sealOpacity=clamp01(1-reveal*1.25);
  leftDoor.style.transform=`translate3d(${-101*reveal}%,0,0)`;
  rightDoor.style.transform=`translate3d(${rightTravel*reveal}px,0,0)`;
  hero.style.setProperty('--seal-shift',`${rightTravel*reveal}px`);
  hero.style.setProperty('--cover-opacity',String(sealOpacity));
  hero.style.setProperty('--photo-scale',String(1.055-.055*reveal));
  heroCopy.inert=reveal<.995;
  doors.setAttribute('aria-hidden',String(reveal>=.995));
  if(Math.abs(targetOpening-renderedOpening)>=.001)scrollFrame=requestAnimationFrame(renderOpening);
}
function scheduleOpening(){if(!scrollFrame)scrollFrame=requestAnimationFrame(renderOpening);}
window.addEventListener('scroll',scheduleOpening,{passive:true});
window.addEventListener('resize',()=>{measureOpening(true);scheduleOpening();},{passive:true});
window.addEventListener('pageshow',()=>{
  resetToClosedInvitation();
  requestAnimationFrame(()=>{
    resetToClosedInvitation();
    measureOpening(true);
    scheduleOpening();
  });
});
measureOpening(true);
renderOpening();
const menuButton=document.querySelector('#menu-button');
const menu=document.querySelector('#menu');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menuButton.focus();}});
document.querySelector('#replay').addEventListener('click',()=>{closeMenu();window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});menuButton.focus({preventScroll:true});});
if(!reduced&&'IntersectionObserver' in window){document.body.classList.add('motion');const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});},{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
const venuePanels=document.querySelectorAll('.venue-panel');
if(reduced||!('IntersectionObserver' in window)){venuePanels.forEach(panel=>panel.classList.add('is-visible'));}
else{const venueObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.target.classList.toggle('is-visible',entry.isIntersecting));},{threshold:.3});venuePanels.forEach(panel=>venueObserver.observe(panel));}
const timeline=document.querySelector('.timeline');
if(timeline){if(reduced||!('IntersectionObserver' in window))timeline.classList.add('is-visible');else{const timelineObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.target.classList.toggle('is-visible',entry.isIntersecting));},{threshold:.18});timelineObserver.observe(timeline);}}
const wedding=new Date('2027-02-27T00:00:00-06:00').getTime();
function updateCountdown(){let seconds=Math.max(0,Math.floor((wedding-Date.now())/1000));const values=[Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];document.querySelector('#countdown').innerHTML=values.map((value,i)=>`<div><strong>${String(value).padStart(2,'0')}</strong><span>${['días','horas','minutos','segundos'][i]}</span></div>`).join('');}
updateCountdown();setInterval(updateCountdown,1000);
const rsvpForm=document.querySelector('#rsvp-form');
const rsvpStatus=document.querySelector('#form-status');
const rsvpButton=rsvpForm.querySelector('button[type="submit"]');
const guestInput=document.querySelector('#guest');
const guestIdInput=document.querySelector('#guest-id');
const guestSuggestions=document.querySelector('#guest-suggestions');
const guestHelp=document.querySelector('#guest-help');
let rsvpSending=false;
let guestSearchTimer=0;
let guestSearchSequence=0;
let selectedGuest=null;

function jsonpRequest(action,params={}){
  return new Promise((resolve,reject)=>{
    const callback=`__guestLookup${Date.now()}${guestSearchSequence+=1}`;
    const script=document.createElement('script');
    const query=new URLSearchParams({action,callback,...params});
    const timeout=setTimeout(()=>finish(new Error('No pudimos consultar la lista.')),8000);
    function finish(error,data){clearTimeout(timeout);delete window[callback];script.remove();error?reject(error):resolve(data);}
    window[callback]=data=>finish(null,data);
    script.onerror=()=>finish(new Error('No pudimos consultar la lista.'));
    script.src=`${rsvpForm.dataset.endpoint}?${query}`;
    document.head.appendChild(script);
  });
}

function closeGuestSuggestions(){guestSuggestions.hidden=true;guestSuggestions.innerHTML='';guestInput.setAttribute('aria-expanded','false');}
function clearGuestSelection(){selectedGuest=null;guestIdInput.value='';}
function selectGuest(guest){selectedGuest=guest;guestInput.value=guest.name;guestIdInput.value=guest.id;guestInput.setCustomValidity('');closeGuestSuggestions();guestHelp.textContent=`Invitación encontrada: ${guest.name}`;}
function renderGuestMatches(result){
  const matches=result&&result.ok&&Array.isArray(result.matches)?result.matches:[];
  guestSuggestions.innerHTML='';
  if(!matches.length){closeGuestSuggestions();guestHelp.textContent='No encontramos coincidencias. Revisa el nombre o apellido. Si ya respondiste, tu nombre ya no aparecerá.';return;}
  matches.forEach(guest=>{const item=document.createElement('li');item.setAttribute('role','option');const button=document.createElement('button');button.type='button';button.textContent=guest.name;button.addEventListener('click',()=>selectGuest(guest));item.appendChild(button);guestSuggestions.appendChild(item);});
  guestSuggestions.hidden=false;
  guestInput.setAttribute('aria-expanded','true');
  guestHelp.textContent='Selecciona tu nombre completo.';
}

guestInput.addEventListener('input',()=>{
  guestInput.setCustomValidity('');
  if(!selectedGuest||guestInput.value!==selectedGuest.name)clearGuestSelection();
  clearTimeout(guestSearchTimer);
  const query=guestInput.value.trim();
  if(query.length<3){closeGuestSuggestions();guestHelp.textContent='Escribe al menos 3 letras de tu nombre o apellido.';return;}
  guestHelp.textContent='Buscando en la lista de invitados…';
  guestSearchTimer=setTimeout(async()=>{try{renderGuestMatches(await jsonpRequest('search',{q:query}));}catch(error){closeGuestSuggestions();guestHelp.textContent='No pudimos consultar la lista. Inténtalo nuevamente.';}},250);
});
guestInput.addEventListener('keydown',event=>{
  const options=[...guestSuggestions.querySelectorAll('button')];
  if(guestSuggestions.hidden||!options.length)return;
  const current=options.indexOf(document.activeElement);
  if(event.key==='ArrowDown'){event.preventDefault();options[Math.min(current+1,options.length-1)].focus();}
  if(event.key==='Escape'){event.preventDefault();closeGuestSuggestions();guestInput.focus();}
});
document.addEventListener('click',event=>{if(!event.target.closest('.guest-lookup'))closeGuestSuggestions();});

rsvpForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(rsvpSending)return;
  const name=guestInput.value.trim();
  if(!name){guestInput.setCustomValidity('Escribe tu nombre.');guestInput.reportValidity();return;}
  if(!guestIdInput.value){guestInput.setCustomValidity('Selecciona tu nombre completo de la lista.');guestInput.reportValidity();return;}
  rsvpSending=true;
  rsvpButton.disabled=true;
  rsvpButton.textContent='Validando…';
  rsvpStatus.className='';
  rsvpStatus.textContent='Validando tu invitación…';
  const data=new FormData(rsvpForm);
  data.set('guest',name);
  data.set('source','Invitación web');
  try{
    const validation=await jsonpRequest('validate',{guest_id:guestIdInput.value});
    if(!validation.ok)throw new Error(validation.error||'No pudimos validar tu invitación.');
    rsvpButton.textContent='Enviando…';
    rsvpStatus.textContent='Enviando tu confirmación…';
    await fetch(rsvpForm.dataset.endpoint,{method:'POST',mode:'no-cors',body:data});
    rsvpStatus.className='success';
    rsvpStatus.textContent=`Gracias, ${name}. Tu confirmación fue enviada a Marcela y Alan.`;
    rsvpForm.reset();
    clearGuestSelection();
    guestHelp.textContent='Escribe al menos 3 letras de tu nombre o apellido.';
  }catch(error){
    rsvpStatus.className='error';
    rsvpStatus.textContent=error.message||'No pudimos enviar tu confirmación. Inténtalo nuevamente.';
  }finally{
    rsvpSending=false;
    rsvpButton.disabled=false;
    rsvpButton.textContent='Confirmar asistencia';
  }
});
// Story photos: subtle fade/rise that plays on entering and reverses on leaving the viewport.
const storyPhotos=document.querySelectorAll('.photo-grid img');
if(!reduced&&'IntersectionObserver' in window&&storyPhotos.length){
  storyPhotos.forEach((img,i)=>{img.classList.add('story-photo');img.style.setProperty('--story-delay',`${i*90}ms`);});
  const storyObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting));},{threshold:.18});
  storyPhotos.forEach(img=>storyObserver.observe(img));
}
// Gift registry: copy each bank detail to the clipboard and show a check mark for a moment.
(function(){
  const buttons=document.querySelectorAll('.copy-btn');
  if(!buttons.length)return;
  const status=document.querySelector('.copy-status');
  async function copyText(text){
    if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(text);return true;}catch(e){}}
    // Fallback for non-secure contexts (e.g. opening the page over the local network).
    const ta=document.createElement('textarea');
    ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';
    document.body.appendChild(ta);ta.focus();ta.select();ta.setSelectionRange(0,text.length);
    let ok=false;try{ok=document.execCommand('copy');}catch(e){}
    ta.remove();return ok;
  }
  buttons.forEach(btn=>{
    let timer=0;
    btn.addEventListener('click',async()=>{
      const ok=await copyText(btn.dataset.copy);
      if(!ok){if(status)status.textContent='No se pudo copiar. Mantén presionado el dato para copiarlo.';return;}
      btn.classList.add('copied');
      if(status)status.textContent='Copiado';
      clearTimeout(timer);
      timer=setTimeout(()=>{btn.classList.remove('copied');if(status)status.textContent='';},2000);
    });
  });
})();
