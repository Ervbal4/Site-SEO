/* Cime — envoi des demandes (rendez-vous, étude) vers le webhook configuré. */
window.CimeLead=(function(){
  var C=function(){return window.CIME_CONFIG||{}};
  function send(payload){
    if(payload.website)return Promise.resolve({ok:true});            // champ piège anti-spam : on feint le succès
    var track=function(){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'lead_submit',source:payload.source||'',sujet:payload.sujet||''})}catch(_){}};
    if(!C().endpoint){track();return Promise.resolve({ok:false,fallback:true})};
    var body=new URLSearchParams();
    Object.keys(payload).forEach(function(k){var v=payload[k];body.append(k,v!==null&&typeof v==='object'?JSON.stringify(v):String(v))});
    // no-cors : le webhook reçoit la requête même sans en-têtes CORS ; la réponse est opaque.
    return fetch(C().endpoint,{method:'POST',body:body,mode:'no-cors'}).then(function(){track();return{ok:true}}).catch(function(){return{ok:false}});
  }
  function mailto(subject,payload){
    var lines=Object.keys(payload).map(function(k){var v=payload[k];return k+' : '+(typeof v==='object'?JSON.stringify(v):v)}).join('\n');
    location.href='mailto:'+(C().mailto||'')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines);
  }
  return{send:send,mailto:mailto};
})();
