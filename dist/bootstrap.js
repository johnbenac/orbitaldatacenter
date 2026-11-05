// Show a recoverable error even if the application module graph cannot load.
const panel=document.getElementById('startup');
const retry=document.getElementById('startup-retry');
document.getElementById('startup-tab').href=location.href;
retry.addEventListener('click',()=>location.reload());
const slow=setTimeout(()=>{retry.hidden=false},12000);

try {
 await import('./app.js');
 panel.hidden=true;
 delete document.body.dataset.starting;
} catch(error) {
 document.getElementById('startup-title').textContent='The workspace could not open';
 document.getElementById('startup-message').textContent=error instanceof Error?error.message:'The application did not finish loading.';
 retry.hidden=false;
 console.error('Orbital Data Center startup',error);
} finally {
 clearTimeout(slow);
}
