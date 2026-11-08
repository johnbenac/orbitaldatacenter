// Show a recoverable error even if the application module graph cannot load.
const panel=document.getElementById('startup');
const retry=document.getElementById('startup-retry');
document.getElementById('startup-tab').href=location.href;
retry.addEventListener('click',()=>location.reload());
const slow=setTimeout(()=>{retry.hidden=false},12000);
let illustrations=null,opened=false;
// Begin optional artwork alongside the application; never await an image to boot.
void import('./startup-illustrations.js').then(({startStartupIllustrations})=>{
 if(!opened)illustrations=startStartupIllustrations(panel);
}).catch(error=>console.warn('Optional startup illustrations unavailable',error));

try {
 await import('./app.js');
 opened=true;
 try{illustrations?.destroy()}catch(error){console.warn('Startup artwork cleanup',error)}
 const startupHadFocus=panel.contains(document.activeElement);
 panel.hidden=true;
 delete document.body.dataset.starting;
 if(startupHadFocus)document.getElementById('main')?.focus({preventScroll:true});
} catch(error) {
 panel.dataset.state='error';
 document.getElementById('startup-title').textContent='The workspace could not open';
 document.getElementById('startup-message').textContent=error instanceof Error?error.message:'The application did not finish loading.';
 retry.hidden=false;
 console.error('Orbital Data Center startup',error);
} finally {
 clearTimeout(slow);
}
