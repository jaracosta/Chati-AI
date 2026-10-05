// Run with jsdom installed in the test environment.
const {JSDOM}=require(process.env.CHATI_TEST_JSDOM || 'jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<body><aside class="sidebar"><button id="settingsBtn"></button></aside><div id="chatsView" class="view"></div><button id="chatsBtn"></button><button id="createBtn"></button><div id="createChoiceModal" class="hidden"></div><button id="closeCreateChoiceBtn"></button></body>',{url:'https://chati-ai.com',runScripts:'outside-only'});
const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){}});
w.ChatiAuth={getSession:async()=>({data:{session:null}}),getClient:()=>({})};
w.localStorage.setItem('chatiLoadedWorkspaceUidV6','__anonymous__');
w.eval(fs.readFileSync('account-profile-v6.js','utf8'));
w.eval(fs.readFileSync('app-polish-v6.js','utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
(async()=>{
 await w.ChatiWorkspaceReady;
 const modal=w.document.getElementById('createChoiceModal');
 w.document.getElementById('createBtn').addEventListener('click',()=>modal.classList.remove('hidden'));
 w.document.getElementById('closeCreateChoiceBtn').addEventListener('click',()=>modal.classList.add('hidden'));
 w.document.querySelector('[data-v6-nav="create"]').click();assert.ok(!modal.classList.contains('hidden'));
 w.document.querySelector('[data-v6-nav="chats"]').click();assert.ok(modal.classList.contains('hidden'),'Chats must dismiss Create');
 w.document.querySelector('[data-v6-nav="create"]').click();
 const panel=w.document.getElementById('v6ProfilePanel');
 const profile=w.document.querySelector('[data-v6-nav="profile"]');
 profile.click();assert.ok(modal.classList.contains("hidden"),"Profile must dismiss Create");assert.ok(!panel.classList.contains('hidden'),'Profile must stay open after the click bubbles');
 assert.ok(w.document.body.classList.contains('v6-profile-open'));
 assert.equal(profile.getAttribute('aria-current'),'page');
 w.document.querySelector('[data-v6-nav="chats"]').click();assert.ok(panel.classList.contains('hidden'));
 profile.click();w.document.querySelector('[data-v6-action="close"]').click();assert.ok(panel.classList.contains('hidden'));
 assert.equal(w.document.querySelector('[data-v6-nav="chats"]').getAttribute('aria-current'),'page');
 const creator=w.document.createElement('section');
 creator.id='characterCreateView';creator.className='view hidden';w.document.body.append(creator);
 // The real app observes these views during initialization.
 // Reinitialize the shell with the creator view present in the DOM.
 w.document.getElementById('v6MobileDock').remove();
 w.eval(fs.readFileSync('app-polish-v6.js','utf8'));
 creator.classList.remove('hidden');
 await new Promise(resolve=>w.setTimeout(resolve,0));
 assert.ok(w.document.body.classList.contains('v6-creator-active'),'Editing must hide persistent navigation');
 creator.classList.add('hidden');
 await new Promise(resolve=>w.setTimeout(resolve,0));
 assert.ok(!w.document.body.classList.contains('v6-creator-active'),'Navigation must return after leaving editor');
 console.log('PASS: guest Profile stays open, Chats closes Profile, close button updates active dock tab.');
 await new Promise(resolve=>w.setTimeout(resolve,0));
 w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
