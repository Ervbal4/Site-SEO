/* Cime — validation et envoi des demandes (rendez-vous, étude). */
window.CimeLead=(function(){
  var C=function(){return window.CIME_CONFIG||{}};
  var MSG={prenom:'Indiquez votre prénom.',nom:'Indiquez votre nom.',tel:'Indiquez un numéro de téléphone valide (7 chiffres au minimum).',email:'Indiquez une adresse e-mail valide.',consent:'Cochez la case pour envoyer votre demande.'};
  var ICON={info:'info',ok:'ok',err:'alert'};
  function errBox(form,name){return form.querySelector('#err-'+name+'-'+(form.id||'f'))}
  function setErr(form,name,msg){
    var el=form.elements[name],box=errBox(form,name);if(!el||!box)return;
    if(msg){box.hidden=false;box.querySelector('.t').textContent=msg;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',box.id)}
    else{box.hidden=true;el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby')}
  }
  /* rules : {nom:true,...} true = obligatoire. Retourne le premier champ invalide (focus) ou null. */
  function validate(form,rules){
    var first=null;
    Object.keys(rules).forEach(function(name){
      var el=form.elements[name];if(!el)return;
      var v=el.type==='checkbox'?el.checked:String(el.value||'').trim(),bad=false;
      if(rules[name]&&!v)bad=true;
      else if(v&&name==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))bad=true;
      else if(v&&name==='tel'&&String(v).replace(/\D/g,'').length<7)bad=true;
      setErr(form,name,bad?MSG[name]:'');
      if(bad&&!first)first=el;
    });
    if(first)first.focus();
    return first;
  }
  function watch(form){form.addEventListener('input',function(e){var n=e.target.name;if(n&&e.target.getAttribute('aria-invalid'))setErr(form,n,'')});form.addEventListener('change',function(e){var n=e.target.name;if(n&&e.target.getAttribute('aria-invalid'))setErr(form,n,'')})}
  function status(el,kind,text){
    if(!el)return;el.className='msg '+kind;
    el.innerHTML='<svg class="i" aria-hidden="true"><use href="#i-'+ICON[kind]+'"/></svg><span></span>';
    el.lastChild.textContent=text;
  }
  /* Résultats : {ok:true} transmis (réponse opaque, réception non vérifiable) · {unavailable:true} aucun canal configuré · {mailto:true} · {ok:false} échec */
  function send(payload,subject){
    if(payload.website)return Promise.resolve({ok:true});   // champ piège : aucun envoi
    var cfg=C();
    if(cfg.endpoint){
      var body=new URLSearchParams();
      Object.keys(payload).forEach(function(k){var v=payload[k];body.append(k,v!==null&&typeof v==='object'?JSON.stringify(v):String(v))});
      return fetch(cfg.endpoint,{method:'POST',body:body,mode:'no-cors'}).then(function(){track(payload);return{ok:true}}).catch(function(){return{ok:false}});
    }
    if(cfg.mailto){
      var lines=Object.keys(payload).map(function(k){var v=payload[k];return k+' : '+(v!==null&&typeof v==='object'?JSON.stringify(v):v)}).join('\n');
      location.href='mailto:'+cfg.mailto+'?subject='+encodeURIComponent(subject||'Demande Cime')+'&body='+encodeURIComponent(lines);
      return Promise.resolve({mailto:true});
    }
    return Promise.resolve({unavailable:true});
  }
  function track(p){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'lead_submit',source:p.source||'',sujet:p.sujet||'',demande:p.demande||''})}catch(_){}}
  /* Affiche le message adapté au résultat d'envoi. Retourne true si la demande est partie. */
  function report(el,r,okText){
    if(r.ok){status(el,'ok',okText||'Merci, votre demande a été transmise. Nous revenons vers vous.');return true}
    if(r.mailto){status(el,'info','Votre messagerie s’ouvre avec la demande préremplie. Elle n’est transmise qu’une fois le message envoyé.');return false}
    if(r.unavailable){status(el,'err','L’envoi des demandes n’est pas encore activé sur ce site : votre demande n’a pas été transmise.');return false}
    status(el,'err','L’envoi a échoué : votre demande n’a pas été transmise. Vous pouvez réessayer dans quelques instants.');return false;
  }
  return{validate:validate,watch:watch,send:send,status:status,report:report};
})();
